# 安全扫描与加密链路评估报告

本报告基于对 `chirp-go` 仓库 `push-to-github` 分支的**源码级静态审查、依赖与硬化核查以及离线单元测试验证**，系统评估 Chirp 从浏览器接入、身份授权、房间配钥、实时媒体到离线备份的全链路安全性与工程边界。

<E2eeAuditChainDiagram />

## 一、评估范围与静态检查基线

### 1. 代码与依赖审计基线

- **服务端与协议核心**：Go `1.27.4`（`golang.org/x/crypto v0.59.0`、`go-webauthn/webauthn v0.18.2`、`modernc.org/sqlite v1.62.0`、`livekit/server-sdk-go/v2 v2.20.0`）。
- **四端共用 Rust 密码库**（`Client/apple/MLS/native/Cargo.toml`）：`openmls =0.9.2`、`vodozemac =0.11.2`、`ed25519-dalek 3.0.0`、`aes-gcm =0.11.1`（开启 `zeroize`）、`argon2 =0.6.0`（开启 `zeroize`）、[`zeroize`](https://docs.rs/zeroize/) `1.9.2`、`getrandom =0.4.3`。
- **原生端与 SDK 补丁**：Apple Swift 6（`CryptoKit` + 9 个 LiveKit Swift 2.19.0 源码补丁 + `ChirpVoiceReceiver.mm`）、Android Kotlin（`AndroidKeyStore` + `livekit-2.30.0.patch` + `voice_receiver.cpp`）、Windows WinUI 3 + Go 协议子进程（DPAPI + Pion WebRTC Go overlay + Sonora AEC3）。

### 2. 离线静态检测与单元测试执行记录

| 检查项 | 执行结果与覆盖说明 |
| --- | --- |
| `go vet ./...` | **通过（0 告警）**。全仓库 Go 代码静态类型与可疑构造检查无异常。 |
| 核心安全包单元测试 | `internal/identity`、`internal/authorization`、`internal/config`、`internal/store`、`internal/room`、`internal/passkeyhttp`、`internal/adminhttp`、`cmd/chirp` **全部通过**（覆盖 V5 签名向量、证书链校验、CAS 事件链、密码 Argon2id 校验、管理台 Origin 保护及配置校验）。 |
| 网络集成测试说明 | 涉及绑定 `127.0.0.1` 套接字的包（`internal/group`、`internal/httpapi`、`internal/httpserver`、`internal/httpstream`）需在允许回环端口监听的宿主/Docker 环境执行（`sh scripts/test-sqlite.sh local` / `test-open-source-compose.sh`）。 |

---

## 二、端到端加密链路逐层评估

### 1. 传输入口、Web 防护与路由隔离（评级：高）

- **HTTPS/WSS 强制策略**：客户端配置加载阶段即拦截非 HTTPS 地址（仅 Debug 构建允许 `localhost` 回环开发例外）；HTTP 客户端显式配置 `CheckRedirect` 返回 `http.ErrUseLastResponse`，彻底拒绝自动跟随重定向导致的凭据泄露或降级。
- **Web 安全响应头与 CSRF 防护**：`/register`、`/device` 与 `/admin/` 统一设置 `Cache-Control: no-store`、`X-Content-Type-Options: nosniff`、`Referrer-Policy: no-referrer` 以及严格的 [Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CSP)（`default-src 'self'; frame-ancestors 'none'; base-uri 'none'`）。所有浏览器状态写入操作均启用 Go 标准库 `http.NewCrossOriginProtection()` 校验，且会话 Cookie 强制设置 `HttpOnly`、`SameSite=Strict`、`Secure`。
- **内部管理面隔离**：反向代理与 Go 主路由均对 `/twirp/*` 与 `/internal/*` 返回 `404`，避免 LiveKit 管理接口暴露到公网；HTTP 服务端配置了明确的防慢速攻击超时（`ReadHeaderTimeout: 5s`、`ReadTimeout: 10s`、`WriteTimeout: 15s`、`IdleTimeout: 60s`）。

### 2. Passkey 认证与设备身份授权链（评级：高）

- **抗钓鱼认证与 PKCE 绑定**：WebAuthn 注册与登录要求 `ResidentKeyRequirementRequired` 与 `VerificationRequired`（强制用户生物/PIN 校验），禁止弱降级；原生客户端授权码有效期仅 1 分钟且通过 S256 PKCE 绑定发起端。
- **独立双库与防历史回滚**：主业务库 `chirp.db` 与授权日志库 `authorization.db` 物理分离。授权库内置不可删改保护触发器（`identity_blacklist_no_delete` / `identity_blacklist_no_update`），并在客户端持久化已见历史检查点，任何缺失项或版本号倒退的快照响应都会被客户端当场拒收。
- **休眠感知单调时钟**：客户端授权新鲜度（60s）与媒体许可（3s）在 Rust 与原生层分别使用 `mach_continuous_time`（Apple）、`CLOCK_BOOTTIME`（Android）和 `GetTickCount64`（Windows），**设备休眠期间时钟照常流逝**，杜绝通过合盖休眠变相延长过期密钥与撤销宽限期的旁路漏洞。

### 3. 成员设备互认与配对防钓鱼（评级：高）

- **独立可信核验**：基于 `vodozemac` X25519 / HKDF / MAC 的三组 SAS 安全码计算将 `Origin`、`room_id`、`entry_id`、双方账号根公钥与设备公钥全部纳入上下文绑定，防止跨房间或跨成员身份混淆攻击。
- **图片导入防中间人**：跨设备导入二维码图片配对（`chirp-device-pair-v1`）时，旧设备隐藏本地算出的安全码，强制用户手动输入新设备屏幕显示的全部 3 组数字，连续 3 次错码直接熔断。

### 4. OpenMLS 建组与双槽平滑轮换（评级：高）

- **零服务端密钥接触**：房间密码仅在服务端使用 16 字节随机盐 + Argon2id（`t=2, m=19MiB, p=1`）校验准入，不参与内容加密；Go 群组协调器只转发公开 `KeyPackage`、加密 `Welcome` 与全员签名确认值。
- **双槽平滑切换与硬上限兜底**：通过 SDK 补丁禁用 SIF 明文绕过与自动棘轮，采用 2 个发送/接收槽交替切换（默认 60 秒轮换），切换 +1 秒后以安全随机材料覆盖淘汰旧槽。即使服务端调度异常，客户端仍强制执行 **90 秒主动重建、120 秒硬上限停发**。

### 5. 媒体帧防重放与数据通道门控（评级：高）

| 防御机制 | Apple 实现 | Android 实现 | Windows 实现 |
| --- | --- | --- | --- |
| **接收端解码前认证与 IV 防重放** | `ChirpVoiceReceiver.mm` + `ChirpVoiceKeys.swift` | `voice_receiver.cpp` + `VoiceKeys.kt` | `media_windows.go` (`keySlot` + `seen`) |
| **单密钥 IV 计数上限** | 每成员每密钥最多 `65,536` 个不同 96 位 IV | 每成员每密钥最多 `65,536` 个不同 96 位 IV | 同密钥去重并受 120s 硬上限退役 |
| **发送前额外出站自检** | `ContinuousClock` 逐帧检查 + 20ms 巡检作废 | `VoiceKeys.authenticatesOutgoing` 发送前验证 SSRC 与密文标签 | `ChirpReliable()` 通道写入前复核租约与提供器状态 |
| **屏蔽外部 STUN / TURN** | `livekit-no-external-ice.patch` | `livekit-2.30.0.patch` | Go Pion SDK 连接层清空外部 ICE |
| **拦截远程强制开麦** | `livekit-local-microphone-intent.patch` | 本地开麦状态机独立门控 | WinUI 与 Go 状态机分离控制 |

### 6. 离线恢复文件与附件传输（评级：高）

- **`.chirpkey` v1 抗离线爆破**：强制至少 16 个 Unicode 标量密码，采用 Argon2id（`64 MiB / 3 轮 / 4 并行`）派生密钥，AES-256-GCM 并将完整 54 字节文件头纳入 AAD，读取端在执行 Argon2id 前先做魔数与总长范围检查，防止畸形大文件拒绝服务。
- **附件密钥零服务端落盘**：文件密钥仅随加密数据通道送达在线原接收者。服务端利用 `os.Root` 约束文件操作彻底阻止路径穿越，并在下载响应流中每读取至多 **64 KiB** 重新校验入房资格与在线 SSE 连接。

---

## 三、服务端与容器运行时安全核查

对 [`deploy/Dockerfile`](https://github.com/YouZiFeiLe/Chirp/blob/main/deploy/Dockerfile) 与 [`compose.yaml`](https://github.com/YouZiFeiLe/Chirp/blob/main/compose.yaml) 的硬化审计结果如下：

1. **最小化攻击面镜像**：成品镜像基于 `FROM scratch`，静态编译（`CGO_ENABLED=0 -trimpath`），容器内除 `chirp` 单一二进制、CA 证书与时区文件外不包含任何 Shell 或系统工具，极大压缩容器逃逸后的横向工具链。
2. **运行时最小特权**：`app` 与 `livekit` 均以非特权用户 `65532:65532` 运行，启用 `read_only: true` 只读根文件系统、`cap_drop: [ALL]`、`no-new-privileges:true`，并限制进程数（`pids_limit: 256 / 512`）与 `noexec,nosuid,nodev` 的 32 MiB `tmpfs`。
3. **存储与密钥防护**：签名种子强制校验 `0400`/`0600` 权限且缺钥直接拒绝启动；附件目录拒绝符号链接且禁止与数据库同目录；客户端敏感秘密在 Rust 层通过 `zeroize`、Windows Go 层通过 `clear()`、Android 层通过 `ByteArray.fill(0)` 及时清理。

---

## 四、已知工程局限、残余风险与加固建议

客观评估任何安全体系都必须明确其边界与残余风险。基于源码审查，Chirp 当前存在以下明确的工程边界，供部署者与安全评估人员参考：

| 风险 / 局限项 | 影响范围与原因说明 | 建议缓解措施 |
| --- | --- | --- |
| **公开默认授权种子共享身份** | 公开 Docker 镜像内置 `deploy/authorization-key.default`，所有使用默认镜像的实例共享同一快照验签公钥。 | 对独占信任边界有严格要求的私有部署，应按[授权签名密钥](/reference/authorization-keys)生成自用种子并重新打包客户端。 |
| **Android 开源签名私钥公开** | `Client/android/signing/chirp-release.p12` 随源码公开，任何持有源码的人都能签出相同指纹的 APK。 | 成员应通过可信的管理员或官方渠道获取安装包，勿仅凭 APK 证书指纹判断分发者可信。 |
| **Windows 安装器默认未签名且卸载清库** | `Setup.exe` 默认无 Authenticode 签名，且卸载会清理 DPAPI 保护的 `identities.v5`。 | 分发给终端用户前建议提供 SHA-256 校验值或自用代码签名，并提醒用户提前备份 `.chirpkey`。 |
| **撤销实时性与服务元数据可见性** | 新设备撤销最迟受 60 秒授权快照窗口制约（首次传播依赖授权服务）；服务端依然可观察在线成员、房间、IP 与流量模式。 | 对极高敏感度场景需部署私有授权密钥，并充分认知元数据在自托管服务器侧可见的事实。 |
| **WebRTC 底层缓冲与非取证级擦除** | 客户端未魔改 WebRTC C++ 内部队列硬打断，已入编码/播放队列的毫秒级在途帧无法追回；内存清零不覆盖系统分配器可能遗留的物理内存页。 | 遵循终端设备物理安全基线（开启系统全盘加密与锁屏密码），不在不可信共享设备上登录。 |
| **单实例可用性边界** | `app` 依赖进程内群组协调状态与本地 SQLite WAL 锁，不支持多实例水平扩展。 | 通过高可用主机快照与定期备份（[升级与备份](/hosting/maintenance)）保障业务连续性。 |
