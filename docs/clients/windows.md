# Windows 客户端架构与实现

Windows 客户端面向 **Windows 11 x64 24H2（内部版本 ≥ `26100`）**，采用独特的「**C# / [WinUI 3](https://learn.microsoft.com/windows/apps/winui/winui3/) 桌面壳 + 独立 Go 协议子进程**（`Chirp.Protocol.exe`）」双进程架构，通过匿名标准输入输出（`stdin/stdout`）JSON 管道通信，不监听任何本地 TCP 端口。

## 为什么采用 WinUI 3 + Go 子进程的双进程架构？

1. **各取所长，职责纯净**：C# / WinUI 3 擅长实现高响应的原生桌面窗口、高对比度语义主题、WASAPI 独占/通信级低延迟音频采集、[Concentus](https://github.com/lostromb/concentus) Opus 编解码以及硬件摄像头/图片渲染；而 Go 子进程则可以**直接复用 `chirp-go` 服务端同一套 `internal/identity` 与 `internal/store` 校验库**、成熟的 HTTP/SSE 栈以及 LiveKit / [Pion WebRTC](https://github.com/pion/webrtc) 传输引擎。
2. **零本地端口攻击面**：`Chirp.Protocol.exe` 由主窗口通过 [`ProtocolClient.cs`](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/windows/Chirp/ProtocolClient.cs) 拉起，仅继承 `stdin`/`stdout` 管道传递指令与事件，**不在本机开启任何本地 HTTP/WebSocket 服务**，彻底规避了同机其他恶意进程探测本地回调端口的风险。
3. **干净彻底的生命周期**：关闭唯一或最后一个 WinUI 主窗口时，主程序向管道发送关闭信号并等待退出，`Chirp.exe` 与 `Chirp.Protocol.exe` 会同步清理临时附件并退出进程。

## 双进程模块分工

### 1. 前端交互与原生桌面层（`Client/windows/Chirp/`）

| 文件 | 职责与实现要点 |
| --- | --- |
| [`App.xaml.cs`](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/windows/Chirp/App.xaml.cs) · [`MainWindow.xaml.cs`](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/windows/Chirp/MainWindow.xaml.cs) | 管理单实例协议激活（`cn.youzifeile.chirp.windows://auth/callback`）、多窗口共享状态（`DesktopState.cs`）、静态任务栏/切换器预览保护以及窗口尺寸自适应布局。 |
| [`App.xaml`](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/windows/Chirp/App.xaml) | 基于 `design-tokens.json` 扩展定义浅色（`Light`）、深色（`Dark`）及系统高对比度三套语义画刷资源字典。 |
| [`WindowsHelloLoginKey.cs`](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/windows/Chirp/WindowsHelloLoginKey.cs) · [`LoginResumption.cs`](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/windows/Chirp/LoginResumption.cs) · [`LoginLock.cs`](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/windows/Chirp/LoginLock.cs) | 在设置中按需启用 Microsoft Passport KSP 本机 RSA 密钥（通过 `NCryptDecrypt` 验证拒绝静默解密），协调多窗口共享锁定、首个前台窗口网络校时后触发 Windows Hello 解锁及切后台中断处理。 |
| [`DesktopAudio.cs`](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/windows/Chirp/DesktopAudio.cs) · [`AudioService.cs`](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/windows/Chirp/AudioService.cs) | 通过 NAudio WASAPI 采集与播放，Concentus（辅以 `OpusSharp.Natives` 解码 DTX 静音帧）完成 Opus 编解码，并通过 P/Invoke 调用 `Chirp.RNNoise.dll` 与 `chirp_windows_audio.dll`（Rust Sonora AEC3/AGC2）。 |
| [`PairingCamera.cs`](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/windows/Chirp/PairingCamera.cs) · [`PairingImages.cs`](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/windows/Chirp/PairingImages.cs) | 调用系统摄像头或按文件内容读取单帧图片，借助 QRCoder 生成二维码、ZXing.Net 识别二维码，并通过 [Windows Hello](https://learn.microsoft.com/windows/security/identity-protection/hello-for-business/) / 用户系统验证批准配对。 |

### 2. 协议、身份与媒体引擎子进程（`Client/windows/engine/`）

| 文件 | 职责与实现要点 |
| --- | --- |
| [`main_windows.go`](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/windows/engine/main_windows.go) · [`login_windows.go`](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/windows/engine/login_windows.go) · [`resumption_windows.go`](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/windows/engine/resumption_windows.go) | 解析来自 WinUI 的 JSON 指令，执行 Passkey 浏览器认证（含最长 60 秒指数退避浏览器接力轮询 `POST /api/auth/login/windows-handoff`）、手机扫码轮询、`.chirpkey` 导入导出，以及 AES-256-GCM + Hello 公钥封装的冷启动恢复引擎（业务 Bearer 始终仅存引擎内存）。 |
| [`vault_windows.go`](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/windows/engine/vault_windows.go) | 使用 **[Windows DPAPI](https://learn.microsoft.com/windows/win32/api/dpapi/nf-dpapi-cryptprotectdata)（`CryptProtectData`）** 加密保存当前用户的 `identities.v5`，写入采用临时文件 + `fsync` + 原子重命名，加载与保存后立即 `clear()` 清零内存明文切片，且每台设备的签名私钥也在签名完成后即时清零。 |
| [`authority_windows.go`](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/windows/engine/authority_windows.go) · [`authorization_trust_windows.go`](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/windows/engine/authorization_trust_windows.go) | 从同级目录加载并严格校验 `AuthorizationTrust.json`，同步签名快照与本机最高历史检查点。 |
| [`room_windows.go`](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/windows/engine/room_windows.go) · [`media_windows.go`](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/windows/engine/media_windows.go) | 维护房间状态机、SAS 互认与双槽平滑换钥，通过 Pion WebRTC 传输加密语音帧和加密聊天数据包。 |
| [`files_windows.go`](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/windows/engine/files_windows.go) · [`attachment_session_windows.go`](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/windows/engine/attachment_session_windows.go) | 管理临时 `session-*` 密文缓存目录、1 MiB 分块传输与 AES-256-GCM 逐记录加解密。 |
| [`chirplog_store_windows.go`](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/windows/engine/chirplog_store_windows.go) | 异步批量写入 UTC 小时 `.chirplog` 分片并生成单文件导出报告。 |

## Windows 端 E2EE 与音频链路实现细节

1. **禁止未就绪或明文数据通道发送**：`media_windows.go` 通过自定义 Go SDK overlay 仅暴露 `ChirpReliable()` 安全可靠通道，并在实际写入 WebRTC `DataChannel` 前再次检查发送租约截止时间与加密提供器是否退役；同时在连接阶段屏蔽所有外部 ICE 服务器。
2. **双槽位加密与重放保护**：`mediaSession` 内部维护长度为 2 的 `keySlot` 数组，使用标准 32 字节发送者材料经 HKDF 派生出 `cipher.AEAD`，并按发送者维护 `seen map[[12]byte]struct{}` 过滤重放帧；切换槽位后定时退役并清零旧槽位密钥。
3. **休眠感知单调时钟与零化边界**：在 Rust `chirp_mls_native.dll` 中通过 Win32 `GetTickCount64()` 计算包含系统休眠在内的单调耗时；而在 Rust `audio/` 模块（[`lib.rs`](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/windows/audio/src/lib.rs)）通过 Sonora 为无硬件回声消除的桌面麦克风提供软件 AEC3 与 AGC2。

> [!WARNING] Windows 卸载时的身份清理特性
> 与 macOS 保留钥匙串项不同，Windows 版 `Setup.exe` 的 [Inno Setup](https://jrsoftware.org/isinfo.php) 卸载脚本（[`Chirp.iss`](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/windows/installer/Chirp.iss)）会清除应用数据目录（包含 DPAPI 加密的 `identities.v5`）。重新安装或迁移前请务必确保持有有效的 `.chirpkey` 与密码。构建与打包细节见[各平台客户端构建手册 · Windows](/development/clients#windows)。
