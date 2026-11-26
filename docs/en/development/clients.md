# Native Client Builds & Verification

Each of Chirp's four clients builds a native UI and platform audio stack on top of the shared Rust OpenMLS/SAS/`.chirpkey` core and shared `AuthorizationTrust.json` public key.

<AudioPipelineDiagram />

## Apple Clients (macOS / iOS) {#apple-macos--ios}

`Chirp-macOS` and `Chirp-iOS` share SwiftUI screens and session state in `Shared/` targeting **macOS 27.0+ / iOS 27.0+** (XCFramework includes Apple Silicon Mac, `arm64` iPhone, and `arm64` iOS Simulator slices). [Xcode Project](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/apple/Chirp.xcodeproj/project.pbxproj)

### Dependencies, Building & Launching

On an **Apple Silicon Mac**, install [Xcode 27](https://developer.apple.com/xcode/), Swift tools 6.4, Python 3.12+, `patch`, and `rustup`, then run from repo root: [Package.swift](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/apple/Package.swift) · [LiveKit Prepare Script](https://github.com/YouZiFeiLe/Chirp/blob/main/scripts/prepare-livekit-swift.py)

```sh
rustup target add aarch64-apple-darwin aarch64-apple-ios aarch64-apple-ios-sim
python3 scripts/prepare-livekit-swift.py
python3 scripts/prepare-rnnoise.py
sh scripts/prepare-mls.sh
open Client/apple/Chirp.xcodeproj
```

- **What these scripts do**: `prepare-livekit-swift.py` verifies upstream LiveKit/WebRTC archive hashes and patches `Vendor/` (ICE isolation, local mic intent, slot rotation, receiver decryption, chat gating); `prepare-mls.sh` compiles `ChirpMLSNative.xcframework` (pass `--host-only` for faster macOS-only iteration). Run `scripts/prepare-mls-notices.py` when upgrading Rust crates.
- **One-step macOS build & launch**: `./scripts/build_and_run.sh` launches `Client/apple/dist/macos/Chirp.app`. Supply an Apple Development team ID to test Data Protection Keychain isolation (`--verify` confirms 10s uptime):
  ```sh
  CHIRP_MACOS_TEAM_ID='YOUR_TEAM_ID' ./scripts/build_and_run.sh --verify
  ```

### Apple Modules & Automated Test Suites

| Folder / Module | Responsibility |
| --- | --- |
| `Shared/`, `Shared/Views/` | Discovery, Passkey auth (`cn.youzifeile.chirp://auth/callback`), directory sync, SwiftUI views. |
| `MLS/` | Swift-to-C bridge around Rust OpenMLS, SAS, and `.chirpkey`. [Rust Core](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/apple/MLS/native/src/lib.rs) |
| `Audio/`, `Voice/` | Audio preprocessing, RNNoise, Opus AES-GCM sealing, and 96-bit IV replay filtering. [Capture Pipeline](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/apple/Audio/Sources/ChirpAudio/CaptureAudioPipeline.swift) |
| `GroupSession.swift`, `LiveKitCallMedia.swift` | Group state coordination, smooth rotation, 3s media permits, and LiveKit binding. |

Run project consistency, localization coverage, and all four Swift test suites:

```sh
python3 Client/apple/Scripts/check-project.py
python3 -X utf8 Client/apple/Scripts/check-localizations.py
swift test --package-path Client/apple --scratch-path .build/swift-core
swift test --package-path Client/apple/MLS --scratch-path .build/swift-mls
swift test -c release --package-path Client/apple/Audio --scratch-path .build/rnnoise-tests
swift test --package-path Client/apple/MediaChecks --scratch-path .build/media-checks
```

To enable hardware audio/room-sound checks in Xcode host tests, set `CHIRP_ROOM_SOUND_PLAYBACK_CHECK=1` or `TEST_RUNNER_CHIRP_AUDIO_HARDWARE_CHECK=1`, or run [`scripts/test-identity-device.py`](https://github.com/YouZiFeiLe/Chirp/blob/main/scripts/test-identity-device.py).

### Building & Installing on Physical iPhone

Unlock an iPhone with Developer Mode enabled, look up its ID via `xcrun devicectl list devices`, and run:

```sh
CHIRP_IOS_TEAM_ID='YOUR_TEAM_ID'
CHIRP_IOS_DEVICE_ID='YOUR_DEVICE_ID'
xcodebuild -project Client/apple/Chirp.xcodeproj -scheme Chirp-iOS \
  -configuration Release -destination "platform=iOS,id=$CHIRP_IOS_DEVICE_ID" \
  -derivedDataPath .build/DerivedData-ios-device -clonedSourcePackagesDirPath .build/apple-packages \
  -disableAutomaticPackageResolution -onlyUsePackageVersionsFromResolvedFile \
  -allowProvisioningUpdates -allowProvisioningDeviceRegistration \
  DEVELOPMENT_TEAM="$CHIRP_IOS_TEAM_ID" CODE_SIGN_STYLE=Automatic \
  CODE_SIGN_IDENTITY='Apple Development' CODE_SIGNING_ALLOWED=YES CODE_SIGNING_REQUIRED=YES build
codesign --verify --deep --strict .build/DerivedData-ios-device/Build/Products/Release-iphoneos/Chirp.app
xcrun devicectl device install app --device "$CHIRP_IOS_DEVICE_ID" \
  .build/DerivedData-ios-device/Build/Products/Release-iphoneos/Chirp.app
```

> [!NOTE] macOS codeless resource bundles & Hardened Runtime
> Hardened Runtime stays enabled for signed macOS builds; the `Prepare codeless resource bundles` build phase ([`prepare-macos-resource-bundles.py`](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/apple/Scripts/prepare-macos-resource-bundles.py)) normalizes `ChirpAudio`, `ChirpMLS`, and `LiveKit` bundles so strict signature checks pass.

---

## Android Client {#android}

Built with **Kotlin + Jetpack Compose + Core-Telecom**, supporting **Android 15 (API 35)+** on `arm64-v8a` and `x86_64` (`targetSdk = 37`). [AndroidManifest](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/android/app/src/main/AndroidManifest.xml) · [build.gradle.kts](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/android/app/build.gradle.kts)

### Toolchain & Debug Build

Install **JDK 27.0.1**, **Android SDK Platform 37.2**, **Build Tools 37.0.0**, **NDK `30.0.16248370`**, **[CMake](https://cmake.org/) 4.1.2**, **Rust 1.100.0**, Git, `patch`, Python 3.12+, and `adb`, then build inside `Client/android` (`.\gradlew.bat` on Windows):

```sh
rustup target add aarch64-linux-android x86_64-linux-android
./gradlew :app:assembleDebug testDebugUnitTest :app:lintDebug
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

- Gradle automatically patches LiveKit Android, invokes CMake for both `arm64-v8a` and `x86_64` native libraries (Rust OpenMLS, voice crypto, RNNoise), and validates `AuthorizationTrust.json`.
- **Local debugging tip**: Debug APKs allow loopback `http://` servers via `adb reverse` (UDP voice still requires direct reachability to LiveKit's UDP port). On Android 17, grant LAN access in **Me → Preferences**.

### Android Module Index

| Area | Primary Sources |
| --- | --- |
| Discovery & Passkey | [ServerRepository.kt](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/android/app/src/main/kotlin/cn/youzifeile/chirp/data/ServerRepository.kt) (`cn.youzifeile.chirp.android://auth/callback`) |
| Keystore & QR Pairing | [IdentityVault.kt](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/android/app/src/main/kotlin/cn/youzifeile/chirp/data/IdentityVault.kt) · [DevicePairing.kt](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/android/app/src/main/kotlin/cn/youzifeile/chirp/data/DevicePairing.kt) |
| Groups & Voice Crypto | [SecureGroup.kt](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/android/app/src/main/kotlin/cn/youzifeile/chirp/media/SecureGroup.kt) · [CallService.kt](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/android/app/src/main/kotlin/cn/youzifeile/chirp/media/CallService.kt) · [VoiceKeys.kt](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/android/app/src/main/kotlin/cn/youzifeile/chirp/media/VoiceKeys.kt) |
| Chat, Files & Compose UI | [RoomChat.kt](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/android/app/src/main/kotlin/cn/youzifeile/chirp/media/RoomChat.kt) · [ChirpApp.kt](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/android/app/src/main/kotlin/cn/youzifeile/chirp/ui/ChirpApp.kt) |

### Open-Source APK Signing & Fingerprint Verification {#android-release-signing}

The open-source branch includes the **Chirp Open Source** release keystore under `Client/android/signing/` for reproducible open-source updates (private forks may substitute their own keystore):

| Field | Open-Source Release Value |
| --- | --- |
| Application ID | `cn.youzifeile.chirp.android` |
| Keystore file & type | `Client/android/signing/chirp-release.p12` (`PKCS12`, alias `chirp-release`) |
| Algorithm & Subject | RSA 4096-bit · `SHA256withRSA` · `CN=Chirp Open Source, OU=Android, O=Chirp Open Source` |
| Signing Schemes | APK Signature Scheme v2 / v3 only (v1 disabled) |
| Cert SHA-256 Digest | `FE:2C:66:57:7E:28:56:A8:CA:5A:0C:F9:E8:50:2A:D3:AF:CA:0F:D5:AE:6E:7E:B2:9A:0A:0D:38:08:D1:57:42` |

Build a release APK and verify signatures/fingerprint:

```sh
./gradlew :app:assembleRelease
"$ANDROID_HOME/build-tools/37.0.0/apksigner" verify --verbose --print-certs app/build/outputs/apk/release/app-release.apk
```

### Unit & Instrumented Device Tests

Run full instrumented checks (native loading, screen rotation, large fonts, WebRTC crypto) on a connected device or emulator:

```sh
./gradlew :app:assembleDebug :app:assembleDebugAndroidTest
adb -s SERIAL install -r app/build/outputs/apk/debug/app-debug.apk
adb -s SERIAL install -r app/build/outputs/apk/androidTest/debug/app-debug-androidTest.apk
adb -s SERIAL shell am instrument -w cn.youzifeile.chirp.android.test/androidx.test.runner.AndroidJUnitRunner
```

- **Dual-ABI check**: Because WebRTC `150.7871.08` C++ vtables differ on `arm64-v8a` vs. `x86_64`, always verify `VoiceTransportTest` on both ABIs after NDK or WebRTC updates (`adb install -r --abi arm64-v8a` on translation-capable emulators).
- **Live Go protocol suite**: Run `python3 scripts/test-android-protocol.py --serial SERIAL` from repo root to drive Android instrumentation against a real local Go + LiveKit stack. [Android Protocol Runner](https://github.com/YouZiFeiLe/Chirp/blob/main/scripts/test-android-protocol.py)

---

## Windows Client {#windows}

Combines a **C# / WinUI 3 UI process** with a **Go protocol engine subprocess (`Chirp.Protocol.exe`)** targeting **Windows 11 x64 24H2 (Build ≥ `26100`)**. [Chirp.csproj](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/windows/Chirp/Chirp.csproj)

### Toolchain & Running Locally

In PowerShell 7 with **.NET 11 SDK**, **Windows SDK**, **Visual Studio x64 C++ Build Tools**, **WinApp CLI**, **Go**, **Rust (MSVC)**, Git, and Python 3.12+: [Packages](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/windows/Directory.Packages.props) · [Native Build Script](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/windows/scripts/Build-Native.ps1)

```powershell
& ./Client/windows/scripts/Use-DevTools.ps1
winapp run Client/windows/Chirp/Chirp.csproj --arch x64
```

`winapp run` compiles native DLLs/Go engine, registers `cn.youzifeile.chirp.windows://auth/callback`, and launches the app (`dotnet build Client/windows/Chirp/Chirp.csproj -p:Platform=x64` validates build only).

### Windows Module Index

| Component | Key Source Files |
| --- | --- |
| **WinUI 3 Shell & Audio (`Chirp/`)** | Multi-window sync, PKCE callbacks, QR camera/image scanning (ZXing), WASAPI I/O, Concentus Opus, Fluent themes. [App.xaml.cs](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/windows/Chirp/App.xaml.cs) · [DesktopAudio.cs](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/windows/Chirp/DesktopAudio.cs) |
| **Go Engine (`engine/`)** | `stdin/stdout` JSON pipe protocol handling auth, friends, groups, LiveKit/Pion transport, attachments, and `.chirplog`. [ProtocolClient.cs](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/windows/Chirp/ProtocolClient.cs) · [main_windows.go](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/windows/engine/main_windows.go) |
| **Rust Audio & Crypto DLLs** | `audio/` (Sonora software AEC3/AGC2) + `Chirp.RNNoise.dll`; `chirp_mls_native.dll` for OpenMLS/SAS/`.chirpkey`; user **DPAPI** protects `identities.v5`. [vault_windows.go](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/windows/engine/vault_windows.go) |

### Regression Tests, Versioning & Installers

- **Automated tests** (set `CHIRP_LIVEKIT_SERVER` to local `livekit-server.exe` to enable `TestNativeTwoPartyRoom`):
  ```powershell
  pwsh -NoProfile -File Client/windows/scripts/Build-Native.ps1 -Test
  dotnet run --project Client/windows/tests/DesktopBehavior.csproj -c Release
  go test ./internal/passkeyhttp ./internal/httpapi ./internal/group
  ```
- **Sync version numbers before release**: Update three files together ([network_windows.go](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/windows/engine/network_windows.go) `version`/`build`, [Chirp.csproj](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/windows/Chirp/Chirp.csproj) `<Version>`, and [Package.appxmanifest](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/windows/Chirp/Package.appxmanifest) `Identity Version`).
- **Build `Setup.exe`** (requires Inno Setup 7 in `PATH` or `CHIRP_ISCC`): outputs self-contained `.build/releases/Chirp-Windows-<version>-x64-Setup.exe` (unauthenticated by default; uninstall cleans user identities). [Build-Installer.ps1](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/windows/scripts/Build-Installer.ps1) · [Chirp.iss](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/windows/installer/Chirp.iss)
  ```powershell
  pwsh -NoProfile -File Client/windows/scripts/Build-Installer.ps1
  ```
- **Package `MSIX`** (sign sideloaded builds with a cert matching `Publisher="CN=Chirp"` trusted by target machines):
  ```powershell
  winapp package Client/windows/Chirp/Chirp.csproj -c Release --arch x64 --no-sign --output .build/Chirp-x64.msix
  Get-FileHash .build/Chirp-x64.msix -Algorithm SHA256
  ```
