# Chirp V5 端到端加密协议

Chirp V5 协议（标识 `chirp-mls-authenticated-v5`）为 macOS、iOS、Android 与 Windows 四个平台制定了统一的设备身份认证、授权日志新鲜度校验、以及基于 [OpenMLS](https://openmls.tech/)（[RFC 9420](https://datatracker.ietf.org/doc/html/rfc9420)）的房间建钥与媒体门控规范。

在工程落地中，四个原生客户端分别通过 FFI / JNI / C-ABI 调用同一份用 **Rust** 编写的加密核心库来执行建组、SAS 计算和密钥时限检查，而 Go 主服务只负责持久化账号登记事件并为带随机挑战的历史快照签名。[系统架构](/reference/architecture) · [加密与安全边界](/reference/security)

<AuthAndJoinSequence />

## 安全模型与核心假设

V5 协议的设计前提是「**零信任传输层，有界信任授权历史**」：

- **服务端不可解密内容**：业务 API、信令通道、LiveKit SFU 以及中间网络都可能出现延迟、丢包、重放甚至恶意篡改。无论是登录 Bearer 还是 LiveKit JWT，都只代表“允许连入”，绝不赋予任何解密语音、聊天或附件的能力。决定谁能拿到内容密钥的唯一依据，是客户端本地核验的 **设备证书链 + SAS 安全码 + 精确入房成员名单 + 全员 MLS 密钥确认值**。
- **撤销传播的有界信任**：由于设备撤销记录由授权服务（`/authorization/v5/`）统一保存并签名，客户端每 20 秒刷新一次绑定随机挑战的历史快照，且每份快照从发出请求起最多有效 **60 秒**。换言之，恶意授权服务最多能隐瞒尚未传达到客户端的新撤销，但**绝无法伪造用户设备的私钥签名，也无法推导出任何 MLS 会话密钥**；客户端同时会持久化本地见过的最高历史检查点，拒绝任何版本倒退的欺骗性响应。如果部署者希望完全独占授权快照的签名权，可以替换为自有签名种子并重新打包客户端。[授权快照签名密钥](/reference/authorization-keys)

## 授权服务集成与端口规范

在 Go 主服务进程中，授权模块与业务模块共享同一个 HTTP 监听端口（公开 Compose 容器内为 `18115/TCP`），但使用**完全独立的 `authorization.db` 数据库**与独立的 Ed25519 签名种子。[应用组装](https://github.com/YouZiFeiLe/Chirp/blob/main/internal/application/application.go) · [授权处理器](https://github.com/YouZiFeiLe/Chirp/blob/main/internal/authorization/server.go)

| HTTP 路由 | 职责与验证逻辑 |
| --- | --- |
| `POST /authorization/v5/append` | 验证设备签名、事件顺序以及签名者当时的登记/撤销权限，以严格递增版本号追加登记、撤销或社交事件。 |
| `POST /authorization/v5/snapshot` | 接收规范 Origin、32 字节随机 nonce 与 1–2 个账号根公钥，返回 Base64 载荷及其绑定原始摘要的 Ed25519 签名。 |
| `GET /authorization/healthz` | 单独检查 `authorization.db` 可用性，健康时返回 HTTP `204`。 |
| `GET /healthz` | 联合检查主业务库 `chirp.db` 与授权库 `authorization.db`，正常返回 HTTP `200`。 |

::: warning 授权接口严格禁用替身鉴权与默认降级
授权追加操作绝不接受浏览器 Cookie 或业务 Bearer 替代设备私钥签名。若服务端配置中的授权签名种子文件缺失、格式错误或权限不符合 `0400`/`0600` 要求，服务端会**直接拒绝启动**，绝不会自动生成临时密钥凑数。
:::

## 身份核验与准入铁律

<DeviceTrustTreeDiagram />

1. **未核验前彻底隔离**：房间中只要存在尚未完成双向 SAS 互认的设备，所有客户端仅允许交换公开身份、证书、SAS 控制消息与房间状态，**严禁交换 MLS `Welcome`、语音帧、文字聊天或附件描述**。客户端间的不透明端到端加密信号经 `/v1/identity/signals`（单包 ≤ 64 KiB、按规范 Origin 隔离）转发。
2. **必须依赖独立可信渠道核对 3 组安全码**：双方必须当面或通过另一条早已验证过身份的独立渠道，逐组核对全部三组安全码，**严禁**使用尚未核验的当前通话自身来口头确认。
3. **不以昵称或服务端状态替代密码学身份**：信任严格绑定 `Origin + 账号根公钥 + 具体设备公钥`；有效证书、好友备注、账号 ID 或服务端下发的 `ready` 标记均不能替代设备互认。
4. **先批名单，再建群组**：客户端先在本地批准当前精确名单（绑定 `entry_id`、设备身份、MLS 公钥与新鲜授权状态），共享 Rust 引擎在调用 OpenMLS `Create`/`Join` 前会再次校验该名单，解析 `Welcome` 时也会逐一比对内部成员集合是否分毫不差。
5. **全员签名确认后才开放传输**：成员变动时必须先停发内容并退役旧密钥，再重建群组；只有在全员提交一致的 `epoch authenticator` 确认签名且取得短期媒体许可后，才允许打开收发门控。
6. **四端共享同一套信任公钥**：四个平台在构建阶段均直接打包 `Client/apple/Shared/Resources/AuthorizationTrust.json` 中的公钥。客户端确认服务器后，会自动从 `passkey_origin` 派生出 `/authorization/v5/` 端点。使用同一公钥构建的客户端可通用接入所有使用公开默认种子的服务器；若更换自有种子，则必须同步重新构建并分发客户端。[公钥资源](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/apple/Shared/Resources/AuthorizationTrust.json) · [Windows 构建脚本](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/windows/scripts/Build-Native.ps1) · [Android 构建配置](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/android/app/build.gradle.kts)

## 授权日志状态机、容量上限与新鲜度

### 事件链与 CAS 防篡改

授权日志（[状态机源码](https://github.com/YouZiFeiLe/Chirp/blob/main/internal/authorization/protocol.go)）为每个账号根维护一条严格递增版本号的哈希链，每条记录都绑定 V5 签名域与上一条记录摘要：

- **验证次序**：每次追加都依次核验「前序已验证状态 → 签名者当时是否具备有效登记/撤销权限 → 当前操作签名 → 新状态合法性」，并通过 SQLite Compare-And-Swap（CAS）防止并发请求覆盖已经提交的撤销记录。
- **幂等重试与容量预留**：提交完全相同的版本号与事件摘要时允许幂等重试；若发生并发版本号冲突，客户端会重新拉取最新快照后再签名重提。每个账号最多可登记 **128 台设备**，事件总数上限为 **8192 条**，其中普通登记与社交事件**最多只能占用前 4096 个版本**——后半段空间专门强制保留给未来的撤销事件，确保账号即使被刷满也不会丧失撤销能力。

### 快照刷新与连续时钟约束

| 参数 / 规则 | 约束值与行为说明 |
| --- | --- |
| **挑战刷新周期** | 每 **20 秒**携带新随机 nonce 请求一次签名快照。 |
| **快照最长有效期** | 自**发出请求**的 `ContinuousClock` 时刻起 **60 秒**（网络耗时与休眠计入有效期；多批请求取最早过期时间）。 |
| **拒绝无效续期** | 复用旧挑战、空响应、短分页或未能覆盖本机已见历史前缀的响应，一律不能延长 60 秒授权截止时间。 |
| **读证明时效** | 读取个人完整社交明文正文需附加本人有效设备签名的读证明，服务端允许与本机时钟最多相差 **60 秒**。 |

## 客户端强制换钥与媒体门控细节

<GroupStateMachineDiagram />

<KeyHierarchyAndRotation />

### 关键时限一览

- **服务端计划轮换**：默认每 **60 秒**触发一次平滑轮换（通过 `CHIRP_GROUP_ROTATION` 在 `30s` 至 `30m` 间可调）。
- **客户端密钥年龄铁律**：客户端从首次创建或解出本轮密钥时起算，达到 **90 秒**即主动发起重建，达到 **120 秒**硬上限立即停止使用该密钥——**任何心跳、续租、重连、重复安装同一密钥或系统休眠都无法重置密钥年龄**。
- **候选轮保护窗口**：平滑轮换时，候选轮准备与切换合计最多允许 **15 秒**；旧接收槽最多额外保留 **1 秒**以消化网络在途帧（同时不得越过原租约和原密钥截止时间）。
- **有效内容截止时间**：客户端每次允许发送或播放媒体时，取以下四者的**最小值**：`min(媒体租约期限, 登录与设备证书到期时间, 授权快照 60s 截止时间, 密钥 120s 年龄硬上限)`。共享 Rust 库在底层同样拒绝导出超龄材料。

### 音频帧解密防护（防重放与上限）

在音轨安全恢复与解密阶段（以 Apple 端与 Rust 核心为例）：

- **安全暂停顺序**：遇到成员变更或授权中断进入安全暂停时，客户端会先撤销内容授权并清空当前及候选 MLS 状态，再等待音频采集与播放设备暂停；已订阅音轨保持订阅状态，直到重新验完全员签名并拿到有效新租约后才恢复出声。
- **AES-GCM 认证与 96 位 IV 防重放**：WebRTC 解码前，接收端会先校验 Opus 帧的 AES-GCM 标签，并按「发送成员 + 实际密钥」维度记录已接收过的 96 位 IV，跨订阅丢弃重复帧，同时允许首次到达的乱序帧正常解密。每名成员使用同一把密钥最多只接收 **65,536 个不同 IV**，超出上限后的帧会被丢弃直至下次换钥。
- **轮询与发送门控**：Apple 端在 PCM 采集回调函数内逐帧核对连续时钟，后台线程每约 20 毫秒巡检作废过期加密提供器；可靠数据通道内排队的聊天消息也会在实际出队发送前一刻再次检验租约与提供器状态。Android 与 Windows 同样在各自媒体及数据通道执行对称门控。[Android 媒体密钥](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/android/app/src/main/kotlin/cn/youzifeile/chirp/media/VoiceKeys.kt) · [Windows 媒体处理](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/windows/engine/media_windows.go)

> [!NOTE] 工程边界说明
> 客户端未魔改 WebRTC 底层 C++ 编码器去实现微秒级硬实时打断，因此**已经离开应用门控进入编码器、UDP 网络或系统播放缓冲区的少量在途音频帧无法撤回**；同样的，Rust 内存清理只能最大限度清零序列化秘密，不能替代操作系统级取证擦除。

## 各端实现追踪与协议测试入口

- **各端协议协调代码**：
  - **Apple**：[RoomIdentity.swift](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/apple/Shared/RoomIdentity.swift) · [GroupSession.swift](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/apple/Shared/GroupSession.swift)
  - **Windows**：[authority_windows.go](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/windows/engine/authority_windows.go) · [room_windows.go](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/windows/engine/room_windows.go)
  - **Android**：[AccountIdentity.kt](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/android/app/src/main/kotlin/cn/youzifeile/chirp/data/AccountIdentity.kt) · [SecureGroup.kt](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/android/app/src/main/kotlin/cn/youzifeile/chirp/media/SecureGroup.kt)
- **自动化验证清单**：

| 测试维度 | 命令行入口与验证范围 |
| --- | --- |
| **Go 服务端并发与竞态** | 在 Linux / macOS 上运行 `go test -race ./...` 与 `go vet ./...`，覆盖统一路由、签名挑战、权限、并发 CAS、持久化及缺钥拒绝启动。 |
| **Apple 共享状态机** | 在 macOS 上运行 `swift test --package-path Client/apple --scratch-path .build/swift-core`，验证授权、身份、群组与发送门控。 |
| **V5 授权联调** | 在 macOS 上运行 `python3 scripts/test-v5-authorization.py`，覆盖 Swift 客户端经 Go 主服务完成登记、私密/公开视图、多根读证明与撤销。 |
| **密钥年龄与候选超时** | 运行 `python3 scripts/test-v5-key-age.py`（加 `--candidate` 参数测试候选轮超时），验证 90s 主动重建与 120s 强制退役。 |
| **跨平台客户端验证** | 参见[各平台客户端构建与验证](/development/clients)、[本地开发与隔离联调](/development/building)与[人工测试与验收清单](/development/testing)。 |
