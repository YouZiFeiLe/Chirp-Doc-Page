# 附件传输与缓存

Chirp 附件协议（v3）采用「**加密控制面传递密钥 + HTTPS 分块传输密文**」的分离架构：发送端在本机用随机生成的 32 字节文件密钥以 [AES-256-GCM](https://csrc.nist.gov/pubs/sp/800/38/d/final)（记录格式 v1）将文件加密后上传至服务端暂存，文件密钥与文件名、缩略图等元信息**只通过端到端加密的房间数据通道发给当前在线的接收者**，服务端本身永远看不到明文文件名、缩略图或文件密钥。[服务端附件存储源码](https://github.com/YouZiFeiLe/Chirp/blob/main/internal/store/attachments.go)

Apple、Android 与 Windows 严格遵循完全一致的密文记录格式、分块接口与回执协议（Apple 基于 CryptoKit 与 URLSession，Android 基于系统文件选择器，Windows 由 WinUI 选文件并交由 Go 协议子进程处理缓存与上传下载）。[Apple 加密实现](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/apple/Shared/AttachmentCrypto.swift) · [Android 加密实现](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/android/app/src/main/kotlin/cn/youzifeile/chirp/data/AttachmentCrypto.kt) · [Windows 文件处理](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/windows/engine/files_windows.go)

<AttachmentLifecycleDiagram />

## 端到端传输与在线资格判定

### 完整发送与接收四步曲

发送者必须具备当前有效的入房资格并等待房间安全群组就绪：

1. **本机全量加密**：发送端为本次附件生成随机 32 字节密钥，按 256 KiB 明文切片执行 AES-256-GCM 加密并计算完整密文 SHA-256。
2. **预留对象并锁定名单**：发送端向服务端发起预留请求，服务端捕获当前**已建立附件事件流（SSE）的在线房内成员**（含处于 6 秒重连宽限期内的连接）作为本次投递的固定接收集合，离线或晚到的成员会被标记为 `skipped`。
3. **群组广播加密描述**：发送端通过加密聊天数据通道向本轮群组成员广播文件描述（内含文件名、类型、大小、完整密文摘要、随机文件密钥和可选加密缩略图）。群组批发送每批最多 8 个目标身份、单包上限 12 KiB；**绝不会把文件密钥写入服务端事件、列表或数据库**。
4. **顺序上传并提交完成**：发送端按 1 MiB 网络块顺序上传密文并显式提交 `/complete`。只有上传全部验证完成后，服务端才向在线原接收者开放下载。

### 为什么离房或断线超过 6 秒无法补收？

- **严格绑定当次入房与在线事件流**：接收端必须在入房后、接收首个附件描述前建立 `GET /events` 长连接（服务端每 2 秒发送一次保活）。服务端一旦观测到该事件连接断开，只保留 **6 秒重连宽限**（从服务端感知连接断开时起算；物理断网还需等待底层 TCP 探测超时）。
- **宽限超时永久跳过**：一旦超过 6 秒仍未重连，或入房授权失效，该接收者的所有 `pending` 投递会被永久标为 `skipped`——**即便用同一个 `entry_id` 重新连上也无法补收旧文件**，但可以正常接收之后新发的文件。
- **并发队列与手动暂停**：收到描述时接收端只先记下密钥和缩略图，待上传彻底完成后自动排队下载（默认并发限制为最多 1 个上传任务、1 个自动下载任务，加上用户手动触发共最多 2 个下载任务）。用户手动暂停的任务不会被后续服务端状态通知自动重启，但允许在投递有效期内点击继续。
- **平滑换钥不扩大名单**：群组发生例行密钥轮换时，正在传输的文件按原锁定接收者继续完成，**绝不会通过新群组向新加入的成员重发旧文件密钥**；若群组安全连接未就绪，则会暂时挂起传输。

## HTTPS 传输接口 {#https-接口}

所有附件接口均以 `/v1/rooms/{room}/attachments` 为前缀，**每次请求都必须携带 `Authorization: Bearer <credential>` 和 `X-Chirp-Entry: <entry_id>`**。创建对象时请求体内的 `entry_id` 也必须与请求头完全一致（否则返回 `404 ATTACHMENT_UNAVAILABLE`）。

| 接口路径 | 请求要求与行为说明 |
| --- | --- |
| `POST`（根路径） | 严格 JSON 提交 `id`（16 字节随机小写 Hex）、`entry_id`、`ciphertext_size`、`ciphertext_sha256`（32 字节 SHA-256 小写 Hex）和 `recipients`（最多 256 个精确身份）。成功返回 `201`。 |
| `GET`（根路径） | 返回当前入房可见的附件对象列表、`server_id` 与目录 `revision`。 |
| `GET /events` | 建立附件在线 SSE 连接。收到含 `server_id`、`room_id`、`revision` 的 `state` 事件后重读列表。每个 `entry_id` 仅保留最新的一条 SSE 连接。 |
| `GET /{id}` | 查询单个对象的状态、已上传进度与各分块摘要（`chunk_sha256`）。 |
| `PUT /{id}/chunks/{index}` | 按从 `0` 开始的顺序上传 1 MiB 网络块（`Content-Type: application/octet-stream` 及精确 `Content-Length`，尾块按实际长度）。首次提交或同内容幂等重试返回 `204`。 |
| `GET /{id}/chunks/{index}` | 上传完成后按块下载密文。服务端在响应过程中**每读取至多 64 KiB 便重新核验一次入房、接收资格与在线状态**。 |
| `POST /{id}/pause` | 上传者主动暂停未完成对象（空正文、无查询参数）。 |
| `POST /{id}/cancel` | 上传者取消未完成对象（空正文、无查询参数）。 |
| `POST /{id}/complete` | 空正文。服务端核验全部网络块与完整密文 SHA-256 一致后切换为 `completed`。 |
| `POST /{id}/received` | 提交严格 JSON `{"ciphertext_sha256": "..."}`。接收者**必须在本机完成写盘、完整哈希校验及逐记录 AEAD 解密认证后**才可调用（支持幂等重试）。 |

::: info 状态裁决与常见状态码
- 对象的 JSON 表示中固定带有 `protocol_version=3` 和 `chunk_bytes=1048576`。
- 最后一个 `pending` 接收者提交 `received` 或退出投递后，对象进入 `delivered`，服务端立即删除磁盘密文并保留少量状态记录 5 分钟供客户端回执重试。发送者在预留时即自动标记为 `received`，不能代其他接收者确认。
- 若下载过早会返回 `409 ATTACHMENT_PENDING`；跳过块号或用不同内容重传同一块返回 `409 ATTACHMENT_CONFLICT`；配额耗尽返回 `413 ATTACHMENT_QUOTA`；并发繁忙返回 `429 ATTACHMENT_BUSY`（附带 `Retry-After: 1`）。[HTTP 传输源码](https://github.com/YouZiFeiLe/Chirp/blob/main/internal/httpapi/attachments.go) · [投递状态源码](https://github.com/YouZiFeiLe/Chirp/blob/main/internal/store/attachment_delivery.go)
:::

## 生命周期、配额与智能限速 {#状态有效期与配额}

### 对象状态定义

| 状态 | 含义说明 |
| --- | --- |
| `reserved` | 已在服务端预留元信息并锁定名单，尚未提交任何网络块。 |
| `uploading` | 至少已提交一个网络块，正在继续传输。 |
| `paused` | 上传者显式暂停，或预留/上传连续 **30 秒**未收到新数据块自动进入暂停。 |
| `completed` | 全部密文校验通过，正开放给 `pending` 接收者下载。 |
| `delivered` | 已无任何待接收者，服务端密文已删除（客户端已接收的本地副本不受影响）。 |
| `cancelled` | 上传被取消，或上传者的入房 `entry_id` 已失效。 |
| `expired` | 超出上传或分发时间窗口，终止传输并等待清理。 |

### 时间窗口、配额与限速策略

- **时间窗口**：未完成上传的对象自创建起最多保留 **15 分钟**（重传不续期）；完整上传后最多再保留 **15 分钟**分发窗口。进入终态（`delivered`、`cancelled`、`expired`）且不再需要幂等保留后满 **5 分钟**清除管理记录（后台每秒巡检在线状态，每分钟清理过期记录与孤立文件）。[状态回收源码](https://github.com/YouZiFeiLe/Chirp/blob/main/internal/store/attachment_state.go)
- **容量配额**：客户端原始文件上限 **100 MiB**。服务端按密文计费：单对象允许 `16 字节` 至 `100 MiB + 8192 字节`，单房间上限 **512 MiB / 256 个对象**，全局上限 **4 GiB / 4096 个对象**。进入终态后会立即释放字节配额，管理记录清除前仍计入对象数量配额。
- **客户端预览与本地配额**：Apple 每次入房的本地缓存上限为 **512 MiB**（含待下载预留）。可预览图片限制在 **20 MiB / 6000 万像素**以内，缩略图最长边 **256 px**（密文不超过 6 KiB），大图预览最长边 **2048 px**，GIF 仅首帧预览而导出保留原文件。[图像处理](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/apple/Shared/AttachmentImages.swift)
- **语音优先限速**：客户端单方向正常限速 **8 MiB/s**，在音轨质量差（`poor`）或网络抖动达到 **40 ms** 时自动降速至 **512 KiB/s**（单独高 RTT 不触发降速），重连或音轨丢失期间暂停传输。单次网络请求最多重试 4 次，续传前均校验前缀摘要。

## 加密记录格式（v1）与硬盘暂存安全

### AES-256-GCM 独立记录规范

附件密文加密块（256 KiB）与 HTTPS 网络传输块（1 MiB）完全解耦：

- **记录切片**：每 **256 KiB** 明文构成一条独立加密记录（即使 0 字节空文件也会生成一条认证记录），每条末尾附带 16 字节 GCM 认证标签。
- **Nonce 与 AAD 绑定**：每条记录的 12 字节 Nonce 由 `4 个零字节 + 64 位大端记录序号` 组成。附加认证数据（AAD）采用 UTF-8 换行格式 `Chirp attachment AES256GCM v1`，严格绑定**房间 ID、精确发送身份、对象 ID、明文总长度、总记录数与当前记录位置**——配合加密描述中的完整密文 SHA-256，彻底杜绝篡改、截断、换块或拼接攻击。
- **缩略图密钥派生**：缩略图通过 `HKDF-SHA256` 从文件主密钥派生独立子密钥（`salt = 文件 ID`，`info = "Chirp attachment thumbnail v1"`），采用随机 Nonce 的 GCM Combined 格式与 `index = -1` 的 AAD。

### 服务端暂存与客户端本地清理

- **服务端文件隔离**：`CHIRP_ATTACHMENT_PATH` 必须指向专用独立目录（拒绝符号链接，并校验绝不与业务库、授权库或签名密钥共用目录），内部通过 `os.Root` 限制路径越界，全局并发限制 16 个分块句柄，同文件顺序写并 `fsync` 落盘后再提交 SQLite 块摘要。服务端重启会结束所有旧连接，将遗留 `pending` 标为 `skipped`，取消未完成上传并清理磁盘孤立密文（已成功落盘验签的客户端本地副本仍可正常查看和导出）。
- **客户端缓存退役顺序**：Apple 在 `Caches/ChirpRoomAttachments`、Android 在 `chirp-attachments`、Windows 在应用数据 `session-*` 目录中仅以密文暂存（排除云备份）。离房、切房、会话失效或用户清空缓存时，客户端**先销毁内存中的 `AttachmentLease` 密钥租约**，再取消所有下载/回执任务、关闭预览并删除密文目录。用户导出文件时直接从校验后的密文解密写入目标路径，不覆盖同名文件，绝不在临时目录落地明文副本。[Apple 缓存](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/apple/Shared/AttachmentCache.swift) · [Android 附件会话](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/android/app/src/main/kotlin/cn/youzifeile/chirp/media/RoomAttachments.kt) · [Windows 附件会话](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/windows/engine/attachment_session_windows.go)
