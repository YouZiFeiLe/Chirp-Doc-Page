# Windows Client Architecture

Targeting **Windows 11 x64 24H2 (Build ≥ `26100`)**, the Windows client pairs a **C# / [WinUI 3](https://learn.microsoft.com/windows/apps/winui/winui3/) desktop UI shell** with a **dedicated Go protocol subprocess (`Chirp.Protocol.exe`)** communicating exclusively over anonymous `stdin/stdout` JSON pipes—opening zero local TCP callback listeners.

## Why Split WinUI 3 from a Go Engine Subprocess?

1. **Best tool for each boundary**: WinUI 3 delivers native Fluent windows, high-contrast theming, WASAPI low-latency audio, [Concentus](https://github.com/lostromb/concentus) Opus coding, and camera/image QR handling; meanwhile `Chirp.Protocol.exe` **directly shares Go validation packages (`internal/identity`, `internal/store`)** alongside Go HTTP/SSE and LiveKit / [Pion WebRTC](https://github.com/pion/webrtc).
2. **Zero local port exposure**: Spawned by [`ProtocolClient.cs`](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/windows/Chirp/ProtocolClient.cs) over inherited `stdin`/`stdout` pipes, **nothing binds `127.0.0.1` ports**, preventing local port hijacking by untrusted co-located software.
3. **Deterministic shutdown**: Closing the final WinUI window signals clean teardown, wiping temporary caches and terminating both `Chirp.exe` and `Chirp.Protocol.exe`.

## Two-Process Module Breakdown

### 1. Desktop UI & Native Audio (`Client/windows/Chirp/`)

| File | Responsibility & Implementation Notes |
| --- | --- |
| [`App.xaml.cs`](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/windows/Chirp/App.xaml.cs) · [`MainWindow.xaml.cs`](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/windows/Chirp/MainWindow.xaml.cs) | Single-instance protocol activation (`cn.youzifeile.chirp.windows://auth/callback`), shared multi-window state (`DesktopState.cs`), and responsive panes. |
| [`App.xaml`](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/windows/Chirp/App.xaml) | Three semantic resource dictionaries (`Light`, `Dark`, `HighContrast`) derived from `design-tokens.json`. |
| [`DesktopAudio.cs`](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/windows/Chirp/DesktopAudio.cs) · [`AudioService.cs`](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/windows/Chirp/AudioService.cs) | NAudio WASAPI I/O, Concentus (+ `OpusSharp.Natives` DTX decode) Opus coding, and P/Invoke bindings to `Chirp.RNNoise.dll` and `chirp_windows_audio.dll` (Rust Sonora AEC3/AGC2). |
| [`PairingCamera.cs`](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/windows/Chirp/PairingCamera.cs) · [`PairingImages.cs`](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/windows/Chirp/PairingImages.cs) | Camera capture & single-frame image QR scanning via QRCoder / ZXing.Net, gated behind [Windows Hello](https://learn.microsoft.com/windows/security/identity-protection/hello-for-business/) local user verification. |

### 2. Protocol, Identity & Media Subprocess (`Client/windows/engine/`)

| File | Responsibility & Implementation Notes |
| --- | --- |
| [`main_windows.go`](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/windows/engine/main_windows.go) · [`login_windows.go`](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/windows/engine/login_windows.go) | Dispatches JSON pipe commands, Passkey login (including up-to-60s exponential-backoff browser handoff polling `POST /api/auth/login/windows-handoff`), phone QR polling, and `.chirpkey` handling. |
| [`vault_windows.go`](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/windows/engine/vault_windows.go) | Protects per-user `identities.v5` via **[Windows DPAPI](https://learn.microsoft.com/windows/win32/api/dpapi/nf-dpapi-cryptprotectdata) (`CryptProtectData`)** with atomic write + `fsync`, immediately `clear()`ing plaintext buffers and transient signing seeds. |
| [`authority_windows.go`](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/windows/engine/authority_windows.go) · [`authorization_trust_windows.go`](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/windows/engine/authorization_trust_windows.go) | Loads sibling `AuthorizationTrust.json` and maintains fresh signed snapshots plus highest observed log checkpoints. |
| [`room_windows.go`](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/windows/engine/room_windows.go) · [`media_windows.go`](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/windows/engine/media_windows.go) | Room state machine, SAS verification, dual-slot smooth rotation, and encrypted Pion WebRTC audio/chat transport. |
| [`files_windows.go`](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/windows/engine/files_windows.go) · [`attachment_session_windows.go`](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/windows/engine/attachment_session_windows.go) | Manages transient `session-*` ciphertext cache, 1 MiB chunking, and AES-256-GCM record encryption. |
| [`chirplog_store_windows.go`](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/windows/engine/chirplog_store_windows.go) | Async batched UTC hourly `.chirplog` writer and 24-hour exporter. |

## Windows E2EE & Audio Pipeline Details

1. **No unready or plaintext DataChannel writes**: A custom Go SDK overlay exposes only `ChirpReliable()` and re-checks lease deadlines and provider state immediately prior to writing `DataChannel` frames, while clearing all external ICE servers on connect.
2. **Dual-slot crypto & replay map**: `mediaSession` holds two `keySlot` buffers derived via HKDF into `cipher.AEAD` alongside per-sender `seen map[[12]byte]struct{}` replay sets, overwriting retiring slots after rotation.
3. **Sleep-aware clock & software AEC**: `chirp_mls_native.dll` tracks monotonic elapsed time including system sleep via Win32 `GetTickCount64()`, while Rust Sonora ([`lib.rs`](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/windows/audio/src/lib.rs)) delivers software AEC3 and AGC2 for desktop mics lacking hardware processing.

> [!WARNING] Uninstaller removes local identity state
> Unlike macOS Keychain persistence, the Windows `Setup.exe` [Inno Setup](https://jrsoftware.org/isinfo.php) uninstaller ([`Chirp.iss`](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/windows/installer/Chirp.iss)) cleans the local app data directory (including `identities.v5`). Keep a valid `.chirpkey` backup and passphrase ready before uninstalling or reinstalling. See [Native Client Builds · Windows](/en/development/clients#windows).
