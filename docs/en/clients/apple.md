# Apple Clients (macOS & iOS) Architecture

Apple serves as Chirp's reference client implementation via two Xcode targets—`Chirp-macOS` and `Chirp-iOS`—supporting **macOS 27.0+ (Apple Silicon) and iOS 27.0+ (`arm64`)**, written in [Swift 6](https://www.swift.org/) strict concurrency mode (`SWIFT_STRICT_CONCURRENCY = complete`).

## Design Philosophy & Module Layout

Apple maximizes code sharing (`Client/apple/Shared/` holds 90%+ of authentication, sync, identity, group protocol, chat, and cache logic) while keeping platform divergence thin—restricted mainly to windowing (macOS persistent multi-window background calls vs. iOS tabbed shell) and audio routing (macOS explicit output picker vs. iOS speaker/earpiece/CallKit).

| Module / Core File | Responsibility & Implementation Notes |
| --- | --- |
| [`ApplicationSession.swift`](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/apple/Shared/ApplicationSession.swift) · [`ChirpApp.swift`](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/apple/Shared/ChirpApp.swift) | Top-level `@MainActor` session root and foreground/background observer orchestrating discovery, directory SSE, and cold-launch-only local unlock prompts. |
| [`ClientLogin.swift`](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/apple/Shared/ClientLogin.swift) · [`DeviceLogin.swift`](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/apple/Shared/DeviceLogin.swift) | System [`ASWebAuthenticationSession`](https://developer.apple.com/documentation/authenticationservices/aswebauthenticationsession) Passkey sign-in (`cn.youzifeile.chirp://auth/callback`, S256 [PKCE](https://datatracker.ietf.org/doc/html/rfc7636)) plus macOS QR polling login. |
| [`SavedLogin.swift`](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/apple/Shared/SavedLogin.swift) · [`LoginSession.swift`](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/apple/Shared/LoginSession.swift) · [`LoginLockView.swift`](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/apple/Shared/Views/LoginLockView.swift) | Seals resumption records in `kSecAttrAccessibleWhenPasscodeSetThisDeviceOnly` Keychain (`biometryCurrentSet` on iOS, `userPresence` on macOS, fresh `LAContext` per cold launch) with atomic backup-excluded index hints, lock screen UI, and retry state machine. |
| [`DeviceIdentityStore.swift`](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/apple/Shared/DeviceIdentityStore.swift) | Local `KeychainIdentityPersistence` using **[Data Protection Keychain](https://developer.apple.com/documentation/security/keychain-services)** (`kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly`, `kSecAttrSynchronizable = false`) so private keys never sync to iCloud. |
| [`DevicePairingSession.swift`](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/apple/Shared/DevicePairingSession.swift) · [`DevicePairingImages.swift`](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/apple/Shared/DevicePairingImages.swift) | Executes `chirp-device-pair-v1`; image imports decode primary frame via Image I/O and scan QR codes with [Apple Vision](https://developer.apple.com/documentation/vision) (Core Image fallback). |
| [`AuthorizationAuthority.swift`](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/apple/Shared/AuthorizationAuthority.swift) · [`SocialIdentity.swift`](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/apple/Shared/SocialIdentity.swift) | Validates bundled `AuthorizationTrust.json` keys, refreshes signed snapshots every 20s (`ContinuousClock` 60s expiry), and persists checkpoints/friend trust. |
| [`CallController.swift`](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/apple/Shared/CallController.swift) · [`LiveKitCallMedia.swift`](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/apple/Shared/LiveKitCallMedia.swift) | Coordinates preflight, audio presets, VAD gating, and LiveKit rooms; tracks explicit mic intent to suppress unwanted unmutes. |
| [`RoomChat.swift`](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/apple/Shared/RoomChat.swift) · [`AttachmentCache.swift`](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/apple/Shared/AttachmentCache.swift) | Encrypted data-channel chat (4,096 B / 1,000-message ring) and `Caches/ChirpRoomAttachments` storage (512 MiB cap) guarded by revocable `AttachmentLease`s. |
| [`ChirpLogStore.swift`](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/apple/Shared/ChirpLogStore.swift) | SQLite `ATTACH/DETACH` + `secure_delete=ON` writer and 24-hour `.chirplog` single-file exporter. |

## Apple End-to-End Encryption Pipeline

[`prepare-livekit-swift.py`](https://github.com/YouZiFeiLe/Chirp/blob/main/scripts/prepare-livekit-swift.py) applies **9 source patches** to pinned `client-sdk-swift 2.19.0` and injects C++/Objective-C++ frame hooks:

1. **Strip external ICE & block remote unmutes**: `livekit-no-external-ice.patch` clears third-party STUN/TURN entries on connect/join/reconnect; `livekit-local-microphone-intent.patch` drops server-initiated remote unmute commands.
2. **Entry & SAS verification lock**: `GroupSession.swift` and `RoomIdentity.swift` validate peer certificates, 60s snapshot freshness, and pairwise SAS confirmation before group creation starts.
3. **Rust OpenMLS group & exporter**: `MLS/Sources/ChirpMLS/MLSClient.swift` invokes `ChirpMLSNative.xcframework` across the C boundary to verify the exact roster, process OpenMLS `Add`/`Welcome`, and derive 32-byte per-sender keys via `Chirp LiveKit sender key v5`.
4. **Dual-slot smooth rotation & 20ms expiry sweeps**: `livekit-group-key-provider.patch` and `livekit-smooth-rotation.patch` enforce 2 key slots per sender (zero ratchet window, SIF plaintext bypass disabled); `livekit-v5-expiry.patch` plus a **~20 ms** `ContinuousClock` watchdog invalidates providers immediately when a 3s lease, 60s snapshot, or 120s key cap expires.
5. **Pre-Opus frame authentication & 96-bit IV replay protection** ([`ChirpVoiceReceiver.mm`](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/apple/Voice/ChirpVoiceReceiver.mm) · [`ChirpVoiceKeys.swift`](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/apple/Voice/ChirpVoiceKeys.swift)):
   - `livekit-voice-receiver.patch` hooks `ChirpVoiceReceiver` ahead of the WebRTC Opus decoder;
   - Each frame verifies and decrypts using a 16-byte AES-GCM key derived via `HKDF<SHA256>` (128 zero-byte `info`);
   - Per-sender, per-key `Set<Nonce>` drops duplicate 96-bit IVs across subscriptions while permitting out-of-order delivery, halting after **65,536 distinct IVs** until rotation;
   - Audio callbacks avoid logging, heap allocations, or blocking locks, accumulating timing counters sampled externally every second into `.chirplog`.

## Audio Processing Presets & RNNoise

Located in `Client/apple/Audio/`, offering live-switchable presets confirmed via active track state readbacks:

- **Apple System Processing + RNNoise (Default)**: Hardware VoiceProcessingIO AEC/AGC followed by RNNoise denoising.
- **Apple System Processing**: Native hardware voice unit only.
- **WebRTC AEC + RNNoise**: Software WebRTC AEC/AGC paired with RNNoise for external interfaces incompatible with Apple system processing.

> [!TIP] Building & Testing on Apple
> See [Native Client Builds · Apple](/en/development/clients#apple-macos--ios) for Xcode scripts, SwiftPM test commands, and physical iPhone signing.
