# 各平台客户端构建与验证

macOS、iOS、Android 与 Windows 四个客户端各自采用原生 UI 与平台音频接口，并在底层统一桥接同一套用 Rust 编写的 OpenMLS、SAS 安全码与 `.chirpkey` 编解码库，以及同一份 `AuthorizationTrust.json` 授权公钥。

<AudioPipelineDiagram />

## Apple 客户端（macOS / iOS） {#apple-macos--ios}

`Chirp-macOS` 与 `Chirp-iOS` 共用 `Shared/` 下的 SwiftUI 视图、会话状态机与协议逻辑，要求系统最低为 **macOS 27.0 / iOS 27.0**（当前 XCFramework 提供 Apple Silicon Mac、`arm64` iPhone 与 `arm64` iOS 模拟器切片）。[Xcode 工程](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/apple/Chirp.xcodeproj/project.pbxproj)

### 准备依赖与构建运行

在 **Apple Silicon Mac** 上准备 [Xcode 27](https://developer.apple.com/xcode/)、Swift tools 6.4、Python 3.12+、`patch` 与 `rustup`。以下所有命令均在产品仓库根目录运行（首次准备需要联网拉取锁定依赖）：[Swift Package](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/apple/Package.swift) · [SDK 准备脚本](https://github.com/YouZiFeiLe/Chirp/blob/main/scripts/prepare-livekit-swift.py)

```sh
rustup target add aarch64-apple-darwin aarch64-apple-ios aarch64-apple-ios-sim
python3 scripts/prepare-livekit-swift.py
python3 scripts/prepare-rnnoise.py
sh scripts/prepare-mls.sh
open Client/apple/Chirp.xcodeproj
```

- **依赖脚本作用**：`prepare-livekit-swift.py` 会校验上游 LiveKit SDK 与 WebRTC 归档哈希并将仓内补丁打入 `Vendor/`（约束 ICE 来源、本地开麦意图、发送槽切换、接收端解密认证与聊天最终门控）；`prepare-mls.sh` 负责构建三端切片生成 `ChirpMLSNative.xcframework`（仅调试 macOS 时可加 `--host-only` 加速）。依赖升级时需同步运行 `scripts/prepare-mls-notices.py` 更新第三方许可声明。
- **一键构建启动 macOS 版**：执行 `./scripts/build_and_run.sh` 会自动关闭旧进程、准备依赖并启动 `Client/apple/dist/macos/Chirp.app`。默认使用 ad-hoc 签名；若需要测试完整 Data Protection Keychain 隔离与真机行为，请传入拥有 Apple Development 证书的团队 ID（加 `--verify` 会检查进程持续运行 10 秒）：
  ```sh
  CHIRP_MACOS_TEAM_ID='你的团队 ID' ./scripts/build_and_run.sh --verify
  ```

### Apple 模块分工与自动化测试

| 模块目录 | 职责说明 |
| --- | --- |
| `Shared/`、`Shared/Views/` | 服务发现、Passkey 认证（`cn.youzifeile.chirp://auth/callback`）、房间目录与共用 SwiftUI 界面。 |
| `MLS/` | Swift 经 C 桥接共享 Rust OpenMLS、SAS 状态机与 `.chirpkey`。[Rust 核心](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/apple/MLS/native/src/lib.rs) |
| `Audio/`、`Voice/` | 音频采集预处理、RNNoise 降噪、Opus 帧 AES-GCM 认证与 96 位 IV 防重放。[采集管线](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/apple/Audio/Sources/ChirpAudio/CaptureAudioPipeline.swift) |
| `GroupSession.swift`、`LiveKitCallMedia.swift` | 协调群组状态、平滑换钥、3 秒媒体许可并与 LiveKit 音轨/数据通道绑定。 |

在仓库根目录执行工程一致性、双语文案与四套 Swift 套件测试：

```sh
python3 Client/apple/Scripts/check-project.py
python3 -X utf8 Client/apple/Scripts/check-localizations.py
swift test --package-path Client/apple --scratch-path .build/swift-core
swift test --package-path Client/apple/MLS --scratch-path .build/swift-mls
swift test -c release --package-path Client/apple/Audio --scratch-path .build/rnnoise-tests
swift test --package-path Client/apple/MediaChecks --scratch-path .build/media-checks
```

调试硬件音频与真机身份时，可在 Xcode 运行宿主测试（提示音冷启动设 `CHIRP_ROOM_SOUND_PLAYBACK_CHECK=1`，真实麦克风采集设 `TEST_RUNNER_CHIRP_AUDIO_HARDWARE_CHECK=1`），或使用 [`scripts/test-identity-device.py`](https://github.com/YouZiFeiLe/Chirp/blob/main/scripts/test-identity-device.py)。

### iOS 真机编译与安装

连接并解锁开启「开发者模式」的 iPhone，通过 `xcrun devicectl list devices` 获取设备 ID 后执行：

```sh
CHIRP_IOS_TEAM_ID='你的签名团队 ID'
CHIRP_IOS_DEVICE_ID='已连接 iPhone 的设备标识'
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

> [!NOTE] macOS 纯资源包与 Hardened Runtime
> macOS 证书签名保留了 Hardened Runtime，构建阶段的 `Prepare codeless resource bundles`（[`prepare-macos-resource-bundles.py`](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/apple/Scripts/prepare-macos-resource-bundles.py)）会规范处理 `ChirpAudio`、`ChirpMLS` 与 `LiveKit` 的纯资源包以确保外层 App 签名完整校验。

---

## Android 客户端 {#android}

Android 客户端采用 **Kotlin + Jetpack Compose + Core-Telecom**，支持 **Android 15（API 35）及以上**的 `arm64-v8a` 与 `x86_64` 设备（当前 `targetSdk = 37`）。[AndroidManifest](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/android/app/src/main/AndroidManifest.xml) · [build.gradle.kts](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/android/app/build.gradle.kts)

### 构建环境与调试运行

准备 **JDK 27.0.1**、**Android SDK Platform 37.2**、**Build Tools 37.0.0**、**NDK `30.0.16248370`**、**CMake 4.1.2**、**Rust 1.100.0** 以及 Git、`patch`、Python 3.12+ 与 `adb`。在 `Client/android` 目录下运行（Windows 请改用 `.\gradlew.bat`）：

```sh
rustup target add aarch64-linux-android x86_64-linux-android
./gradlew :app:assembleDebug testDebugUnitTest :app:lintDebug
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

- Gradle 会自动校验并给 LiveKit Android 打补丁，随后调用 CMake 为 `arm64-v8a` 与 `x86_64` 构建 Rust OpenMLS、语音加解密与 RNNoise 原生库，并校验打包四端共用的 `AuthorizationTrust.json`。
- **本地联调技巧**：Debug 构建允许访问回环 HTTP 地址，使用真机或模拟器调试本机服务端时，可用 `adb reverse` 转发 HTTP 与信令 TCP 端口（注意实时语音依然需要 UDP 直达 LiveKit 端口）。Android 17 访问局域网服务器须在应用内「我的 → 使用偏好」授予局域网权限。

### Android 模块分工

| 功能域 | 实现入口 |
| --- | --- |
| 服务发现与 Passkey | [ServerRepository.kt](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/android/app/src/main/kotlin/cn/youzifeile/chirp/data/ServerRepository.kt)（回调 `cn.youzifeile.chirp.android://auth/callback`） |
| 身份库与二维码配对 | [IdentityVault.kt](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/android/app/src/main/kotlin/cn/youzifeile/chirp/data/IdentityVault.kt)（Android Keystore）· [DevicePairing.kt](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/android/app/src/main/kotlin/cn/youzifeile/chirp/data/DevicePairing.kt) |
| 群组协调与媒体加密 | [SecureGroup.kt](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/android/app/src/main/kotlin/cn/youzifeile/chirp/media/SecureGroup.kt) · [CallService.kt](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/android/app/src/main/kotlin/cn/youzifeile/chirp/media/CallService.kt) · [VoiceKeys.kt](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/android/app/src/main/kotlin/cn/youzifeile/chirp/media/VoiceKeys.kt) |
| 聊天、附件与界面 | [RoomChat.kt](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/android/app/src/main/kotlin/cn/youzifeile/chirp/media/RoomChat.kt) · [ChirpApp.kt](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/android/app/src/main/kotlin/cn/youzifeile/chirp/ui/ChirpApp.kt) |

### Android 开源发布签名与指纹验证 {#android-发布签名与验证}

开源分支随仓库公开了 **Chirp Open Source** 的 Release APK 签名密钥库（位于 `Client/android/signing/`），使所有构建者都能产出一脉相承的开源版更新包（独立发行者亦可替换为自己的签名证书）：

| 参数项 | 开源发布默认值 |
| --- | --- |
| 应用 ID | `cn.youzifeile.chirp.android` |
| 密钥库文件与类型 | `Client/android/signing/chirp-release.p12`（`PKCS12`，别名 `chirp-release`） |
| 算法与主体 | RSA 4096 位 · `SHA256withRSA` · `CN=Chirp Open Source, OU=Android, O=Chirp Open Source` |
| 签名方案 | 仅启用 APK Signature Scheme v2 / v3，关闭 v1 |
| 证书 SHA-256 指纹 | `FE:2C:66:57:7E:28:56:A8:CA:5A:0C:F9:E8:50:2A:D3:AF:CA:0F:D5:AE:6E:7E:B2:9A:0A:0D:38:08:D1:57:42` |

构建 Release APK 并使用 `apksigner` 校验签名与证书指纹：

```sh
./gradlew :app:assembleRelease
"$ANDROID_HOME/build-tools/37.0.0/apksigner" verify --verbose --print-certs app/build/outputs/apk/release/app-release.apk
```

### Android 单元测试与设备仪器测试

在目标真机或模拟器上运行完整仪器测试（含原生 RNNoise / MLS 加载、横竖屏与大字体布局、WebRTC 加解密等）：

```sh
./gradlew :app:assembleDebug :app:assembleDebugAndroidTest
adb -s SERIAL install -r app/build/outputs/apk/debug/app-debug.apk
adb -s SERIAL install -r app/build/outputs/apk/androidTest/debug/app-debug-androidTest.apk
adb -s SERIAL shell am instrument -w cn.youzifeile.chirp.android.test/androidx.test.runner.AndroidJUnitRunner
```

- **双 ABI 专项校验**：由于 WebRTC 150.7871.08 在 `arm64-v8a` 与 `x86_64` 上 C++ 虚函数表布局存在差异，每次升级 WebRTC 或 NDK 后，务必在两个 ABI 上分别运行 `VoiceTransportTest`（支持 ARM64 转译的模拟器可用 `adb install -r --abi arm64-v8a` 覆盖）。
- **真实 Go 后端协议联调**：在产品仓库根目录运行 `python3 scripts/test-android-protocol.py --serial SERIAL` 可将设备上的测试 APK 连入真实的本地 Go 后端与 LiveKit 实例。[联调脚本](https://github.com/YouZiFeiLe/Chirp/blob/main/scripts/test-android-protocol.py)

---

## Windows 客户端 {#windows}

Windows 版采用「**C# / WinUI 3 界面进程 + 独立 Go 协议子进程**（`Chirp.Protocol.exe`）」的双进程架构，目标平台为 **Windows 11 x64 24H2（内部版本 ≥ `26100`）**。[Chirp.csproj](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/windows/Chirp/Chirp.csproj)

### 构建环境与运行

在 PowerShell 7 中准备 **.NET 11 SDK**、**Windows SDK**、**Visual Studio x64 C++ 构建工具**、**WinApp CLI**、**Go**、**Rust（MSVC 工具链）**、Git 与 Python 3.12+，并在产品仓库根目录运行：[依赖清单](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/windows/Directory.Packages.props) · [原生构建脚本](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/windows/scripts/Build-Native.ps1)

```powershell
& ./Client/windows/scripts/Use-DevTools.ps1
winapp run Client/windows/Chirp/Chirp.csproj --arch x64
```

`winapp run` 会自动构建原生组件、以包身份注册浏览器回调 `cn.youzifeile.chirp.windows://auth/callback` 并启动应用；仅需编译校验时可运行 `dotnet build Client/windows/Chirp/Chirp.csproj -p:Platform=x64`。

### Windows 模块分工

| 模块 | 核心职责与源码 |
| --- | --- |
| **WinUI 3 界面与音频（`Chirp/`）** | 多窗口状态共享、PKCE 回调、二维码生成与 ZXing 识图、WASAPI 采集播放、Concentus / Opus 编解码与浅深/高对比度主题。[App.xaml.cs](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/windows/Chirp/App.xaml.cs) · [DesktopAudio.cs](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/windows/Chirp/DesktopAudio.cs) |
| **Go 协议子进程（`engine/`）** | 通过标准输入/输出（stdin/stdout）JSON 管道与 WinUI 通信，负责认证、好友、群组状态机、LiveKit/Pion 连接、附件分块及 `.chirplog` 写入。[ProtocolClient.cs](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/windows/Chirp/ProtocolClient.cs) · [main_windows.go](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/windows/engine/main_windows.go) |
| **Rust 音频与加密库** | `audio/` 中的 Sonora 模块提供软件 WebRTC AEC3 与 AGC2，`Chirp.RNNoise.dll` 提供降噪；`chirp_mls_native.dll` 提供 OpenMLS 与 `.chirpkey`，本机设备密钥由用户 **DPAPI** 加密保存于 `identities.v5`。[vault_windows.go](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/windows/engine/vault_windows.go) |

### 协议回归、版本号更新与打包分发

- **运行 Windows 自动化测试**（包含真实 Rust DLL、DPAPI 与桌面行为测试；若需跑通双端语音用例 `TestNativeTwoPartyRoom`，请设置 `CHIRP_LIVEKIT_SERVER` 指向本机 `livekit-server.exe`）：
  ```powershell
  pwsh -NoProfile -File Client/windows/scripts/Build-Native.ps1 -Test
  dotnet run --project Client/windows/tests/DesktopBehavior.csproj -c Release
  go test ./internal/passkeyhttp ./internal/httpapi ./internal/group
  ```
- **同步版本号**：协议头使用 `年.月.日` + 整数构建号，程序集和安装器使用四段 `年.月.日.构建号`。发版前须同步修改三处：[network_windows.go](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/windows/engine/network_windows.go)（`version` / `build`）、[Chirp.csproj](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/windows/Chirp/Chirp.csproj)（`<Version>`）和 [Package.appxmanifest](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/windows/Chirp/Package.appxmanifest)（`Identity Version`）。
- **打包 `Setup.exe` 安装器**（需安装 Inno Setup 7 并将 `ISCC.exe` 加入 `PATH` 或设 `CHIRP_ISCC`）：产出位于 `.build/releases/Chirp-Windows-<版本>-x64-Setup.exe`，包含完整自包含运行时，默认未做 Authenticode 签名且卸载会清理本机身份。[Build-Installer.ps1](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/windows/scripts/Build-Installer.ps1) · [Chirp.iss](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/windows/installer/Chirp.iss)
  ```powershell
  pwsh -NoProfile -File Client/windows/scripts/Build-Installer.ps1
  ```
- **打包 `MSIX` 安装包**（侧载发行时须使用系统信任且匹配 `Publisher="CN=Chirp"` 的证书签名）：
  ```powershell
  winapp package Client/windows/Chirp/Chirp.csproj -c Release --arch x64 --no-sign --output .build/Chirp-x64.msix
  Get-FileHash .build/Chirp-x64.msix -Algorithm SHA256
  ```
