# Choosing & Installing Clients

Everything core to Chirp—encrypted live audio, ephemeral room chat, E2EE attachments, and hardware-backed device keys—runs inside **native client apps**. Browsers are used solely for registration, Passkey login ceremonies, and the administrator web console.

::: tip Match the client build to your server's signing key
Ask your administrator for both the server HTTPS URL and matching installers. If the administrator replaced the default [authorization signing key](/en/reference/authorization-keys) with a private key, clients must be compiled with the matching public key embedded—otherwise sign-in will block at snapshot signature verification.
:::

## Platform Requirements & Distribution

| Platform | Minimum OS & Architecture | Installation Method | Good to Know |
| --- | --- | --- | --- |
| **macOS** | macOS 27+<br>Apple Silicon (`arm64`) | Open the distributed `.dmg` image and drag **Chirp** into Applications. | Open-source releases are signed and notarized by Apple. Closing windows keeps active calls running in the background; press `Cmd + Q` to quit completely. |
| **iOS** | iOS 27+ (`arm64`) | Obtain the `.ipa` build from your administrator. | Distributed outside the App Store; re-sign with your Apple Developer account or sideloading workflow before installing on iPhone. |
| **Windows** | Windows 11 24H2+<br>`x64` (OS Build ≥ `26100`) | Run the per-user `Setup.exe` installer or `MSIX` package. | `Setup.exe` bundles the required .NET and [WinUI 3](https://learn.microsoft.com/windows/apps/winui/winui3/) runtime. Default open-source builds do not include an Authenticode signature—verify SHA-256 checksums with your admin if SmartScreen prompts. Windows Arm64 is untested. |
| **Android** | Android 15 (API 35)+<br>`arm64-v8a` or `x86_64` | Install the universal `.apk` provided by your administrator. | On **Android 17**, grant local-network access inside **Me → Preferences** if connecting to a LAN server. Keep background/battery restrictions relaxed for uninterrupted calls. |

### Quickly Check OS Version & Architecture

- **Mac**: Open the Apple menu ` → About This Mac` to verify Apple Silicon (`M`-series) and macOS 27+.
- **Windows**: Press `Win + R`, run `winver`, and confirm OS Build is at least `26100`. Under **Settings → System → About**, verify **64-bit operating system, x64-based processor**.

## First Launch & Sign-In Flows

1. **Enter the full HTTPS origin**: Paste your server's exact HTTPS URL. Preserve non-standard port numbers if any (e.g., `https://voice.example.com:8443`). Release clients enforce HTTPS—only local Debug builds allow `http://localhost`.
2. **Confirm discovery & choose a sign-in method**: Chirp fetches discovery endpoints and enforces version policies automatically, then offers two sign-in paths:
   - **Local Passkey sign-in**: Opens the system browser to authenticate with a synced or local [Passkey](https://fidoalliance.org/passkeys/) and returns via custom scheme (`cn.youzifeile.chirp://`, `cn.youzifeile.chirp.windows://`, or `cn.youzifeile.chirp.android://`). On Windows, the browser completion page also runs a **up-to-60s exponential-backoff handoff poll** (`POST /api/auth/login/windows-handoff`) to confirm the native client caught the redirect reliably.
   - **Phone QR sign-in** (macOS, Windows, Android): Generates a single-use QR code valid for **3 minutes**. Scan it on a phone carrying your Passkey to approve login at `/device`—ideal when your desktop lacks a synced Passkey.
3. **Complete approval or identity setup**: Pending accounts wait for administrator approval; approved accounts proceed to generate a root key or authorize the new device. [Your First Encrypted Call](/en/guide/first-call)

<PasskeyQrLoginDiagram />

::: tip Cold-Launch Resumption & Local Unlock (Starting `2026.11.27-1`)
Once you complete a Passkey sign-in on a supported device (and enroll Windows Hello in General Settings if using Windows), closing or force-restarting Chirp within the original credential lifetime (the earlier of **20 hours** or device leaf certificate expiry) automatically prompts local OS verification (Face ID / Touch ID / Mac password, Android strong biometrics, or Windows Hello) to resume your session without reopening a browser. Explicitly signing out or letting the 20-hour window expire still requires Passkey authentication. [Release Notes (`2026.11.27-1`)](/en/changelog/2026-11-27-1)
:::

## Common Installation & Login Issues

- **Windows installer refuses to run**
  Verify Windows 11 24H2 (Build ≥ `26100`) and `x64` architecture via `winver`.
  > [!WARNING] Uninstalling on Windows wipes local device keys
  > The `Setup.exe` uninstaller deletes the app's local data directory (including your DPAPI-encrypted device keys). Before reinstalling or removing Chirp on Windows, double-check that you have a valid `.chirpkey` backup + passphrase or another live authorized device!
- **Client says "Update Required"**
  Your administrator raised `minimum_version` or `minimum_build` for your platform in the admin console. Ask your admin for an updated build. Active sessions stay connected until sign-out, but new logins require the newer version.
- **"Invalid server configuration" or `NETWORK_TIME_REQUIRED`**
  - Verify the server URL spelling and network reachability.
  - `NETWORK_TIME_REQUIRED` means your device clock has drifted from real network time or [NTP](https://datatracker.ietf.org/doc/html/rfc5905) (`123/UDP`) is blocked; enable automatic date/time sync and retry.
  - If authorization signature checks fail against a reachable server, confirm your client embeds the server's active public key. [Troubleshooting](/en/hosting/troubleshooting)
