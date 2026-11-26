# 客户端日志格式规范（.chirplog v1）

`.chirplog` 是 Chirp 客户端生成的本地诊断数据库文件，本质上是一个标准的 **SQLite 3** 单文件库。macOS、iOS、Android 与 Windows 四个平台采用完全一致的英文表结构、事件枚举与脱敏白名单——开发者或支持人员可以用同一条 SQL 查询语句直接分析任意平台导出的日志报告。

::: info 按客户端安装实例隔离，绝不自动上传
诊断开关和日志分片属于当前客户端安装本身，切换服务器或切换登录账号均沿用同一开关与保留策略。客户端**没有任何自动上传日志的通道**，仅在用户主动点击「导出日志」时生成最近 24 小时的脱敏文件交由用户自行保存分享。
:::

<ChirpLogDiagram />

## 开关行为与生命周期

- **默认关闭**：首次安装客户端时诊断日志处于关闭状态。在「登录前」和「登录后」的设置页均可找到「日志管理」入口，方便在登录受阻时先打开日志再复现问题。
- **开启与关闭**：开启后立即开始写入用户操作与通话诊断（通话质量监测与解密恢复本身始终独立运行，不受日志开关影响）。关闭后停止接收新事件，等待队列中已发生的事件写完，已有文件继续按 24 小时自然过期；关闭期间仍可以导出或清除历史日志。
- **导出与清除**：「导出日志」会截取当前时间往前推 24 小时的闭区间事件，合并输出为一个独立的 `.chirplog` 文件（若没有事件则提示空状态）；「清除日志」清空本机分片、写入缓冲与导出暂存，但**保留**当前的开关状态；登录页的「清空本地数据」则会连同日志一起清空并将开关恢复为默认关闭。

## 小时分片与 24 小时滑动清理

- **UTC 小时分片命名**：每个本机分片是一个独立的 SQLite 3 数据库，文件名为 `<UTC小时序号>.chirplog`（其中小时序号等于 `Unix 毫秒时间戳 / 3600000` 取整）。统一使用 UTC 小时分片可彻底规避本地时区变更、夏令时或跨午夜带来的归档混乱。
- **各平台本地存储位置**（均排除系统云备份）：
  - **Apple（macOS / iOS）**：`Application Support/Chirp/ClientLogs/`
  - **Android**：`noBackupFilesDir/ClientLogs/`
  - **Windows**：传给 Go 协议子进程缓存目录下的 `ClientLogs/`
- **滑动清理边界**：保留基准线为 `cutoff = now_ms - 86400000`（严格 24 小时）。整点早于该边界的分片直接整文件删除；跨越边界的那个小时分片则按行删除 `time_ms < cutoff` 的过期记录（开启 `PRAGMA secure_delete=ON` 确保底层页覆写清除），删空后顺带移除空文件。该清理在启动、运行及导出前均会执行（即使日志开关已关闭）。

## SQLite 文件标记与 12 张固定数据表

所有分片和导出文件都必须带有以下标准 SQLite 文件头标识（切勿仅凭 `.chirplog` 扩展名判断版本）：[SQLite PRAGMA 参考](https://www.sqlite.org/pragma.html#pragma_application_id)

| 标识项 | v1 标准值 |
| --- | --- |
| SQLite 文件头 | `SQLite format 3\0` |
| `PRAGMA application_id` | `1128813136`（Hex `0x43485250`，ASCII `CHRP`） |
| `PRAGMA user_version` | `1` |
| 导出文件扩展名 / Apple UTI | `.chirplog` · `cn.youzifeile.chirp.log`（`public.data`） |

每个 v1 文件都会预先创建以下 **12 张表**（即便某类没有记录也会保留空表），所有平台共享统一的英文表名、列名和字段单位：

| 表名 | 记录内容范围 | 典型事件名（`event`）示例 |
| --- | --- | --- |
| `application` | 应用生命周期、运行环境、写入溢出警告 | `launch`、`active`、`background`、`storageOverflow` |
| `navigation` | 打开页面、切换视图、查看/收起详情 | `room`、`roomChat`、`friends`、`settings`、`logSettings` |
| `account` | Passkey 浏览器/扫码登录、登出、个人资料 | `browserLogin`、`phoneLogin`、`loginAccepted`、`sessionEnded`、`logout` |
| `identity` | 设备授权、`.chirpkey` 恢复、SAS 核验与好友变更 | `approveDevice`、`verifyBackup`、`verificationMismatch`、`removeFriend` |
| `network` | 核心 HTTP/SSE 请求的操作名、响应码、耗时与重试 | `preflight`、`groupHeartbeat`、`mediaLease`、`rotationActivate`、`eventStreamEnded` |
| `room` | 房间操作与进出尝试 | `join` |
| `call` | 通话生命周期转换、音轨质量与网络统计 | `lifecycle`、`trackSample` |
| `audio` | 输入输出设备切换、VAD 门控与音频处理器状态 | `selectInput`、`preferOutput`、`captureInitialized`、`changeActivationThreshold` |
| `crypto` | 媒体语音帧、附件及缩略图的加解密耗时统计 | `voiceDecrypt`、`attachmentDecrypt`、`thumbnailEncrypt` |
| `chat` | 聊天草稿操作、失败消息恢复与文字收发 | `compose`、`restoreDraft`、`sendMessage`、`receiveAttachment` |
| `attachment` | 文件选择、上传、暂停/取消、重试、预览与导出 | `selectFile`、`upload`、`retryUpload`、`previewAttachment`、`exportAttachment` |
| `settings` | 偏好设置变更、清理缓存与日志开关管理 | `confirmServer`、`changeLanguage`、`recordingEnabled`、`recordingDisabled`、`exportLogs` |

12 张表采用完全相同的列定义与 `<表名>_time` 索引（以下以 `call` 表为例）：

```sql
CREATE TABLE call (
    time_ms INTEGER NOT NULL,
    event TEXT NOT NULL,
    outcome TEXT,
    error_code TEXT,
    duration_us INTEGER,
    http_status INTEGER,
    details TEXT,
    segment TEXT NOT NULL,
    seq INTEGER NOT NULL
);
CREATE INDEX call_time ON call(time_ms);
```

| 列名 | 写入语义与约定 |
| --- | --- |
| `time_ms` | UTC Unix 毫秒时间戳（操作发生或计时完成时刻），清理和导出时间窗均以此列为准。 |
| `event` | 源码定义的稳定英文操作名，不受用户选择的界面语言影响。 |
| `outcome` | 可空。枚举值：`started`、`succeeded`、`failed`、`cancelled`（无结果动作如页面跳转填 `NULL`）。 |
| `error_code` | 可空。仅记录客户端已知标准错误码；未识别服务端错误码统一归为 `CLIENT_UNKNOWN_SERVER_ERROR`；用户主动取消记为 `outcome=cancelled` 且此列为空。 |
| `duration_us` | 可空。基于单调时钟测量的耗时（微秒），网络请求包含本地排队与传输全过程。 |
| `http_status` | 可空。HTTP 响应整数状态码。 |
| `details` | 可空。严格受白名单约束的 UTF-8 JSON 对象（缺失的可选数值指标直接省略字段，绝不填零充数）。 |
| `segment` | 每次进程启动、重开日志或清空日志后新生成的随机 UUID，与账号、设备或密钥无任何映射。 |
| `seq` | 当前 `segment` 内跨全表共享的单调递增正整数（从 `1` 开始），用于精确还原同一毫秒内的事件先后顺序。 |

## 通话性能指标与严格脱敏铁律

### 通话生命周期与音轨采样

- **`call.lifecycle`**：`details` 包含 `event`、`phase`、`sequence`、`elapsedMilliseconds`（单调时钟相对耗时，可用于精确测量 `authorizationStarted` 到 `activated` 的入房总耗时）、`transportGeneration`、`keyRevision`，以及可选的 `failure` 和 `audio`（只含 `microphoneMuted`、`listening`、`preset`、`route`）。每条生命周期转换都会实时落盘，避免长通话结束后丢失早期记录。
- **`call.trackSample`**：`details` 包含 `schema=1`、`phase`、`microphoneMuted`、`listening`、`audioInterrupted`、`route`、`preset`、`mediaLeaseValid`、可选 `mediaLeaseRemainingMS` 以及 `tracks` 数组（远端麦克风轨道仅使用样本内局部递增序号 `number`，不含任何成员身份标识）：
  - `muted`、`subscribed`、`subscriptionFailed`（布尔值）
  - `encryption`：`waiting`、`verified`、`missingKey`、`decryptionFailed`、`failed`
  - `quality`：`unknown`、`excellent`、`good`、`poor`、`lost`
  - `packetsReceived`、`packetsLost`：SDK 累计包数（缺失则省略）
  - `jitterMS`、`roundTripMS`：毫秒（取选中 ICE 候选对 RTT，过滤负数/非有限数，Apple 端上限封顶 `600000` ms）
  - `lastDecryptionEventAgeMS`：距最近一次成功解密状态事件的毫秒数
- **`crypto.voiceDecrypt`**：直接测量有效播放音频帧构造密封数据并完成 AES-GCM 解密的耗时（重复帧、无效帧与无许可帧不计入）。以聚合窗口形式输出 `frames`、`total_ns` 与 `max_ns`（约每秒统计一次计数，状态稳定时每 5 秒落盘一次样本，避免逐帧写库拖垮实时音频线程）。恢复文件与附件加解密则分别记录 `recoveryEncrypt`/`recoveryDecrypt` 及事件行的 `duration_us`。

::: danger 严格的隐私脱敏白名单
Chirp 在初始化媒体引擎前会主动关闭 LiveKit SDK 的默认通用日志，日志写入器采用**绝对白名单机制**：严禁序列化任何完整请求体、异常堆栈、SDK 原始统计模型或业务对象。日志中**绝对不会出现**账号 ID、房间 ID、消息 ID、昵称、设备名、公钥指纹、服务器 URL/IP、文件路径、聊天文本、图片、音频、密码、令牌、恢复材料或任何密钥。
:::

## 后台写入、单文件导出与 SQL 分析示例

1. **串行后台与代次隔离**：所有事件在调用线程读完时间戳与开关后入队，由单一后台队列按小时分片批量提交（Apple 约每 64 条或 400 ms 刷盘一次，切后台或正常退出时冲刷缓冲）。若磁盘长时间不可写，队列受内存上限约束并在恢复后写入一条 `application.storageOverflow` 记录丢弃条数。每次关闭或清空日志都会递增内存代次，使延迟到达的旧异步写任务自动作废。
2. **单文件导出机制**：导出时先冲刷队列并锁定一个快照时刻 `now_ms`，创建同 schema 的空主库，通过 SQLite 的 `ATTACH DATABASE` 依次挂载最近 24 小时范围内的分片，将 12 张表中满足 `[cutoff, now_ms]` 的记录拷入主库后断开挂载（使用回滚日志模式，确保导出的 `.chirplog` 是**完全自包含的单文件**，无需附带 WAL/SHM）。[SQLite ATTACH 文档](https://www.sqlite.org/lang_attach.html)
3. **各端写入实现**：[Apple 数据库](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/apple/Shared/ChirpLogStore.swift) · [Android 数据库](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/android/app/src/main/kotlin/cn/youzifeile/chirp/data/ChirpLogStore.kt) · [Windows 写入器](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/windows/engine/client_log_windows.go)

### 使用 `sqlite3` 只读查询导出的报告

使用系统自带的 `sqlite3` 命令行以只读模式打开导出文件并校验头标识（v1 应依次输出 `1128813136` 与 `1`）：

```sh
sqlite3 -readonly '报告.chirplog' 'PRAGMA application_id; PRAGMA user_version;'
```

运行以下跨端通用的 SQL 查询，即可直接算出整份导出窗口内所有语音帧解密的平均耗时与峰值耗时（单位：微秒）：

```sql
SELECT sum(json_extract(details, '$.frames')) AS frames,
       sum(json_extract(details, '$.total_ns')) /
         (1000.0 * nullif(sum(json_extract(details, '$.frames')), 0)) AS mean_us,
       max(json_extract(details, '$.max_ns')) / 1000.0 AS max_us
FROM crypto WHERE event = 'voiceDecrypt';
```

移植或校验各端单位换算时，可在空库中插入以下两条标准合成样本——上方 SQL 必须返回 `3` 帧、`mean_us = 50.0`、`max_us = 70.0`：

```sql
INSERT INTO crypto (time_ms, event, details, segment, seq) VALUES
(1800000000000, 'voiceDecrypt', '{"frames":2,"total_ns":80000,"max_ns":50000}',
 '51dd4149-46fa-432e-bb84-bab6d005e39c', 1),
(1800000001000, 'voiceDecrypt', '{"frames":1,"total_ns":70000,"max_ns":70000}',
 '51dd4149-46fa-432e-bb84-bab6d005e39c', 2);
```
