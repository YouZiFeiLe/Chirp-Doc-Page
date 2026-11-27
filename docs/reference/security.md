# 加密与安全边界

Chirp 的核心安全目标很明确：**即使服务器被部分入侵或转发节点不可信，服务端也无法解密用户的实时语音、文字消息或附件内容**。macOS、iOS、Android 与 Windows 四个客户端共享同一套用 Rust 实现的 OpenMLS 群组引擎、设备身份验证和 `.chirpkey` 加解密代码，再各自对接本机系统级密钥库（Apple Keychain / Android Keystore / Windows DPAPI）与音频/WebRTC 管线。

下文系统梳理了 Chirp V5 中的各类密钥材料、信任根传递链、设备配对与互认机制、平滑换钥门控，以及这套架构明确能防什么、不能防什么。[Chirp V5 协议详解](/reference/e2ee-v5) · [安全扫描与加密链路评估报告](/reference/security-audit) · [附件传输规范](/reference/attachments)

## 密钥分层与双槽轮换总览

<KeyHierarchyAndRotation />

## 身份凭证、密钥材料与生命周期

Chirp 将「向服务器证明准入资格的凭证」与「终端之间加密内容的密钥」严格隔离：Passkey 和 Bearer Token 只用来证明你可以连上服务器，LiveKit JWT 只用来接入 SFU 媒体房间；而**真正决定谁能解密内容的，是经过双方安全码（SAS）核验并绑定到当次入房 `entry_id` 的 OpenMLS 密钥**。

| 材料类别 | 生成与存放位置 | 有效期与退役机制 |
| --- | --- | --- |
| **Passkey 私钥** | 用户设备或密码管理器（服务端仅存公钥）。 | 长期有效；管理员删除账号不会远程清除用户设备上的 Passkey。 |
| **WebAuthn 挑战记录** | 服务端 SQLite 临时表。 | 一次性使用，浏览器认证仪式最长有效 **5 分钟**。 |
| **浏览器会话 Cookie** | 服务端仅存摘要，浏览器存 `HttpOnly; SameSite=Strict` Cookie（HTTPS 下带 `Secure`）。 | 最长 **8 小时**；角色变更、账号停用或登出立即作废。 |
| **原生登录授权码** | 服务端存摘要，绑定发起客户端与 S256 PKCE。 | 一次性兑换，最长 **1 分钟**，且校验对应平台的固定回调地址。 |
| **手机扫码登录请求** | 服务端短期记录，绑定客户端与私有 verifier。 | 最长 **3 分钟**；扫码批准后兑换为短期设置授权，最终激活成功才踢掉旧端。 |
| **身份设置授权** | Passkey 登录兑换后的短期临时凭据（绑定 Origin、账号、PKCE 与公钥挑战）。 | 最长 **5 分钟**；仅限完成设备激活或配对，不能用于入房或读取目录。 |
| **客户端业务 Bearer** | 服务端存 SHA-256 摘要，客户端仅存于进程内存不落盘。 | 取登录后 **20 小时**与设备叶证书到期时间的较早者；新设备登录成功或冷启动恢复轮换时即替换旧 Bearer。 |
| **登录恢复凭证（`resume_token`）** | 服务端存 SHA-256 摘要及所属 `origin`/`platform`/`login_id`；客户端经系统逐次本机验证绑定加密保存（Apple `biometryCurrentSet`/`userPresence` 钥匙串、Android `BIOMETRIC_STRONG` + Keystore RSA 封包、Windows 按需启用 Hello KSP `NCryptDecrypt`）。 | 与首次登录业务 Bearer 共享**同一绝对截止时间**；恢复时仍须目标设备用 V5 私钥签署 1 分钟单次挑战，主动注销、接管或撤销即刻失效。[设计说明](/changelog/2026-11-27-1) |
| **入房预校验 Proof** | 由 `app` 进程内存随机秘钥签名的 [HMAC-SHA256](https://datatracker.ietf.org/doc/html/rfc2104)。 | 最长 **30 秒**，绑定登录、房间、序号与密码版本；`app` 重启后未使用的 Proof 立即失效。 |
| **精确入房记录（`entry_id`）** | 服务端 SQLite（关联 `login`、`room`、`entry`）。 | 每次签发或心跳续期后最长 **30 秒**，且受当前登录到期时间约束。 |
| **LiveKit JWT** | 由 `app` 与 `livekit` 共享的 `keys.json` 签发。 | 默认 **5 分钟**，仅授予发布麦克风、订阅轨道与发布数据通道权限。 |
| **账号 [Ed25519](https://datatracker.ietf.org/doc/html/rfc8032) 根私钥** | 首次获批登录时在客户端本机由安全随机源生成。 | **永不落盘、不进 Keychain、不上传**；仅在初始化或恢复的短暂内存中使用，导出至 `.chirpkey` 后即刻释放。 |
| **`.chirpkey` 恢复文件** | 用户自行导出的离线加密备份文件（Argon2id + AES-256-GCM）。 | 长期有效，直到用户遗忘密码或主动销毁。[规范详情](/reference/chirpkey) |
| **设备 Ed25519 私钥与证书** | 按规范 Origin 与不可变账号 ID 隔离存放于本机安全存储（Apple Data Protection Keychain / Android Keystore / Windows DPAPI）。 | 退出登录或被新设备接管时仍保留在本机（便于后续作为可信旧设备）；证书最长 **5 年**、链深最多 **8 层**。 |
| **授权快照签名种子** | 服务端配置（开源镜像内置公开默认种子）。 | 可由私有部署替换为自用种子。[授权签名密钥](/reference/authorization-keys) |
| **授权快照与撤销缓存** | 客户端每 20 秒带随机挑战刷新一次快照，本机记录最高历史前缀与撤销墓碑。 | 每次请求从发起起最长有效 **60 秒**；撤销记录在授权库中永久不可删改。 |
| **MLS Ed25519 身份私钥** | 仅存于客户端原生上下文内存，绑定当次入房 `entry_id`。 | 随当次入房生命周期销毁，每轮重新生成 `KeyPackage`。 |
| **MLS 群组秘密与发送者密钥** | 仅存于客户端原生内存，绝不持久化。 | 例行平滑轮换期间短暂保留新旧两槽，切换 +1 秒后用随机材料覆盖退役；异常/离房立即清理。 |
| **附件文件密钥** | 发送端为每个文件随机生成的 256 位密钥，随加密描述发往在线接收者。 | 仅存于本次入房的可撤销 `AttachmentLease` 内存中，离房或清缓存立即销毁。 |

> [!NOTE] 不同平台的本地身份库与后台行为差异
> - **Windows** 将设备私钥、证书和检查点以当前用户 DPAPI 加密保存于 `identities.v5`。[Vault 源码](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/windows/engine/vault_windows.go)
> - **Android** 使用 Android Keystore 密钥保护身份库与进行中的浏览器授权状态；若从系统最近任务中强行划掉应用进程，通话与内存 Bearer 会立即销毁，下次打开在有效 20 小时恢复窗口内通过 `BIOMETRIC_STRONG` 解锁并经设备签名恢复（主动退出或无恢复记录时需重新 Passkey 登录）。[IdentityVault 源码](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/android/app/src/main/kotlin/cn/youzifeile/chirp/data/IdentityVault.kt) · [BiometricLoginVault 源码](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/android/app/src/main/kotlin/cn/youzifeile/chirp/data/BiometricLoginVault.kt)
> - **Android APK 签名说明**：开源版 Android 签名密钥库随源码公开，因此任何持有源码的人都能签出相同指纹的 APK，安装包来源仍需通过可信分发渠道核实。[Android 签名详情](/development/clients#android-发布签名与验证)

## 设备身份、配对与 SAS 互认机制

<DeviceTrustTreeDiagram />

Chirp V5（协议标识 `chirp-mls-authenticated-v5`）彻底移除了早期的“房主白名单策略”，所有房间均采用去中心化的客户端共同验证模式：Swift/Kotlin/Go 与原生 Rust 密码库会独立校验每位参与者的设备证书链、精确入房绑定、MLS 公钥以及全员确认签名，**客户端绝不盲信服务端下发的 `ready` 或“已信任”状态标记**。

### 1. 首次绑定账号根身份

账号获批并通过 Passkey 认证后，客户端拿到 5 分钟的设置授权。首台设备在本地生成账号根与候选设备密钥，完成 `.chirpkey` 加密导出并让用户等待 5 秒确认后，签署一次绑定候选设备的一次性挑战。服务端在同一写事务中复核资格、验证证书链与持钥证明，首次绑定账号根公钥并激活登录。若同一时间并发发起多次首绑请求，仅首个写入事务会胜出；若网络丢包丢失响应，客户端重新认证后会复用原候选材料继续激活，避免丢失刚刚导出的根密钥。[身份设置源码](https://github.com/YouZiFeiLe/Chirp/blob/main/internal/store/identity_setup.go)

### 2. 新设备二维码配对（`chirp-device-pair-v1`）

当用户通过已授权的旧设备批准新设备加入时，双方执行一套防中间人篡改的签名配对协议：

1. **请求与承诺**：新设备生成一份带自己签名的配对请求（内含规范 Origin、账号 ID、预期根公钥、候选设备公钥、随机 nonce、有效期以及提前固定的 SAS 承诺值），并将其编码进二维码（有效期最多 **5 分钟**，同时受本次设置授权截止时间约束）。
2. **中转不可替换与幂等**：服务端短期中转存储采用独立摘要空间（全局最多 512 项活动配对，每账号最多 3 项）。每次请求与回复均带有对请求摘要、操作阶段、签发设备指纹及完整负载的签名，首次 Offer 固定后禁止替换，丢包重试具有幂等性。
3. **相机扫码或图片导入**：旧设备支持摄像头直扫，或从本地导入导出的二维码图片（支持单帧图片 ≤ 8 MiB、单边 ≤ 4096 像素；Android / Windows 使用 ZXing，Apple 使用 Vision 并以 Core Image 兜底）。
   - **图片导入防钓鱼**：导入二维码图片时，旧设备会隐藏自己算出的安全码，要求用户手动输入新设备当前屏幕显示的全部 3 组安全码（连续错 3 次立即终止配对）。
4. **独立核验与安全接管**：双方通过 vodozemac 各自验证不同角色的身份 MAC，旧设备确认系统指纹/面容解锁后才会签发新设备证书。**批准动作只颁发证书，不踢掉旧设备**；直到新设备下载证书并完成持钥证明激活登录，旧会话才会下线。即便某个旧设备此前曾被踢下线，只要它未被撤销，依然可以参与配对；而被撤销的设备无权签发任何证书。[配对协议](https://github.com/YouZiFeiLe/Chirp/blob/main/internal/identity/device_pairing.go) · [客户端配对状态机](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/apple/Shared/DevicePairingSession.swift)

::: info 证书链与独立撤销原则
设备证书链最多允许 **8 层**嵌套签发，单张证书最长有效 **5 年**。每台已登记设备的撤销状态**相互独立**：撤销某台祖先设备后，它会永久无法签发新设备，但**不会**连带撤销它此前已经合法签发过的后代设备；而使用 `.chirpkey` 恢复文件只能为账号登记一台**全新**设备，绝不会复活已被撤销的旧设备或被封禁的账号。
:::

### 3. 房间内好友设备互认与 SAS 核验

在房间内，SAS 原生状态机基于 [vodozemac](https://docs.rs/vodozemac/0.11.2/vodozemac/sas/) 的 [X25519](https://datatracker.ietf.org/doc/html/rfc7748) / HKDF / MAC 实现，将承诺值、房间 ID、双方当次 `entry_id` 以及双方的账号根与设备公钥全部纳入 MAC 绑定。任何协议乱序、超时、重放或 MAC 不匹配都会立刻中止核验。[SAS 状态机源码](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/apple/MLS/native/src/security.rs)

- **只有「设备信任」才授予解密权**：单向添加好友只影响好友列表展示，不构成密码学信任；成员昵称也只是显示标签，未核验设备即使显示相同昵称也会被标出「待核验」。
- **未核验即全房锁定**：只要房内存在任何尚未完成双向互认的设备，整个房间立即暂停语音、文字、附件与 `Welcome` 分发，直到全员互认、授权新鲜度校验及密钥确认全部通过后才开放内容传输。

### 4. 授权快照新鲜度与撤销同步

客户端每隔 **20 秒**携带随机挑战向 `/authorization/v5/snapshot` 请求最新历史快照，每份有效响应从**发起请求的连续时钟**（`ContinuousClock`）起最多有效 **60 秒**。服务端会同时核对业务黑名单与永久授权撤销：

- 若无法及时获取新的有效签名快照，客户端在 60 秒期满后立即停止内容发送（断网或系统休眠耗尽的时间同样计入 60 秒）。
- 已知的历史检查点与撤销墓碑会在本机持久化保存，**绝不允许用空项或更早版本号的响应覆盖已经见过的历史记录**。
- 在业务黑名单拉取策略上：Apple 与 Windows 在有效快照基础上尝试更新黑名单（普通拉取失败仍严格执行本机已记住的撤销）；Android 则要求快照验签与黑名单同步均成功后才刷新授权截止时间。[Apple 社交身份](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/apple/Shared/SocialIdentity.swift) · [Windows 授权校验](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/windows/engine/authority_windows.go) · [Android 账号身份](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/android/app/src/main/kotlin/cn/youzifeile/chirp/data/AccountIdentity.kt)

## 群组配钥、门控与平滑换钥

<GroupStateMachineDiagram />

### 1. 房间群组建立流程

每个房间独立维护群组会话。当人员进出、重连或发生故障恢复时，整个房间会推进一个新的会话代次（`room_id/server_id/session_id/generation`）；在成员稳定的情况下，例行周期轮换则使用独立的密钥代次（`.../key/{key_epoch}`）。

1. **生成临时身份与提交入房绑定**：客户端生成临时 MLS Ed25519 密钥，提交由本机设备私钥签署的入房绑定，以及有效期 120 秒的新 `KeyPackage`（标准套件固定为 `MLS_128_DHKEMX25519_AES128GCM_SHA256_Ed25519`）。
2. **四阶段协商**：协调器按 `collecting → welcoming → confirming → ready` 推进，由发起者批量打包成员 `Add` 提案并分发加密 `Welcome`。
3. **验证名单与导出媒体密钥**：每个客户端独立校验证书套件、群组 ID、完整成员名单与公钥绑定，并计算相同的 `epoch authenticator`。随后使用标签 `Chirp LiveKit sender key v5` 从 MLS Exporter 导出每位发送者独立的 **32 字节**媒体密钥，安装好加密器后再向服务端提交确认。
4. **请求签名与预算**：所有 `/v1/group/` 的 `action` 和 `events` 请求都必须携带 `X-Chirp-Time`、`X-Chirp-Nonce`、`X-Chirp-Key` 与针对精确路径和正文 SHA-256 的 `X-Chirp-Signature`（签名域 `Chirp group request v5`），防止中间人重放或篡改指令。[动作校验源码](https://github.com/YouZiFeiLe/Chirp/blob/main/internal/group/action.go)

### 2. 心跳与 3 秒媒体发送许可

- **心跳不等于授权**：客户端默认每 **2 秒**发送一次心跳（超过 **6 秒**无心跳即被移出，配钥转换超时保护为 **12 秒**）。若房间正在等待人工核对安全码，服务端会保留仅交换控制信息的成员会话而不会误触发配钥超时。
- **3 秒连续时钟许可**：群组就绪后，客户端大约每秒申请一次媒体发送许可（Lease），单次有效期最长 **3 秒**，同样按发起请求时的本机单调连续时钟计时。只要登录仍有效，许可过期后客户端只会暂停发送、退役旧媒体密钥并触发新一轮配钥，不会直接踢出房间；后台清理任务也会持续核对数据库入房资格并清理失权 LiveKit 连接。[媒体会话清理](https://github.com/YouZiFeiLe/Chirp/blob/main/internal/httpapi/sessions.go)

### 3. 双槽平滑换钥（Smooth Rotation）

服务端默认每 **60 秒**触发一次例行密钥轮换；为防止长周期配置或服务端异常导致旧密钥超龄，客户端还会独立执行硬性兜底：**本地密钥年龄满 90 秒时主动发起重建，满 120 秒则强制停发退役**（不受服务端配置干扰）。

当所有在场成员都在签名入组请求中声明支持 `smooth_rotation` 能力时，换钥过程全程不断麦：

- **提前预装**：服务端在轮换点前 `min(12 秒, 轮换间隔 / 2)` 开启候选轮，并通过 `rotation_revision` 通知各端在隔离的原生存储中生成候选密钥。客户端校验成员集合完全一致后，将新密钥**预装到备用槽位**（LiveKit 提供器使用 2 个槽位，自动棘轮窗口设为 0，并禁用 SIF 明文绕过），随后提交确认。
- **零中断切换**：到达轮换点且全员确认后，服务端进入 `switching`。各客户端将发送槽索引切换至新槽并报告 `activation`，期间**无需重建 RTP 加密器，也不会重置帧计数器或中断音频采集**。旧接收槽会额外保留 **1 秒**以兼容网络在途旧帧，随后用安全随机材料彻底覆盖擦除。
- **安全回退与租约截短**：准备与切换最晚不能超过轮换点后一个许可周期（默认 3 秒），期间发放的租约也会截短至此截止点。一旦候选轮超时、或准备期间发生任何成员变动，系统立刻作废候选轮并改走「暂停重建」，**绝不把已发给旧名单的候选密钥用于新成员名单**。
- **房间公开时间提示**：客户端界面展示的倒计时与最近换钥时间来自 `room_information` 元数据（`update_reason` 依次标识 `initial_connection`、`members_changed`、`scheduled_rotation` 或 `connection_recovery`，仅作展示参考），任何加密门控依然以客户端独立校验的密钥年龄、媒体租约与互认状态为准。[公开时间源码](https://github.com/YouZiFeiLe/Chirp/blob/main/internal/group/public_info.go)

### 4. 本地麦克风意图与聊天数据门控

- 客户端应用补丁会拦截来自远端信令的「强制取消静音」指令，服务端永远无法绕过本地门控悄悄开启用户的麦克风。[本地意图补丁](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/apple/Patches/livekit-local-microphone-intent.patch)
- 文字聊天与附件描述通过专用的加密可靠数据通道发送，出队交给底层 WebRTC 前会最后一次复核租约期限、任务取消状态与加密提供器是否退役；任何门控失败都直接中止发送，**绝不退回明文传输**。收到消息的接收端同样会校验 AES-GCM 标签、发送者、群组 ID、单调序列与长度限制。[RoomChat](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/apple/Shared/RoomChat.swift) · [加密聊天补丁](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/apple/Patches/livekit-ephemeral-chat.patch)

## 房间密码与网络传输限制

- **房间密码机制**：房间密码仅用于服务端准入校验，**不参与内容加密**。服务端保存 16 字节随机盐和 Argon2id verifier（2 次迭代、19 MiB 内存、并行度 1、输出 32 字节），并在写锁之外限流并发计算，正式入房时在事务内再次核对密码版本。[密码验证源码](https://github.com/YouZiFeiLe/Chirp/blob/main/internal/store/room_password.go)
- **拒绝外部 STUN / TURN 与 P2P**：所有媒体流量一律经由自有 LiveKit SFU 的 `7882/UDP` 转发。除了服务端禁用 TURN、TCP 回退和外部公网 IP 探测外，各端 SDK 补丁还会在连接、加入和重连阶段清空所有外部 ICE 服务器列表，确保不会向第三方 STUN 服务器泄露连接信息。

## 安全能力与接受的风险边界

| 维度 | 当前提供与保障的能力 | 明确不保障的边界（接受的风险） |
| --- | --- | --- |
| **内容机密性** | 服务端与转发网络无法获取媒体、聊天或文件密钥；未核验设备绝不放行。 | 若某个终端设备自身被木马攻陷、用户与中间人错误核对了 SAS 安全码，或已授权参与者恶意录屏/录音，端到端加密无法阻止明文外泄。 |
| **元数据保护** | 不在服务端存储聊天原文和文件名。 | 服务端依然能观察到账号成员、所在房间、公网 IP、在线时长、媒体包大小及流量模式（不提供元数据匿名化）。 |
| **密钥前向与历史** | 会话期间例行 60 秒换钥，客户端强制 120 秒淘汰；退役槽位与秘密从原生内存擦除。 | 不提供逐帧棘轮前向保密；受限于操作系统与 WebRTC C++ 队列调度，已经进入网络/播放队列的在途帧无法追回，内存清理也不构成取证级擦除保证。 |
| **撤销实时性** | 客户端可在本地验证已知历史前缀并阻止倒退；撤销生效最迟受 60 秒快照窗口制约。 | 首次获知某次新撤销依赖授权服务返回最新快照。使用开源默认种子时可验证公开身份，需独占授权签发权请替换自有种子。[授权签名密钥](/reference/authorization-keys) |
