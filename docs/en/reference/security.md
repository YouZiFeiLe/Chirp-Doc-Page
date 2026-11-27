# Encryption & Security Boundaries

Chirp is built around one invariant: **even if your server or media relay is compromised, the server cannot decrypt voice audio, text chat, or transferred files**. All four native clients share one Rust core handling OpenMLS group crypto, device certification, and `.chirpkey` recovery, integrated with OS keystores (Apple Keychain, Android Keystore, Windows DPAPI) and patched WebRTC receivers.

Below is the complete map of credentials, key lifetimes, device trust verification, smooth rotation gates, and explicitly accepted security boundaries. [V5 E2EE Protocol](/en/reference/e2ee-v5) · [Security Audit & E2EE Review](/en/reference/security-audit) · [Attachment Transport](/en/reference/attachments)

## Key Hierarchy & Dual-Slot Rotation Overview

<KeyHierarchyAndRotation />

## Credentials, Cryptographic Material & Lifetimes

Access credentials (Passkeys, Bearers, LiveKit JWTs) prove admission to servers and SFUs; **decryption capability belongs exclusively to OpenMLS keys bound to SAS-verified devices and current `entry_id` sessions**:

| Material | Storage & Creation | Expiry & Retirement |
| --- | --- | --- |
| **Passkey Private Key** | User device / password manager (server stores public key only). | Long-lived; deleting server accounts does not delete user Passkeys remotely. |
| **WebAuthn Challenge** | Temporary server SQLite record. | Single-use; browser ceremony expires in **5 minutes**. |
| **Browser Session Cookie** | Digest in DB; `HttpOnly; SameSite=Strict` (`Secure` over HTTPS) in browser. | Up to **8 hours**; revoked immediately on role change, disable, or sign-out. |
| **Native Auth Code** | Digest in DB bound to S256 PKCE + platform scheme. | Single-use, expires in **1 minute**. |
| **Phone QR Claim** | Server short-lived record bound to client verifier. | Expires in **3 minutes**; exchanged for Setup Grant without dropping old session until activation. |
| **Identity Setup Grant** | Short-lived credential bound to Origin, account, PKCE, and challenge. | **5 minutes**; activates/pairs a device only—grants no directory or room access. |
| **Native Bearer Token** | SHA-256 digest on server; RAM-only on client. | Earlier of **20 hours** or device leaf cert expiry; atomically superseded by new device login or cold-launch resumption rotation. |
| **Login Resumption Token (`resume_token`)** | SHA-256 digest + bound `origin`/`platform`/`login_id` on server; sealed behind OS per-use auth on client (Apple `biometryCurrentSet`/`userPresence` Keychain, Android `BIOMETRIC_STRONG` + Keystore RSA, Windows opt-in Hello KSP `NCryptDecrypt`). | Shares the **exact `expires_at` deadline** of initial sign-in; requires fresh V5 device signature over a 1-minute challenge; cleared immediately on logout, takeover, or revocation. [Release Note](/en/changelog/2026-11-27-1) |
| **Room Preflight Proof** | [HMAC-SHA256](https://datatracker.ietf.org/doc/html/rfc2104) signed by an in-memory `app` secret. | Up to **30 seconds**; invalidated on `app` restart or room password update. |
| **Room Entry (`entry_id`)** | Server SQLite record tying `login`, `room`, and `entry`. | **30 seconds** renewed by group join or 2s heartbeat, bounded by login lifetime. |
| **LiveKit JWT** | Signed with shared `keys.json` between `app` and `livekit`. | Default **5 minutes**; allows publishing mic, subscribing tracks, and sending data frames only. |
| **Account [Ed25519](https://datatracker.ietf.org/doc/html/rfc8032) Root Key** | Generated locally on first approved login from CSPRNG. | **Never written to disk, Keychain, or server**; lives transiently in RAM during setup/restore. |
| **`.chirpkey` Recovery File** | Offline encrypted backup exported by user (Argon2id + AES-256-GCM). | Valid indefinitely unless passphrase lost or replaced. [Format Spec](/en/reference/chirpkey) |
| **Device Ed25519 Identity** | Per-origin, per-account isolated OS keystore (Data Protection Keychain / Android Keystore / DPAPI). | Retained across sign-out to authorize future hardware; max **5-year** lifetime, depth **8**. |
| **Auth Snapshot Seed** | Server signing seed (`authorization-key`). | Replaceable with private seed for exclusive signing authority. [Signing Keys](/en/reference/authorization-keys) |
| **Auth Snapshot Cache** | Refreshed every 20s with fresh nonce; client persists highest seen checkpoints. | Valid **60 seconds** from request start (`ContinuousClock`); revocations are immutable. |
| **MLS Session Keypair** | Ephemeral RAM keypair bound to current `entry_id`. | Destroyed on room exit; fresh `KeyPackage` generated per round. |
| **MLS Exporter Sender Keys** | Native RAM exclusively. | Smooth swap overlaps dual slots briefly, overwriting retired slots with CSPRNG bytes +1s post-switch. |
| **Attachment File Key** | Random 256-bit key per transfer sent over encrypted chat channel. | Lives solely inside revocable `AttachmentLease` RAM; wiped on exit or cache clear. |

## Device Identity, Pairing & SAS Trust

<DeviceTrustTreeDiagram />

Chirp V5 (`chirp-mls-authenticated-v5`) eliminates legacy host whitelists: Rust and platform clients independently check certificate chains, `entry_id` bindings, MLS keys, and member confirmations, **never trusting server-provided `ready` flags alone**.

### 1. Binding the Account Root Identity

After approval and Passkey auth (5m Setup Grant), the first device creates an account root + candidate device key, exports `.chirpkey`, enforces a 5s safety wait, and signs a one-time challenge. Concurrent initial bindings serialize in SQLite so only the first wins; dropped responses resume cleanly with the staged candidate material without losing the exported root. [Setup Source](https://github.com/YouZiFeiLe/Chirp/blob/main/internal/store/identity_setup.go)

### 2. Device-to-Device QR Pairing (`chirp-device-pair-v1`)

1. **Signed request & SAS commitment**: New device builds a signed request QR (valid **≤ 5 minutes**, capped by Setup Grant) binding Origin, account ID, root key, candidate key, nonce, and pre-committed SAS material.
2. **Immutable server relay**: Short-lived relay (512 global slots, 3 per account) fixes the initial Offer digest to block swap/tamper attacks while remaining retry-idempotent.
3. **Camera scan or image import**: Old device scans via camera or imports a single QR image (≤ 8 MiB, ≤ 4096 px/side via Vision/Core Image on Apple, ZXing on Android/Windows). **When importing images, the old device hides its computed SAS codes and requires manual entry of all 3 groups from the new device's screen** (3 wrong tries abort pairing).
4. **Biometric approval & seamless takeover**: Both roles verify distinct [vodozemac](https://docs.rs/vodozemac/0.11.2/vodozemac/sas/) ([X25519](https://datatracker.ietf.org/doc/html/rfc7748) / HKDF / MAC) authenticators. Approving issues the cert without kicking the old device; handoff occurs only once the new device activates login. [Pairing Protocol](https://github.com/YouZiFeiLe/Chirp/blob/main/internal/identity/device_pairing.go)

::: info Chain Depth & Independent Revocation
Device certs nest up to **8 levels** and last up to **5 years**. Revoking an ancestor stops it from issuing future certs **without** invalidating already-issued descendant devices. `.chirpkey` can always enroll a *brand-new* device, never revive a revoked device or banned account.
:::

### 3. In-Room SAS Verification

- **Trust binds devices, not handles**: Friend lists are UI conveniences only; every unverified peer triggers a full-room lock across voice, chat, and files until pairwise SAS verification completes out-of-band. [SAS State Machine](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/apple/MLS/native/src/security.rs)

### 4. Snapshot Freshness & Blacklist Enforcement

Clients request signed history snapshots every **20 seconds**; responses stay valid for at most **60 seconds from request initiation (`ContinuousClock`)**. Clients persist highest checkpoints and reject empty or regressed snapshots. Apple and Windows update blacklists alongside fresh snapshots while enforcing known revocations offline; Android requires **both** snapshot signature and blacklist fetch to succeed before advancing the deadline.

## Group Keying, Gating & Smooth Rotation

<GroupStateMachineDiagram />

1. **Group setup (`collecting → welcoming → confirming → ready`)**: Rooms advance `generation` on roster shifts/rebuilds and `key/{key_epoch}` on scheduled rotations. All `/v1/group/` mutations carry Ed25519 signatures (`Chirp group request v5`) over exact paths and body SHA-256. [Action Validator](https://github.com/YouZiFeiLe/Chirp/blob/main/internal/group/action.go)
2. **2s heartbeats & 3s media leases**: Heartbeats keep room membership alive (6s timeout, 12s handshake timeout; skipped while awaiting manual SAS confirmation), whereas active transmission requires renewing a **3-second monotonic media lease** approximately every second.
3. **Dual-slot smooth rotation & hard age limits**: Server triggers routine rotation every **60 seconds** (pre-installing candidate slot `min(12s, interval/2)` early when everyone declares `smooth_rotation`), retiring previous slots +1s post-switch with random memory overwrites. Regardless of server timers, clients independently trigger rebuild at **90s** key age and **hard-halt at 120s**. Room timers display advisory `room_information` metadata (`update_reason`: `initial_connection`, `members_changed`, `scheduled_rotation`, or `connection_recovery`). [Public Info Source](https://github.com/YouZiFeiLe/Chirp/blob/main/internal/group/public_info.go)
4. **Local mic intent & no-fallback DataChannels**: Patches block server-triggered unmutes, and outbound chat re-checks lease + provider state right before dequeuing into WebRTC. [Chat Patch](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/apple/Patches/livekit-ephemeral-chat.patch)

## Accepted Risks & Explicit Security Boundaries

| Dimension | Enforced Guarantee | Explicitly Outside Threat Model |
| --- | --- | --- |
| **Content confidentiality** | Servers & SFU see zero plaintext media/chat/files; unverified devices blocked. | Compromised endpoints, mistakenly confirming wrong SAS digits, or malicious authorized callers recording locally. |
| **Metadata** | Chat text and original filenames stay off server storage. | Servers observe accounts, room attendance, public IPs, session duration, and encrypted packet cadence/sizes. |
| **Forward secrecy & memory** | 60s rotation / 120s hard ceiling; retired secrets wiped from native slots. | Per-frame ratcheting; sub-second frames already queued inside OS/WebRTC C++ buffers; allocator-retained memory pages. |
| **Revocation latency** | Anti-rollback checkpoints block stale snapshots; max 60s propagation bound. | Instantaneous sub-60s global push without server cooperation; default open-source seed shares verification root unless replaced. [Signing Keys](/en/reference/authorization-keys) |
