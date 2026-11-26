# Unified Design System, Shared Resources & Cross-Client Coordination

Chirp's four native clients (macOS, iOS, Android, Windows) and Passkey/Admin web portals are not disconnected rewrites. They collaborate around **one shared cryptographic core, one semantic design system, one single source of truth for assets, and one authoritative server state contract**. Regardless of device OS, everyone in a room gets identical security guarantees and consistent UX.

<CrossPlatformMatrixDiagram />

## Unified Design System (Chirp — Together)

Every platform implements the semantic palette, spacing, and radii defined in [`design-tokens.json`](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/Branding/design-system/design-tokens.json) (v2) across Light, Dark, and High-Contrast modes:

| Design Dimension | Cross-Platform Standard (`design-tokens.json` v2) |
| --- | --- |
| **Semantic color palette (Light / Dark)** | Canvas `#F4F6F2` / `#101B17`, Surface `#FFFFFF` / `#192A23`, Accent Green `#246448` / `#A9DAB5`, Danger `#AF403D` / `#FFB4A8`, Chat Canvas `#EDF3ED` / `#14231D`. |
| **Deterministic 4-color avatar pool** | Hashes the stable member ID (stripping any `.login_` suffix) into 4 muted Light/Dark avatar pairs so each member keeps a consistent color across sessions. |
| **Spacing & corner radius scale** | Spacing scale `4 / 8 / 12 / 16 / 24 / 32 / 40` (logical pt/dp/DIP); radii: controls `14`, cards `24`, hero containers `32`, circular avatars `50%`, capsule call actions. |
| **Desktop window sizing (macOS / Windows)** | Default `1120 × 780`, minimum `900 × 620`; sidebar `220–300` (ideal `252`), right chat panel `280–400` (ideal `320`), main content max width `800`. |
| **Mobile shell layout (iOS / Android)** | Unified 3-tab structure (**Rooms / Friends / Me**); `24` content padding, roster grid min width `132` (expanding to `240` under accessibility text sizes). |
| **Unverified room tint** | Whenever any device in the room lacks SAS mutual verification, the canvas shifts to warm rose/maroon (`roomVerificationCanvas` `#FBEDEA` / `#291F20`) to warn that content is locked. |

Platform theme files: [Apple `ChirpTheme.swift`](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/apple/Shared/Views/ChirpTheme.swift) · [Android `ChirpTheme.kt`](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/android/app/src/main/kotlin/cn/youzifeile/chirp/ui/ChirpTheme.kt) · [Windows `App.xaml`](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/windows/Chirp/App.xaml)

## Shared Assets (Single Source of Truth)

To eliminate protocol drift, copy mismatches, and key divergence, critical shared assets stay in one canonical location and are verified during each platform's build:

| Shared Asset | Canonical Source | How Platforms Consume It |
| --- | --- | --- |
| **Shared Rust crypto engine** | [`Client/apple/MLS/native/`](https://github.com/YouZiFeiLe/Chirp/tree/main/Client/apple/MLS/native) | Wraps [OpenMLS](https://openmls.tech/) `0.9.2`, [vodozemac](https://github.com/matrix-org/vodozemac) `0.11.2` (SAS), Argon2id + AES-GCM (`.chirpkey`), and sleep-aware monotonic clocks.<br>• Apple: `ChirpMLSNative.xcframework`<br>• Android: CMake + `mls_jni.c` into `arm64-v8a` / `x86_64` `.so`<br>• Windows: `chirp_mls_native.dll` for `Chirp.Protocol.exe` |
| **Authorization trust public key** | [`AuthorizationTrust.json`](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/apple/Shared/Resources/AuthorizationTrust.json) | Holds `public_key` only:<br>• Apple bundles directly into app resources<br>• Android Gradle `prepareAuthorizationTrust` validates 32-byte Ed25519 into `assets/`<br>• Windows `Build-Native.ps1` validates and stages beside `Chirp.Protocol.exe` |
| **Bilingual UI & error strings** | [`Client/apple/Shared/Resources/`](https://github.com/YouZiFeiLe/Chirp/tree/main/Client/apple/Shared/Resources) (`Localizable.strings`, `Errors.strings`) | • Apple loads `.lproj` natively<br>• Android's [`prepare-android-messages.py`](https://github.com/YouZiFeiLe/Chirp/blob/main/scripts/prepare-android-messages.py) verifies format placeholders and generates `values/` + `values-zh-rCN/` XML<br>• Windows embeds via `Chirp.csproj` `EmbeddedResource` parsed by `SharedCopy.cs` |
| **Room join / leave sounds** | `Client/apple/Shared/Resources/Sounds/` (`JoinTheRoom.mp3`, `LeftTheRoom.mp3`) | Bundled by Apple; copied directly from the same source directory during Android and Windows builds. |
| **RNNoise source & model patch** | [`prepare-rnnoise.py`](https://github.com/YouZiFeiLe/Chirp/blob/main/scripts/prepare-rnnoise.py) | Fetches pinned RNNoise and applies `rnnoise-model-loading.patch` for Apple `ChirpAudio`, Android JNI, and Windows `Chirp.RNNoise.dll`. |
| **Cross-language test vectors** | [`internal/identity/testdata/`](https://github.com/YouZiFeiLe/Chirp/tree/main/internal/identity/testdata) | Contains `v5.json`, `device-pairing-v1.json`, and `recovery-v1.json`, tested jointly across Go, Swift, Rust, and Android. |

## Five Cross-Platform Runtime Coordination Loops

1. **Discovery & platform version policy**: Clients send `GET /v1/client-config` with `X-Chirp-Platform`, `X-Chirp-Version`, and `X-Chirp-Build`, letting servers enforce per-OS update minimums while broadcasting canonical endpoints.
2. **Cross-platform login & device pairing**:
   - Desktops (macOS / Windows) and Android display single-use login QR codes claimed by any phone browser holding the account's Passkey at `/device`;
   - Any pair of platforms (e.g., iPhone + Windows) can issue device certificates via `chirp-device-pair-v1` (live QR scan or exported PNG) or migrate via `.chirpkey`.
3. **Directory SSE & authoritative snapshots**: All four clients stream `GET /v1/events` (`revision` pulses) and pull `GET /v1/state` whenever rooms, rosters, or permissions change.
4. **Group state machine & smooth rotation**: Whenever mixed macOS, iOS, Android, and Windows clients advertise `smooth_rotation: true` in signed joins, the Go coordinator choreographs dual-slot candidate key pre-installation and synchronized `switching`; any membership change or stall triggers a clean `generation` pause-and-rebuild.
5. **Interoperable media & attachment wire formats**: All platforms use identical [Opus](https://opus-codec.org/) trailing-seal layout (`TOC | ciphertext | tag | IV | 12 | key index`), identical [HKDF](https://datatracker.ietf.org/doc/html/rfc5869) derivation (`LKFrameEncryptionKey`), identical reliable data-channel JSON (`RoomChat`), and identical v3 attachments (256 KiB AES-256-GCM records + 1 MiB HTTPS chunks).

## Deep-Dive by Platform

- [Apple Clients (macOS & iOS)](/en/clients/apple)
- [Android Client](/en/clients/android)
- [Windows Client](/en/clients/windows)
- [Security Audit & E2EE Review](/en/reference/security-audit)
