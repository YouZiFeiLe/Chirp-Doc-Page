<script setup>
import ArchitectureMap from '../.vitepress/theme/components/ArchitectureMap.vue'
</script>

# 系统架构

Chirp 采用「**轻量控制面 + 自托管 [SFU](https://en.wikipedia.org/wiki/Selective_forwarding_unit) 媒体转发 + 客户端全权密钥管理**」的三层架构：

- **Chirp Go 服务（`app`）**：统一托管 [Passkey / WebAuthn](https://www.w3.org/TR/webauthn-3/) 网页登录、管理台、业务 API、V5 授权日志、临时附件暂存以及群组协调器。
- **LiveKit SFU（`livekit`）**：仅负责转发客户端之间已端到端加密的实时音频帧与可靠数据消息。
- **四大原生客户端**：macOS、iOS、Android 与 Windows 在本机保管设备私钥、核对好友设备安全码并运行 [OpenMLS](https://openmls.tech/)（[RFC 9420](https://datatracker.ietf.org/doc/html/rfc9420)）派生内容密钥，**服务端全程不接触任何语音、文字或文件的解密密钥**。

## 整体拓扑与核心数据流

点击下方交互卡片切换「登录与入房」「实时语音」「文件传输」三条主路径，结合拓扑图即可看清各组件的分工：

<ArchitectureMap />

<NetworkTopologyDiagram />

在网络边界上，所有控制面流量与 WebSocket 信令统一通过 `443/TCP` 进入反向代理（内置 SWAG Nginx 或用户已有 Nginx）：`/rtc` 及其子路径代理至 LiveKit（`7880/TCP`），其余网页、API、SSE 与授权请求代理至 Go 服务（`18115/TCP`）。加密媒体流则通过 `7882/UDP` 直达 LiveKit。环境变量 `CHIRP_PUBLIC_ORIGIN` 统一决定了 WebAuthn 的 RP ID / Origin、服务发现端点与公开信令地址。[Compose 配置](https://github.com/YouZiFeiLe/Chirp/blob/main/compose.yaml) · [配置派生源码](https://github.com/YouZiFeiLe/Chirp/blob/main/internal/config/config.go) · [服务端配置与运维](/hosting/operations)

## 服务端代码模块索引

| 模块入口 | 核心职责 |
| --- | --- |
| [命令行入口](https://github.com/YouZiFeiLe/Chirp/blob/main/cmd/chirp/main.go) → [应用组装](https://github.com/YouZiFeiLe/Chirp/blob/main/internal/application/application.go) | 初始化 SQLite 存储、LiveKit 管理客户端与三个后台监视协程，把全部路由挂载到同一 HTTP 服务；CLI 同时提供管理员引导和授权公钥校验。 |
| [Passkey 认证](https://github.com/YouZiFeiLe/Chirp/blob/main/internal/passkeyhttp/server.go) · [管理台](https://github.com/YouZiFeiLe/Chirp/blob/main/internal/adminhttp/server.go) · [前端资源](https://github.com/YouZiFeiLe/Chirp/blob/main/internal/webui/assets.go) | 提供浏览器注册、登录、手机扫码确认页以及管理员控制台。网页静态资源由 Go `embed` 直接打包进二进制文件。 |
| [业务 API](https://github.com/YouZiFeiLe/Chirp/blob/main/internal/httpapi/server.go) · [存储层](https://github.com/YouZiFeiLe/Chirp/blob/main/internal/store/store.go) | 负责服务发现、个人资料、房间目录、附件传输和设备接口。存储层在 SQLite 写事务内严格校验登录状态、设备资格与入房权限。 |
| [V5 身份协议](https://github.com/YouZiFeiLe/Chirp/blob/main/internal/identity/protocol.go) · [授权服务](https://github.com/YouZiFeiLe/Chirp/blob/main/internal/authorization/protocol.go) | 定义设备证书链、签名域与入房绑定格式；授权服务负责验证成员提交的登记/撤销事件，并为带随机挑战的历史快照签名。 |
| [群组协调器](https://github.com/YouZiFeiLe/Chirp/blob/main/internal/group/hub.go) · [动作校验](https://github.com/YouZiFeiLe/Chirp/blob/main/internal/group/action.go) | 为每个房间维护当前活跃成员、配钥阶段与平滑轮换进度；转发 `KeyPackage`、加密 `Welcome` 与全员确认值，并在条件满足时签发 3 秒媒体许可。 |
| [媒体管理](https://github.com/YouZiFeiLe/Chirp/blob/main/internal/room/service.go) · [房间目录](https://github.com/YouZiFeiLe/Chirp/blob/main/internal/room/directory.go) | 签发绑定房间与参与者身份的短期 LiveKit JWT，通过内网 Twirp RPC 查询或强制移出参与者，并将房间配置与实时在线状态合并返回。 |

## 从服务发现到安全通话的全链路

<AuthAndJoinSequence />

### 阶段一：服务发现与 Passkey 身份认证

1. **版本准入与端点发现**：客户端向 `GET /v1/client-config` 发送请求，并携带 `X-Chirp-Platform`、`X-Chirp-Version` 和 `X-Chirp-Build` 三个请求头。服务端会校验最低支持版本，并返回 `passkey_origin`、各业务端点以及更新策略。[发现处理器](https://github.com/YouZiFeiLe/Chirp/blob/main/internal/httpapi/client_config.go) · [版本校验](https://github.com/YouZiFeiLe/Chirp/blob/main/internal/clienthttp/version.go)
2. **Passkey 登录与 PKCE 授权**：原生客户端通过浏览器回调（`code` 仅 1 分钟有效；Windows 额外支持最多 60 秒指数退避浏览器接力轮询 `/api/auth/login/windows-handoff`）或手机跨端扫码（`3` 分钟有效）完成 WebAuthn 认证，并全部使用 **S256 [PKCE](https://datatracker.ietf.org/doc/html/rfc7636)** 绑定发起客户端。兑换成功后，客户端拿到一份有效期 **5 分钟**的「身份设置授权」。
3. **本机设备激活与颁发 Bearer**：首次登录的设备会引导用户生成账号根并导出 `.chirpkey`；换机设备则导入 `.chirpkey` 或由旧设备扫码签发证书。随后客户端在 `/api/client/identity/challenge` 与 `/complete` 完成私钥持钥证明，服务端在同一事务中颁发有效期最长 **20 小时**（且不超过设备证书到期时间）的业务 Bearer，同时替换该账号的旧设备会话。携带 `X-Chirp-Login-Resumption: 1` 能力头的客户端还会获发 `resume_token`，供进程结束重开后通过 `/api/client/resume/challenge` 与 `/complete`（`Chirp login resumption v1` 设备签名）在原截止时间内换取新 Bearer。[Passkey 路由](https://github.com/YouZiFeiLe/Chirp/blob/main/internal/passkeyhttp/server.go) · [凭据签发](https://github.com/YouZiFeiLe/Chirp/blob/main/internal/store/client_login.go) · [冷启动恢复](https://github.com/YouZiFeiLe/Chirp/blob/main/internal/store/client_resumption.go)

<PasskeyQrLoginDiagram />

### 阶段二：入房授权、安全互认与媒体门控

Chirp 实行「**单账号单登录、单登录单入房**」的严格会话隔离。每次成功入房都会分配一个全局唯一的组合身份 `member_id.login_id.entry_id`（简称当次入房会话 `entry_id`），用于串联数据库授权、LiveKit 参与者标识与 OpenMLS 群组身份，并通过单调递增的 `join_sequence` 防止旧请求重放或错乱。[入房事务](https://github.com/YouZiFeiLe/Chirp/blob/main/internal/store/rooms.go)

1. **入房预校验（Preflight）**：加入房间前，客户端先向 `POST /v1/rooms/{room}/preflight` 提交房间密码与 `join_sequence`（每位成员每房 **30 秒内最多 5 次失败尝试**）。服务端返回一张最长有效 **30 秒**的签名 Proof（绑定登录、房间、序列与密码版本）。若密码输错，客户端当前已有的通话**不会**受到影响。[预校验源码](https://github.com/YouZiFeiLe/Chirp/blob/main/internal/httpapi/room_preflight.go)
2. **正式入房与媒体 JWT**：客户端持 Proof 调用 `join` 后，服务端原子切换入房记录，返回 `entry_id`、`livekit_url` 与短期 LiveKit JWT。业务入房准入最长保持 **30 秒**，依靠群组 `join` 或每 2 秒一次的 `heartbeat` 持续续期。
3. **设备互认与 OpenMLS 配钥**：进入房间后，客户端通过共享的 Rust OpenMLS 引擎处理成员 `KeyPackage` 与 `Welcome`，并核对全员设备证书、历史撤销快照及好友设备安全码（SAS）。只有全员确认同一份名单与确认值，并向群组协调器取得**最长 3 秒的媒体发送许可**后，客户端才会开放语音采集、文字聊天和附件发送。[群组状态机](https://github.com/YouZiFeiLe/Chirp/blob/main/internal/group/hub.go) · [共享 Rust 密码库](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/apple/MLS/native/src/lib.rs)

<GroupStateMachineDiagram />

## 服务端路由与鉴权矩阵

| 调用方与路径前缀 | 鉴权方式与安全约束 | 核心源码 |
| --- | --- | --- |
| 浏览器入口 `/`、`/register`、`/device`、`/api/auth/` | WebAuthn 挑战、Origin 严格校验、HttpOnly + SameSite=Strict 浏览器 Cookie。原生客户端专用接口集中在 `/api/client/`。 | [Passkey 服务](https://github.com/YouZiFeiLe/Chirp/blob/main/internal/passkeyhttp/server.go) |
| 管理台 `/admin/`、`/admin/api/` | 校验管理员浏览器会话与管理员角色，写请求额外校验 Origin。管理员角色仅可由服务器 CLI 变更。 | [管理台服务](https://github.com/YouZiFeiLe/Chirp/blob/main/internal/adminhttp/server.go) |
| 原生客户端 `/v1/` | `/v1/client-config` 为公开发现接口；其余目录、资料、设备、房间与附件接口均需当前有效的业务 Bearer；`/v1/identity/signals` 用于按 Origin 隔离中继 64 KiB 以内的不透明端到端加密信号，附件接口还须匹配精确的 `entry_id`。 | [业务 API](https://github.com/YouZiFeiLe/Chirp/blob/main/internal/httpapi/server.go) · [身份社交路由](https://github.com/YouZiFeiLe/Chirp/blob/main/internal/httpapi/social.go) |
| 群组协调 `/v1/group/rooms/{room}/` | `GET config` 校验业务 Bearer；`POST action` 与 `POST events` 额外校验客户端 Ed25519 请求签名与请求预算。 | [群组路由](https://github.com/YouZiFeiLe/Chirp/blob/main/internal/group/server.go) |
| 授权日志 `/authorization/v5/` | `POST append` 校验设备签名与事件权限；`POST snapshot` 对绑定随机挑战的历史快照签名。读取个人完整社交正文另需设备签名读证明。 | [授权 HTTP](https://github.com/YouZiFeiLe/Chirp/blob/main/internal/authorization/server.go) |
| 健康监测 `/livez`、`/healthz`、`/authorization/healthz` | 分别检测进程存活（`200`）、两份 SQLite 可用性（`200`）、独立授权库可用性（`204`）。 | [顶层路由](https://github.com/YouZiFeiLe/Chirp/blob/main/internal/application/application.go) |

目录实时同步通过 `GET /v1/events` SSE 推送 `server_id` 与 `revision`，客户端重连或检测到变更时拉取 `GET /v1/state` 权威快照；群组 SSE 则另行推送 `rotation_revision` 以驱动无缝换钥。[目录同步](https://github.com/YouZiFeiLe/Chirp/blob/main/internal/httpapi/state.go) · [Apple 同步实现](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/apple/Shared/ClientStateSync.swift)

## 持久化存储与单实例生命周期

| 持久化位置（容器路径） | 数据内容与管理策略 |
| --- | --- |
| `/data/chirp.db`（`data` 卷） | 主业务 SQLite（WAL 模式、`BEGIN IMMEDIATE` 写事务、仅支持空库或 schema `23`），存放成员、Passkey 公钥、登录摘要、登录恢复记录（`client_login_resumptions`）、房间、版本策略、黑名单及附件投递状态。[建表 SQL](https://github.com/YouZiFeiLe/Chirp/blob/main/internal/store/schema.sql) |
| `/data/authorization.db`（`data` 卷） | 独立授权日志 SQLite，按账号根保存设备登记、永久撤销与社交事件链；由 `CHIRP_AUTHORIZATION_KEY_FILE` 加载的种子签名。[密钥加载](https://github.com/YouZiFeiLe/Chirp/blob/main/internal/authorization/key.go) |
| `/data/attachments/`（`data` 卷） | 临时密文分块目录。服务重启时自动清理失去投递资格的对象和孤立文件。[附件协议](/reference/attachments) |
| `/var/lib/chirp-media/keys.json`（`media-keys` 卷） | 首次启动由 `app` 随机生成并写入，供 `livekit` 只读共享的 API 凭据。[密钥生成](https://github.com/YouZiFeiLe/Chirp/blob/main/internal/config/livekit_keys.go) |
| `/app/log/`（`logs` 卷） | 服务端按天滚动的 JSON Lines 日志（默认保留近 7 天），或开启推送后直送 VictoriaLogs。[日志配置](https://github.com/YouZiFeiLe/Chirp/blob/main/internal/logging/logging.go) |

::: note 为什么当前部署限定为单实例 `app`？
群组状态机、SSE 实时连接表、入房预校验 HMAC 秘钥以及附件在线接收状态都保存在 `app` 进程内存中，SQLite 及其 WAL/SHM 也依赖本机 POSIX 文件系统锁。因此切勿水平扩展多个 `app` 容器共享同一份 SQLite 文件。服务平滑退出时会先排空 HTTP 请求、停止三个后台监视器，再关闭存储。
:::

## 四端客户端工程分工

想深入了解各端实现细节、E2EE 加密链路、统一设计规范及共享资源，请查看独立专题页：[统一设计与跨端共享](/clients/shared-and-design) · [Apple（macOS / iOS）](/clients/apple) · [Android](/clients/android) · [Windows](/clients/windows)。

| 平台 | 技术栈与核心实现入口 |
| --- | --- |
| **macOS / iOS** | SwiftUI 共用 `ApplicationSession` 管理登录、目录与设备；`CallController` 协调通话生命周期，`GroupSession` 驱动配钥，LiveKit Swift 与本机音频管线处理采集与降噪。[ApplicationSession](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/apple/Shared/ApplicationSession.swift) · [CallController](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/apple/Shared/CallController.swift) |
| **Android** | Kotlin / Jetpack Compose 界面；`ServerRepository` 处理发现与登录，`CallController` 结合 Core-Telecom 与 LiveKit Android 管理后台通话，`SecureGroup` 经 JNI 桥接共享 Rust。[ServerRepository](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/android/app/src/main/kotlin/cn/youzifeile/chirp/data/ServerRepository.kt) · [SecureGroup](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/android/app/src/main/kotlin/cn/youzifeile/chirp/media/SecureGroup.kt) |
| **Windows** | C# / WinUI 3 负责桌面交互、WASAPI 采集与 Opus 编解码；独立的 Go 协议子进程（`Chirp.Protocol.exe`）通过管道与界面通信，承担认证、群组、LiveKit/Pion 连接与附件传输，并通过 C ABI 调用共享 Rust 库。[room_windows.go](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/windows/engine/room_windows.go) · [media_windows.go](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/windows/engine/media_windows.go) |
| **四端共用核心** | Rust 库统一实现 OpenMLS 群组协议、vodozemac SAS 安全码以及 `.chirpkey` 编解码；构建时四端均嵌入同一份 `AuthorizationTrust.json` 授权公钥。[Rust 核心源码](https://github.com/YouZiFeiLe/Chirp/tree/main/Client/apple/MLS/native/src) · [公钥资源](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/apple/Shared/Resources/AuthorizationTrust.json) |

## 延伸阅读

- **构建与测试**：[服务端本地构建与验证](/development/building) · [各平台客户端构建手册](/development/clients) · [人工测试与验收清单](/development/testing)
- **协议与安全规范**：[加密与安全边界](/reference/security) · [Chirp V5 端到端加密协议](/reference/e2ee-v5) · [授权快照签名密钥](/reference/authorization-keys) · [附件传输与缓存](/reference/attachments) · [`.chirpkey` 恢复文件规范](/reference/chirpkey) · [客户端日志格式](/reference/chirplog)
