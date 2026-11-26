# 统一设计规范、共享资源与跨端联动

Chirp 的四个原生客户端（macOS、iOS、Android、Windows）以及 Passkey/管理台网页端并非各自孤立实现，而是围绕「**一套密码学内核 + 一套设计语言 + 一套共享资源源头 + 统一的服务端状态契约**」协同工作。无论是哪一个平台的用户，都能在同一房间里以完全一致的安全保障与交互心智模型语音通话、发消息和传文件。

<CrossPlatformMatrixDiagram />

## 统一设计规范（Chirp — Together）

所有端共享 [`design-tokens.json`](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/Branding/design-system/design-tokens.json)（v2）定义的品牌语义视觉规范，确保浅色、深色与系统高对比度模式下都能保持柔和克制的阅读与通话体验：

| 视觉维度 | 跨端统一标准（`design-tokens.json` v2） |
| --- | --- |
| **主题色板（Light / Dark）** | 画布背景 `#F4F6F2` / `#101B17`、卡片表面 `#FFFFFF` / `#192A23`、强调绿 `#246448` / `#A9DAB5`、危险警示 `#AF403D` / `#FFB4A8`、聊天气泡画布 `#EDF3ED` / `#14231D`。 |
| **稳定成员头像四色池** | 依据去掉 `.login_` 后缀的稳定成员 ID 哈希映射到 4 组莫兰迪浅/深色头像配色，确保同一个人每次重登进房都保持相同的身份识别色。 |
| **间距与圆角阶梯** | 间距梯度 `4 / 8 / 12 / 16 / 24 / 32 / 40`（逻辑 pt/dp/DIP）；圆角阶梯为控件 `14`、卡片 `24`、主视觉区 `32`、头像圆形 `50%`、通话操作胶囊按钮。 |
| **桌面端布局尺度（macOS / Windows）** | 默认窗口 `1120 × 780`、最小窗口 `900 × 620`；侧边栏 `220–300`（理想 `252`）、右侧聊天栏 `280–400`（理想 `320`）、主内容最大宽 `800`。 |
| **移动端布局尺度（iOS / Android）** | 统一「房间 / 好友 / 我的」三标签架构；内容边距 `24`、成员卡片网格最小列宽 `132`（无障碍大字号下自动升至 `240`）。 |
| **未核验状态视觉隔离** | 一旦房间内存在未完成 SAS 互认的设备，主画面立即切换至红褐警示色调（`roomVerificationCanvas` `#FBEDEA` / `#291F20`），直观提醒成员“当前房间内容已锁定”。 |

各端实现入口：[Apple `ChirpTheme.swift`](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/apple/Shared/Views/ChirpTheme.swift) · [Android `ChirpTheme.kt`](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/android/app/src/main/kotlin/cn/youzifeile/chirp/ui/ChirpTheme.kt) · [Windows `App.xaml`](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/windows/Chirp/App.xaml)

## 跨端共享资源体系（Single Source of Truth）

为了避免四端出现协议分叉、错误码翻译不一致或公钥漂移，Chirp 把所有最容易出错的核心资产收拢为**唯一权威来源**，在各平台构建期自动校验并分发：

| 共享资产 | 权威来源位置 | 如何分发到四个平台 |
| --- | --- | --- |
| **共享 Rust 加密内核** | [`Client/apple/MLS/native/`](https://github.com/YouZiFeiLe/Chirp/tree/main/Client/apple/MLS/native) | 封装 [OpenMLS](https://openmls.tech/) `0.9.2`、[vodozemac](https://github.com/matrix-org/vodozemac) `0.11.2`（SAS）、Argon2id + AES-GCM（`.chirpkey`）及各平台休眠连续时钟。<br>• Apple：编译为 `ChirpMLSNative.xcframework`<br>• Android：CMake + `mls_jni.c` 编入 `arm64-v8a` / `x86_64` `.so`<br>• Windows：编译为 `chirp_mls_native.dll` 供 Go 引擎调用 |
| **授权信任公钥** | [`AuthorizationTrust.json`](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/apple/Shared/Resources/AuthorizationTrust.json) | 仅含 `public_key` 字段：<br>• Apple 直接打入 App Bundle<br>• Android Gradle 任务 `prepareAuthorizationTrust` 校验 32 字节 Ed25519 后打入 `assets/`<br>• Windows `Build-Native.ps1` 校验并复制到 `Chirp.Protocol.exe` 同级目录 |
| **双语文案与错误码表** | [`Client/apple/Shared/Resources/`](https://github.com/YouZiFeiLe/Chirp/tree/main/Client/apple/Shared/Resources)（`Localizable.strings`、`Errors.strings`） | • Apple 原生直接读取 `.lproj`<br>• Android 由 [`prepare-android-messages.py`](https://github.com/YouZiFeiLe/Chirp/blob/main/scripts/prepare-android-messages.py) 在构建时校验参数占位符并自动生成 `values/` 与 `values-zh-rCN/` XML<br>• Windows 通过 `Chirp.csproj` 内嵌为 `EmbeddedResource` 供 `SharedCopy.cs` 解析 |
| **进出房提示音** | `Client/apple/Shared/Resources/Sounds/`（`JoinTheRoom.mp3`、`LeftTheRoom.mp3`） | Apple 原生打包；Android 与 Windows 在构建时直接从同一资源目录复制进各自应用包。 |
| **RNNoise 降噪源码与补丁** | [`prepare-rnnoise.py`](https://github.com/YouZiFeiLe/Chirp/blob/main/scripts/prepare-rnnoise.py) | 统一拉取锁定版 RNNoise 并应用 `rnnoise-model-loading.patch`，分别接入 Apple `ChirpAudio`、Android JNI 与 Windows `Chirp.RNNoise.dll`。 |
| **跨语言测试向量** | [`internal/identity/testdata/`](https://github.com/YouZiFeiLe/Chirp/tree/main/internal/identity/testdata) | 包含 `v5.json`、`device-pairing-v1.json` 与 `recovery-v1.json`，Go、Swift、Rust 与 Android 测试共同读取校验二进制字节兼容性。 |

## 客户端与服务端、客户端之间的联动关系

在实际运行中，客户端之间并不是孤立运行的，而是通过以下五条精确的协议联动链路实现**跨平台无缝互通**：

1. **服务发现与版本准入联动**：四端启动确认地址时均请求 `GET /v1/client-config` 并携带 `X-Chirp-Platform`、`X-Chirp-Version`、`X-Chirp-Build`，使服务端可按平台精准下发版本策略与统一端点。
2. **跨平台登录与授权接力联动**：
   - 桌面端（macOS / Windows）或 Android 可生成一次性登录二维码，由持有 Passkey 的手机访问同域 `/device` 完成授权；
   - 换机时任意两台设备（例如 iPhone 与 Windows 电脑）可通过 `chirp-device-pair-v1` 互相扫码或导入 PNG 二维码图片签发设备证书，或跨平台通用导入 `.chirpkey`。
3. **目录 SSE 与状态快照联动**：四端均订阅 `GET /v1/events` SSE 事件流；当管理员在 `/admin/` 修改房间名、描述、移除成员或有新成员加入时，服务端推送 `revision` 变化，各端随即拉取 `GET /v1/state` 刷新权威状态。
4. **群组状态机与平滑换钥联动**：当房间内混用 macOS、iOS、Android 与 Windows 客户端时，只要全员在签名 `join` 中声明了 `smooth_rotation: true`，Go 群组协调器便协同四端提前预装候选轮密钥并在 `switching` 阶段同步切换发送槽；一旦有任何一端异常掉线或成员变化，协调器立即广播新 `generation` 通知全员暂停并重建群组。
5. **媒体加密与聊天/附件互通联动**：四端均使用相同的 [Opus](https://opus-codec.org/) 帧尾密封格式（`TOC | ciphertext | tag | IV | 12 | key index`）、相同 [HKDF](https://datatracker.ietf.org/doc/html/rfc5869) 密钥派生（`LKFrameEncryptionKey`）、相同的可靠数据通道 JSON 信封（`RoomChat`）以及相同 v3 附件协议（256 KiB AES-256-GCM 分片 + 1 MiB HTTPS 分块），实现完全透明的跨系统语音与文件互传。

## 按平台深入阅读

- [Apple 客户端（macOS & iOS）实现详解](/clients/apple)
- [Android 客户端实现详解](/clients/android)
- [Windows 客户端实现详解](/clients/windows)
- [安全扫描与加密链路评估报告](/reference/security-audit)
