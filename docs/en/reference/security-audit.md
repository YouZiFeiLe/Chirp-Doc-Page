# Security Scan & End-to-End Encryption Review

This evaluation summarizes static code analysis, dependency hardening review, and offline unit test verification performed against the `push-to-github` branch of `chirp-go`, tracing security boundaries from browser onboarding through SFU media transport and `.chirpkey` offline recovery.

<E2eeAuditChainDiagram />

## 1. Scope & Verification Baseline

### Code & Dependency Inventory

- **Server & protocol core**: Go `1.27.4` (`golang.org/x/crypto v0.59.0`, `go-webauthn/webauthn v0.18.2`, `modernc.org/sqlite v1.62.0`, `livekit/server-sdk-go/v2 v2.20.0`).
- **Shared Rust crypto crate** (`Client/apple/MLS/native/Cargo.toml`): `openmls =0.9.2`, `vodozemac =0.11.2`, `ed25519-dalek 3.0.0`, `aes-gcm =0.11.1` (`zeroize` feature), `argon2 =0.6.0` (`zeroize` feature), [`zeroize`](https://docs.rs/zeroize/) `1.9.2`, `getrandom =0.4.3`.
- **Native clients & SDK patches**: Apple Swift 6 (`CryptoKit` + 9 patches for LiveKit Swift 2.19.0 + `ChirpVoiceReceiver.mm`), Android Kotlin (`AndroidKeyStore` + `livekit-2.30.0.patch` + `voice_receiver.cpp`), Windows WinUI 3 + Go engine (DPAPI + Pion Go overlay + Sonora AEC3).

### Offline Static Checks & Unit Tests

| Check | Result & Scope |
| --- | --- |
| `go vet ./...` | **Passed (0 warnings)** across the entire repository. |
| Core security packages | `internal/identity`, `internal/authorization`, `internal/config`, `internal/store`, `internal/room`, `internal/passkeyhttp`, `internal/adminhttp`, `cmd/chirp` **all passed** (covering V5 test vectors, cert chains, CAS history chains, Argon2id room passwords, admin CSRF Origin protection, and config validation). |
| Loopback socket suites | Packages binding `127.0.0.1` listeners (`internal/group`, `internal/httpapi`, `internal/httpserver`, `internal/httpstream`) require host/Docker environments permitting loopback socket binding (`sh scripts/test-sqlite.sh local` / `test-open-source-compose.sh`). |

---

## 2. Layer-by-Layer E2EE Pipeline Assessment

### 1. Ingress, Web Hardening & Route Isolation (Rating: High)

- **HTTPS/WSS enforcement**: Release clients reject `http://` at server discovery (only Debug permits `localhost`); HTTP clients configure `CheckRedirect` → `http.ErrUseLastResponse` to prevent redirect-based credential leakage or downgrade.
- **Security headers & CSRF protection**: `/register`, `/device`, and `/admin/` serve `Cache-Control: no-store`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, and strict [Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CSP) (`default-src 'self'; frame-ancestors 'none'; base-uri 'none'`). State mutations enforce Go stdlib `http.NewCrossOriginProtection()` alongside `HttpOnly; SameSite=Strict; Secure` session cookies.
- **Internal isolation & Slowloris defense**: Reverse proxy rules and the Go mux return `404` for `/twirp/*` and `/internal/*`; HTTP server configures explicit timeouts (`ReadHeaderTimeout: 5s`, `ReadTimeout: 10s`, `WriteTimeout: 15s`, `IdleTimeout: 60s`).

### 2. Passkey Auth & Authorization History Chain (Rating: High)

- **Phishing-resistant auth & PKCE**: WebAuthn mandates `ResidentKeyRequirementRequired` and `VerificationRequired` (biometric/PIN required), while native exchanges bind to 1-minute single-use auth codes with S256 PKCE.
- **Split DBs & anti-rollback checkpoints**: `chirp.db` and `authorization.db` remain physically separated. `authorization.db` enforces append-only immutability triggers (`identity_blacklist_no_delete` / `identity_blacklist_no_update`), and clients refuse empty or sequence-regressed snapshots against persisted local checkpoints.
- **Sleep-aware monotonic clocks**: Authorization freshness (60s) and media leases (3s) measure elapsed time via `mach_continuous_time` (Apple), `CLOCK_BOOTTIME` (Android), and `GetTickCount64` (Windows) so device sleep cannot freeze expiry timers.

### 3. Peer Device Pairing & Anti-Phishing SAS (Rating: High)

- **Context-bound verification**: `vodozemac` X25519/HKDF/MAC computes 3×4-digit SAS codes incorporating canonical `Origin`, `room_id`, `entry_id`, both account root keys, and both device public keys, thwarting cross-room or cross-member confusion.
- **Image import defense**: Cross-device QR image pairing (`chirp-device-pair-v1`) hides the verifier's computed digits and forces manual entry of all 3 code groups from the new device's screen, aborting after 3 wrong guesses.

### 4. OpenMLS Key Agreement & Dual-Slot Rotation (Rating: High)

- **Zero server key visibility**: Room passwords hash via 16B salt + Argon2id (`t=2, m=19MiB, p=1`) purely for admission and never feed content keys; the group hub forwards public `KeyPackage`s, encrypted `Welcome`s, and confirmation digests only.
- **Dual-slot smooth rotation & hard caps**: SDK patches disable SIF plaintext bypass and auto-ratcheting, rotating across 2 key slots (default 60s) and overwriting retired slots +1s after activation. Clients independently rebuild at **90s** and hard-halt at **120s**.

### 5. Frame Replay Protection & DataChannel Gating (Rating: High)

| Control | Apple | Android | Windows |
| --- | --- | --- | --- |
| **Pre-decode auth & IV replay guard** | `ChirpVoiceReceiver.mm` + `ChirpVoiceKeys.swift` | `voice_receiver.cpp` + `VoiceKeys.kt` | `media_windows.go` (`keySlot` + `seen`) |
| **Per-key IV cap** | `65,536` distinct 96-bit IVs per sender/key | `65,536` distinct 96-bit IVs per sender/key | Replay set + 120s hard rotation ceiling |
| **Pre-transmit self-check** | Frame-level `ContinuousClock` + 20ms watchdog | `VoiceKeys.authenticatesOutgoing` SSRC/decrypt verification | `ChirpReliable()` lease + provider guard |
| **Strip external STUN / TURN** | `livekit-no-external-ice.patch` | `livekit-2.30.0.patch` | Cleared in Go Pion dialer |
| **Block remote unmute** | `livekit-local-microphone-intent.patch` | Local mic state-machine lock | Separate WinUI / Go mic gate |

### 6. Offline `.chirpkey` Backups & Attachments (Rating: High)

- **Brute-force resistance**: `.chirpkey` enforces ≥16 Unicode scalar passphrases with Argon2id (`64 MiB / 3 iter / 4 lanes`) and AES-256-GCM sealing the 54-byte header inside AAD; pre-KDF size and header validation blocks malformed-file memory exhaustion DoS.
- **Server-blind attachments**: Random file keys never touch server HTTP endpoints or databases. The server confines disk writes with `os.Root` and re-verifies room entry + SSE connectivity every ≤ **64 KiB** read during download streaming.

---

## 3. Container & Host Runtime Hardening

Review of [`deploy/Dockerfile`](https://github.com/YouZiFeiLe/Chirp/blob/main/deploy/Dockerfile) and [`compose.yaml`](https://github.com/YouZiFeiLe/Chirp/blob/main/compose.yaml):

1. **`FROM scratch` release surface**: Statically linked binary (`CGO_ENABLED=0 -trimpath`) shipped without any shell or system utilities alongside CA roots and tzdata.
2. **Least-privilege containers**: Both `app` and `livekit` run unprivileged as `65532:65532` with `read_only: true`, `cap_drop: [ALL]`, `no-new-privileges:true`, `pids_limit` (256/512), and `noexec,nosuid,nodev` 32 MiB `tmpfs`.
3. **Storage & memory hygiene**: Refuses startup unless signing seed permissions match `0400`/`0600`; rejects symlinked attachment paths; scrubs transient secrets with Rust `zeroize`, Go `clear()`, and Kotlin `ByteArray.fill(0)`.

---

## 4. Documented Limitations, Residual Risks & Mitigations

| Limitation / Residual Risk | Impact & Root Cause | Recommended Mitigation |
| --- | --- | --- |
| **Shared default open-source seed** | Published Docker image embeds `deploy/authorization-key.default`, shared across default installs. | Generate a dedicated private seed per [Signing Keys](/en/reference/authorization-keys) and rebuild clients for isolated trust. |
| **Public Android release keystore** | `Client/android/signing/chirp-release.p12` is public in source, so anyone can sign matching APK fingerprints. | Distribute APKs strictly over trusted admin channels; do not treat signature fingerprint alone as provenance. |
| **Unsigned Windows `Setup.exe` & uninstall wipe** | Default `Setup.exe` lacks Authenticode signing, and uninstall wipes DPAPI `identities.v5`. | Share SHA-256 checksums or apply custom signing, and remind users to back up `.chirpkey`. |
| **60s revocation lag & server metadata** | New device revocations take up to 60s snapshot refresh; server observes membership, IPs, and packet metadata. | Deploy private authorization seeds for high-sensitivity groups and account for server-visible metadata. |
| **WebRTC C++ buffers & non-forensic RAM clear** | Milliseconds of already-queued WebRTC C++/audio frames are not forcibly recalled; OS allocators may keep freed pages. | Enforce full-disk encryption and screen locks on endpoints; avoid untrusted shared devices. |
| **Single-instance `app` ceiling** | In-memory group hub and SQLite POSIX locking prevent multi-instance horizontal scaling. | Use clean VM snapshots and regular backups per [Upgrades & Backups](/en/hosting/maintenance). |
