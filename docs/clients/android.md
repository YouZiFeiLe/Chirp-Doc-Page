# Android 客户端架构与实现

Android 客户端基于 **[Kotlin](https://kotlinlang.org/) + [Jetpack Compose](https://developer.android.com/compose) + [Material 3](https://m3.material.io/)** 构建，最低支持 **Android 15（API 35）**（`targetSdk = 37`），单包同时内置 `arm64-v8a` 与 `x86_64` 原生 ABI。它与 Apple 端共享同一套身份、群组与加密语义，同时深度适配了 [Android Keystore](https://developer.android.com/privacy-and-security/keystore)、Core-Telecom 与系统前台通话服务。

## 设计思路与代码分层

Android 端采用经典的单向状态流（`MainViewModel` + Repository + Service）架构，将持久化敏感身份、网络协调与媒体前台服务清晰解耦：

| 模块 / 核心文件 | 职责与设计要点 |
| --- | --- |
| [`ServerRepository.kt`](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/android/app/src/main/kotlin/cn/youzifeile/chirp/data/ServerRepository.kt) · [`ChirpHttp.kt`](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/android/app/src/main/kotlin/cn/youzifeile/chirp/data/ChirpHttp.kt) | 负责服务发现、版本策略检验、浏览器 Custom Tabs Passkey 回调（`cn.youzifeile.chirp.android://auth/callback`）与禁用重定向的安全 HTTP 会话。 |
| [`IdentityVault.kt`](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/android/app/src/main/kotlin/cn/youzifeile/chirp/data/IdentityVault.kt) | 使用 **Android Keystore AES-256-GCM**（密钥别名 `chirp-identity-v5`，AAD 绑定 `origin\|account` 作用域）加密读写 `noBackupFilesDir/identity-v5` 中的设备私钥与授权检查点，利用 `AtomicFile` 防止写入半截损坏。 |
| [`AccountIdentity.kt`](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/android/app/src/main/kotlin/cn/youzifeile/chirp/data/AccountIdentity.kt) · [`Authorization.kt`](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/android/app/src/main/kotlin/cn/youzifeile/chirp/data/Authorization.kt) | 验证随 APK 打包的 `assets/AuthorizationTrust.json` 公钥与快照签名；**特别注意**：Android 端要求同时完成快照验签**且**成功拉取业务黑名单后才刷新授权截止时间。 |
| [`NetworkClock.kt`](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/android/app/src/main/kotlin/cn/youzifeile/chirp/data/NetworkClock.kt) | 在登录和设备授权前校验系统时间可靠性（异常时提示 `NETWORK_TIME_REQUIRED`）。 |
| [`CallController.kt`](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/android/app/src/main/kotlin/cn/youzifeile/chirp/media/CallController.kt) · [`CallService.kt`](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/android/app/src/main/kotlin/cn/youzifeile/chirp/media/CallService.kt) | 整合 Android **Core-Telecom** 框架与前台服务通知，确保锁屏、切应用及蓝牙路由切换期间通话持续保活；从最近任务划掉应用时立即彻底结束通话与登录内存态。 |
| [`SecureGroup.kt`](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/android/app/src/main/kotlin/cn/youzifeile/chirp/media/SecureGroup.kt) · [`MediaPermit.kt`](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/android/app/src/main/kotlin/cn/youzifeile/chirp/media/MediaPermit.kt) | 协程驱动的群组状态机与基于 `SystemClock.elapsedRealtime()`（含深度休眠）的 3 秒媒体租约管理器。 |
| [`RoomChat.kt`](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/android/app/src/main/kotlin/cn/youzifeile/chirp/media/RoomChat.kt) · [`RoomAttachments.kt`](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/android/app/src/main/kotlin/cn/youzifeile/chirp/media/RoomAttachments.kt) | 实现加密数据通道聊天，并在 `chirp-attachments` 缓存目录管理附件密文、下载限速（[`AttachmentBandwidth.kt`](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/android/app/src/main/kotlin/cn/youzifeile/chirp/data/AttachmentBandwidth.kt)）与断点前缀续传。 |
| [`ChirpApp.kt`](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/android/app/src/main/kotlin/cn/youzifeile/chirp/ui/ChirpApp.kt) · [`AdaptivePane.kt`](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/android/app/src/main/kotlin/cn/youzifeile/chirp/ui/AdaptivePane.kt) | 自适应手机、折叠屏与平板的分栏布局；支持 Android 17 局域网访问授权引导与 [ZXing](https://github.com/zxing/zxing) 相机/图库二维码配对。 |

## Android 端 E2EE 全链路与 C++ JNI 实现

Android 通过 `Client/android/patches/livekit-2.30.0.patch` 修改 LiveKit Android SDK 源码，并利用 CMake（[`CMakeLists.txt`](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/android/app/src/main/cpp/CMakeLists.txt)）将四块原生代码编入应用：

1. **Rust OpenMLS JNI 桥接**（[`mls_jni.c`](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/android/app/src/main/cpp/mls_jni.c) + [`MlsNative.kt`](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/android/app/src/main/kotlin/cn/youzifeile/chirp/media/MlsNative.kt)）：将共享 Rust 库打包为 `.so`，在 Rust 层通过 `CLOCK_BOOTTIME` 强制校验 90s/120s 密钥年龄，并在切换或退出时在 `NonCancellable` 协程上下文中清空原生状态。
2. **自定义音频处理与 RNNoise**（[`rnnoise_jni.c`](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/android/app/src/main/cpp/rnnoise_jni.c) + [`RNNoiseProcessor.kt`](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/android/app/src/main/kotlin/cn/youzifeile/chirp/media/RNNoiseProcessor.kt)）：在 WebRTC `JavaAudioDeviceModule` 采集链路中介入处理，支持「WebRTC AEC + RNNoise（默认）」「WebRTC 内置降噪」「仅回声消除」三种预设以及 `-45 dBFS` 默认 VAD 门控。
3. **WebRTC 发送前自检与接收端帧验签**（[`voice_receiver.cpp`](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/android/app/src/main/cpp/voice_receiver.cpp) + [`VoiceKeys.kt`](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/android/app/src/main/kotlin/cn/youzifeile/chirp/media/VoiceKeys.kt)）：
   - **出站双保险**：WebRTC 触发发送加密后，`VoiceKeys.authenticatesOutgoing` 会在真正放行到 RTP 前再做一次出站密文自检——校验 SSRC、活跃槽位、密钥是否能正确认证解密以及同一密钥下已发送 Nonce 数量是否低于 `65,536`，防止任何底层异常状态发错密钥或漏出明文；
   - **入站防重放**：通过 C++ `voice_receiver.cpp` 挂接接收端拦截，在 Opus 解码前交由 `VoiceKeys` 用 `AES/GCM/NoPadding` 验签，并维护每发送者、每轮密钥的 96 位 Nonce 集合过滤重复帧，达到 65,536 帧上限后停止接收直至换钥；
   - **ABI 虚表适配注意**：由于 WebRTC `150.7871.08` 在 `arm64-v8a` 与 `x86_64` 上的 C++ 虚函数表布局不同，工程测试会专门在双 ABI 上验证 `VoiceTransportTest`。

> [!TIP] Android 构建与开源发布签名
> 关于 JDK/NDK 版本、Gradle 编译、开源版签名证书指纹（`FE:2C:66:...`）及真机联调脚本，请查看[各平台客户端构建手册 · Android](/development/clients#android)。
