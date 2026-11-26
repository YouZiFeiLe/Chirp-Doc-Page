# Apple 客户端（macOS & iOS）架构与实现

Apple 平台是 Chirp 最初的基准参考客户端，由 `Chirp-macOS` 与 `Chirp-iOS` 两个 Xcode Target 组成，**最低支持 macOS 27.0（Apple Silicon）与 iOS 27.0（`arm64`）**，采用 [Swift 6](https://www.swift.org/) 严格并发模型（`SWIFT_STRICT_CONCURRENCY = complete`）编写。

## 设计思路与代码分层

Apple 端的核心设计思路是「**最大化共享业务逻辑，最小化双端 UI 与系统差异层**」：登录认证、状态同步、设备身份、群组协议、聊天与附件缓存等 90% 以上的核心代码全部放在 `Client/apple/Shared/` 中，仅在窗口管理（macOS 多窗口保留通话 vs iOS 单导航标签）和系统音频路由（macOS 输出设备选择 vs iOS 听筒/扬声器/CallKit 路由）上分叉。

| 模块 / 核心文件 | 职责与设计要点 |
| --- | --- |
| [`ApplicationSession.swift`](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/apple/Shared/ApplicationSession.swift) | 应用总状态根（`@MainActor`），集中管理服务器发现、登录会话生命周期、房间列表订阅及设备身份状态。 |
| [`ClientLogin.swift`](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/apple/Shared/ClientLogin.swift) · [`DeviceLogin.swift`](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/apple/Shared/DeviceLogin.swift) | 分别实现系统 [`ASWebAuthenticationSession`](https://developer.apple.com/documentation/authenticationservices/aswebauthenticationsession) Passkey 登录（回调 `cn.youzifeile.chirp://auth/callback`，S256 [PKCE](https://datatracker.ietf.org/doc/html/rfc7636)）与 macOS 端手机扫码轮询登录。 |
| [`DeviceIdentityStore.swift`](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/apple/Shared/DeviceIdentityStore.swift) | 封装本机 `KeychainIdentityPersistence`，使用 **[Data Protection Keychain](https://developer.apple.com/documentation/security/keychain-services)**（`kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly` + `kSecAttrSynchronizable = false`），确保私钥绝不通过 iCloud 同步离开本机。 |
| [`DevicePairingSession.swift`](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/apple/Shared/DevicePairingSession.swift) · [`DevicePairingImages.swift`](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/apple/Shared/DevicePairingImages.swift) | 实现 `chirp-device-pair-v1` 配对状态机；图片导入通过 Image I/O 读取主帧并使用 [Apple Vision](https://developer.apple.com/documentation/vision) 识别二维码，Vision 不可用时自动回退 Core Image。 |
| [`AuthorizationAuthority.swift`](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/apple/Shared/AuthorizationAuthority.swift) · [`SocialIdentity.swift`](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/apple/Shared/SocialIdentity.swift) | 持有打包进 Bundle 的 `AuthorizationTrust.json` 公钥，每 20 秒带随机挑战刷新快照（`ContinuousClock` 60 秒截止），并同步本机持久化检查点与好友信任链。 |
| [`CallController.swift`](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/apple/Shared/CallController.swift) · [`LiveKitCallMedia.swift`](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/apple/Shared/LiveKitCallMedia.swift) | 协调入房预校验、音频预设切换、VAD 门控与 LiveKit 媒体连接；通过主动追踪通话阶段与麦克风意图避免异常意外开麦。 |
| [`RoomChat.swift`](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/apple/Shared/RoomChat.swift) · [`AttachmentCache.swift`](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/apple/Shared/AttachmentCache.swift) | 实现加密数据通道聊天（4096B / 1000 条限制）与 `Caches/ChirpRoomAttachments` 密文缓存（单次入房 512 MiB 上限），通过可撤销 `AttachmentLease` 隔离密钥。 |
| [`ChirpLogStore.swift`](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/apple/Shared/ChirpLogStore.swift) | 基于 SQLite `ATTACH/DETACH` 与 `secure_delete=ON` 的 `.chirplog` 日志存储与 24 小时导出器。 |

## Apple 端 E2EE 全链路实现流程

为了让 LiveKit Swift SDK 满足 Chirp V5 严苛的零信任与门控要求，Apple 端通过 [`prepare-livekit-swift.py`](https://github.com/YouZiFeiLe/Chirp/blob/main/scripts/prepare-livekit-swift.py) 对锁定的 `client-sdk-swift 2.19.0` 应用了 **9 个源码补丁**，并直接嵌入 C++/Objective-C++ 层进行帧级拦截：

1. **清空外部 ICE 与本地开麦锁定**：`livekit-no-external-ice.patch` 在连接、入房和重连时抹去所有第三方 STUN/TURN 列表；`livekit-local-microphone-intent.patch` 拦截信令下发的远程取消静音请求，保证只有用户本地明确点击开麦才会触发采集。
2. **入房与互认锁定**：`GroupSession.swift` 联合 `RoomIdentity.swift` 校验所有在场成员的设备证书、60s 授权快照新鲜度及三组 SAS 互认状态。未互认前绝不进入建组流程。
3. **Rust OpenMLS 建组与导出秘密**：`MLS/Sources/ChirpMLS/MLSClient.swift` 通过 C 边界调用 `ChirpMLSNative.xcframework` 验证完整名单、执行 OpenMLS `Add` / `Welcome` 并通过 `Chirp LiveKit sender key v5` 导出 32 字节发送者密钥。
4. **双槽平滑换钥与 20ms 过期巡检**：`livekit-group-key-provider.patch` 与 `livekit-smooth-rotation.patch` 配置每发送者双槽位（关闭自动棘轮与明文绕过）；`livekit-v5-expiry.patch` 与后台约每 **20 毫秒**检查一次 `ContinuousClock` 的机制确保一旦 3s 媒体许可、60s 快照或 120s 密钥硬上限到期，立刻作废加密提供器。
5. **WebRTC 解码前帧认证与 96 位 IV 防重放**（[`ChirpVoiceReceiver.mm`](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/apple/Voice/ChirpVoiceReceiver.mm) + [`ChirpVoiceKeys.swift`](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/apple/Voice/ChirpVoiceKeys.swift)）：
   - `livekit-voice-receiver.patch` 将自定义 `ChirpVoiceReceiver` 挂载到 WebRTC 音频解码管线最前端；
   - 每帧音频在进入 Opus 解码器前，先经 `ChirpVoiceKeys` 使用 `HKDF<SHA256>`（`info` 为 128 字节零值）派生的 16 字节 AES-GCM 密钥完成认证解密；
   - 按「发送成员 + 实际密钥」维度维护 `Set<Nonce>` 记录已见 96 位 IV，**跨订阅丢弃重复重放帧**，允许合法乱序帧，并在单把密钥达到 **65,536 个不同 IV** 上限后阻断后续帧直至换钥；
   - 音频回调内部严格避免日志输出、动态分配或阻塞锁，仅累计解密耗时供外部每秒采样记录到 `.chirplog`。

## 音频处理预设与 RNNoise 管线

Apple 端音频处理位于 `Client/apple/Audio/`，在采集链路中提供三种实时可切换预设，并通过运行中的音轨状态回读确认生效：

- **Apple 系统处理 + RNNoise（默认）**：先经 Apple `AVAudioEngine` / VoiceProcessingIO 硬件级回声消除（AEC）、自动增益（AGC）与系统降噪，再进入 RNNoise 深度学习降噪。
- **Apple 系统处理**：完全依赖 Apple 原生语音处理单元，适合硬件表现极佳的内置麦克风场景。
- **WebRTC 回声消除 + RNNoise**：改用 WebRTC 软件 AEC/AGC 搭配 RNNoise，在部分不支持 Apple 系统语音处理的策略或外置声卡场景下提供一致降噪能力。

> [!TIP] Apple 本地构建与测试命令
> 完整的 Xcode 工程准备、依赖脚本与 `xcodebuild` 真机签名安装命令，请查看[各平台客户端构建手册 · Apple](/development/clients#apple-macos--ios)。
