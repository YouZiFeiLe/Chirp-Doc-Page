# .chirpkey 离线身份恢复文件规范（v1）

`.chirpkey` 是 iOS、macOS、Windows 与 Android 四个平台通用的离线账号根身份备份文件格式。任何设备只要持有这份文件和创建时设定的高强度恢复密码，即可在本机完全离线解密出账号的 Ed25519 根密钥；在向服务器登记新设备时，仍须先在原服务器完成 Passkey 登录认证，再由客户端核对账号 ID 与根公钥一致性。

> [!NOTE] 备份范围边界
> `.chirpkey` 仅封装**当前服务器上的账号 Ed25519 根身份**。它**不包含** Passkey 凭据、旧设备的独立私钥、登录 Bearer、好友信任列表、MLS 会话秘密、房间聊天记录或任何附件文件密钥。[换机与设备恢复操作指南](/guide/devices)

<ChirpKeyLayoutDiagram />

## 文件命名与魔数识别

- **文件扩展名与魔数**：扩展名固定为 **`.chirpkey`**，文件开头的 8 个字节必须为 ASCII 字符串 **`CHIRPKEY`**（Apple UTI 类型标识为 `cn.youzifeile.chirp.chirpkey`）。
- **拒绝已退役旧格式**：四个客户端均严格按文件头魔数验证格式，**一律拒绝**带有早期旧文件头 `CHRIPKEY` 的文件——即使手动把 `.chripkey` 重命名为 `.chirpkey` 也会被拒收；强行篡改文件头字节则会使末尾 GCM 认证标签失效。
- **默认建议文件名**：`<用户名>_<YYYY-MM-DD>_<来源平台>.chirpkey`（例如 `alice_2026-11-21_iOS.chirpkey`，日期取本机日历日期并过滤非法路径字符）。由于默认文件名会暴露用户名和导出时间，用户可以在系统保存面板中自由改名，恢复时客户端仅依赖通过加密认证后的载荷和当前登录会话。

## 密码约束与内存安全

- **密码长度与编码规则**：恢复密码必须包含至少 **16 个 Unicode 标量值**，UTF-8 编码总长不超过 **1024 字节**。创建时需输入两次并按 UTF-8 原始字节精确比对，**完整保留大小写、首尾空白与原始 Unicode 规范形式**（支持粘贴和密码管理器填充）。
- **防离线爆破警告**：拿到 `.chirpkey` 文件的任何人都可以离线反复尝试猜测密码，因此必须引导用户使用足够随机的长密码；服务端与管理员无法帮助找回遗忘的密码。同一份有效备份的所有历史副本始终可由原密码解开，对新副本重新修改密码加密并不能撤销已泄露旧副本中的账号根私钥。
- **极简秘密驻留**：用户密码、Argon2id 派生密钥以及解密得到的账号根种子仅在加解密或激活期间的临时内存中使用，操作结束或失败后立即清理，严禁写入日志、崩溃报告、剪贴板或日常设备密钥库（如 Keychain / DPAPI）。在首次初始化未完成绑定前，客户端只将加密密文与续办状态暂存于排除云备份的私有沙盒目录中。

## 二进制结构定义（v1）

整个文件按顺序由 **54 字节固定头 + `N` 字节 AES-256-GCM 密文 + 16 字节 GCM 认证标签** 组成，文件总长度严格位于 **71 至 65,606 字节**之间。所有多字节整数均为无符号大端序（Big-Endian）：

| 起始偏移 | 字节数 | 字段名 | v1 固定规范或说明 |
| ---: | ---: | --- | --- |
| `0` | `8` | 格式标识（Magic） | ASCII `CHIRPKEY`（Hex: `43 48 49 52 50 4B 45 59`） |
| `8` | `2` | 容器版本 | 固定为 `1` |
| `10` | `2` | 加密套件 | 固定为 `1`（Argon2id + AES-256-GCM） |
| `12` | `4` | Argon2id 内存开销 | 固定为 `65536` KiB（64 MiB） |
| `16` | `4` | Argon2id 迭代次数 | 固定为 `3` |
| `20` | `2` | Argon2id 并行度 | 固定为 `4` |
| `22` | `16` | 盐（Salt） | 每次导出由系统安全随机源（CSPRNG）独立生成 |
| `38` | `12` | GCM Nonce | 每次导出由系统安全随机源独立生成，禁止在同密钥下复用 |
| `50` | `4` | 密文长度 `N` | `1 ≤ N ≤ 65536`，严格等于明文 UTF-8 JSON 字节数 |
| `54` | `N` | 密文正文 | AES-256-GCM 加密后的 UTF-8 JSON 载荷 |
| `54 + N` | `16` | GCM 认证标签 | 紧随密文之后，标签结束即为文件末尾（不允许存在任何尾随字节） |

密码派生采用 **Argon2id v1.3（`0x13`）**，以原始 UTF-8 密码字节和 16 字节盐派生出 32 字节 AES-256 密钥。AES-256-GCM 加密时**必须将从磁盘读取的完整 54 字节文件头作为附加认证数据（AAD）**。参考规范：[RFC 9106 参数选择](https://www.rfc-editor.org/rfc/rfc9106.html#section-4) · [OWASP 认证加密存储指南](https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html#cipher-modes)

## 明文 JSON 载荷格式

解密认证成功后得到的明文必须是一个严格的 UTF-8 JSON 对象，**恰好包含以下 10 个必填字段**（字段顺序不限；解析器必须拒绝重复键、未知键、缺失字段、类型不匹配及越界值）：

| JSON 字段 | 类型 | 格式与校验约束 |
| --- | --- | --- |
| `payload_version` | 整数 | 固定为 `1`。 |
| `identity_protocol` | 字符串 | 固定为 `chirp-mls-authenticated-v5`（容器版本与身份协议版本各自独立校验）。 |
| `root_algorithm` | 字符串 | 固定为 `Ed25519`。 |
| `root_seed` | 字符串 | 32 字节账号根私钥种子，使用标准带 `=` 填充的 Base64 编码。 |
| `root_public_key` | 字符串 | 32 字节 Ed25519 根公钥（标准带填充 Base64），必须与由 `root_seed` 重新推导出的一致。 |
| `service_origin` | 字符串 | 规范化的 HTTP/HTTPS Origin（≤ 2048 字节），例如 `https://fixture.test:443`。小写主机名后须显式写出有效端口（HTTP 显式写 `:80`，HTTPS 显式写 `:443`），不含路径、尾部斜杠、认证信息、查询或片段。 |
| `account_id` | 字符串 | 服务端分配的不可变账号 ID（1 至 128 字节）。 |
| `username` | 字符串 | 导出时的账号昵称（≤ 320 字节），仅用于界面辨认提示；恢复校验以 `account_id` 和 `root_public_key` 为准。 |
| `created_at` | 字符串 | 导出生成时间，UTC RFC 3339 格式并以 `Z` 结尾（可带小数秒，≤ 64 字节）。 |
| `source_platform` | 字符串 | `iOS`、`macOS`、`Windows`、`Android` 四者之一；所有平台均兼容导入其余三个平台导出的文件。 |

## 导出自检与恢复校验流程

1. **生成与闭环自检**：首台设备在本地随机生成账号根密钥与候选设备密钥后，加密生成密文并立即用同一份密码试解密、逐字节比对还原出来的 JSON 明文是否完全一致，确认无误后再持久化候选状态（同一初始化流程内重复触发导出时输出完全相同的密文字节）。
2. **用户确认保存**：系统保存面板报告写入成功后，引导用户在确认页停留等待满 **5 秒**阅读安全警示并手动点击确认（支持可选重新选择刚保存的文件并用密码现场复核公钥）。直到服务端返回首绑成功响应，才清除本地暂存的草稿密文。
3. **离线读取防御顺序**：读取文件时先限制文件总大小，校验魔数 `CHIRPKEY`、版本 `1`、套件 `1`、固定 Argon2id 参数、`N` 范围以及 `文件实际字节数 === 54 + N + 16`。任何一项不符直接拒收，避免对恶意大文件执行 Argon2id 耗尽内存；验证通过后再派生密钥校验 GCM 标签，密码错误与标签校验失败统一向用户提示解锁失败，防止泄露细节。
4. **恢复绑定校验**：从 `root_seed` 重新算出公钥并核对 `root_public_key`、当前连接的规范 `service_origin`、`account_id` 以及服务端记录的根公钥是否全部匹配；随后在本机独立生成新的设备私钥，由账号根签发设备证书并联网完成持钥证明。任一步骤失败均保持用户原文件和当前已有设备身份完整无损。

## 跨平台一致性测试向量

仓库中提供了跨语言测试向量文件 [`recovery-v1.json`](https://github.com/YouZiFeiLe/Chirp/blob/main/internal/identity/testdata/recovery-v1.json)（由 [Go 向量生成器](https://github.com/YouZiFeiLe/Chirp/blob/main/scripts/identity-vectors/main.go) 生成）：

- `file` 字段为 Base64 包装的完整 453 字节 v1 测试文件（`N = 383`），使用 `password` 原样解密后的字节流必须与 `payload` 的 UTF-8 字节完全相等。
- `retired_file` 为相同密码加密的旧版 `CHRIPKEY` 样本，各端测试均须验证它会被明确拒绝。
- 实现与回归入口：[共享 Rust 编解码器](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/apple/MLS/native/src/recovery.rs) · [Apple 原生桥接测试](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/apple/MLS/Tests/ChirpMLSTests/RecoveryVectorTests.swift) · [Apple 恢复逻辑](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/apple/Shared/RecoveryFile.swift) · [Windows 恢复流程](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/windows/engine/login_windows.go) · [Android 恢复流程](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/android/app/src/main/kotlin/cn/youzifeile/chirp/data/IdentitySetup.kt)
