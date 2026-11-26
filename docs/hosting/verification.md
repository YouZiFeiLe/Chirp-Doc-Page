# 公网验收与首位管理员

无论你选择了哪一种 HTTPS 部署路线，服务启动后的验收标准都完全一致：先确认公网入口与反向代理路由正常，再初始化首位管理员，最后用两个真实账号完成一次双向端到端加密语音通话。

## 第一步：从公网验证核心接口

在**服务器以外**的一台可访问公网的电脑上执行以下命令（将第一行的域名替换为你的真实地址，末尾不要带斜杠）：

```sh
chirp_origin=https://voice.example.com
curl -fsS "$chirp_origin/healthz"
curl -sS -o /dev/null -w '%{http_code}\n' "$chirp_origin/authorization/healthz"
curl -sS -o /dev/null -w '%{http_code}\n' "$chirp_origin/rtc/v1/validate"
```

对照下表核对每一项的返回结果：

| 检查路径 | 预期响应 | 验证意义 |
| --- | --- | --- |
| `/healthz` | HTTP `200`，JSON 包含 `"status":"ok"` | 公网 HTTPS 已顺利穿过 Nginx 到达 Go 主服务，且业务库与授权库均已打开。 |
| `/authorization/healthz` | HTTP `204` | V5 授权签名模块健康检查正常。 |
| `/rtc/v1/validate` | HTTP `401` | 无入房令牌的请求已准确路由至 LiveKit 信令服务（返回 `404` 通常意味着 `/rtc` 反代规则缺失或被拦截）。 |

随后用浏览器打开 `https://voice.example.com/register`（替换为你的域名），确认地址栏显示受信任的 HTTPS 锁标志，且页面正常渲染出「申请加入」表单。从此刻起，所有成员注册、登录和管理台操作都必须统一使用这一个域名。

## 第二步：建立首位管理员

Chirp 没有预设的默认管理员账号或密码。首位管理员必须由具备服务器 SSH 权限的运维人员通过本机 CLI 命令行引导创建：

1. **本人先在网页提交注册**：打开你刚才验证过的 `/register` 页面，填写 **3–15 位纯英文字母**作为昵称并创建 Passkey。提交成功后点击「复制申请编号」，保存好这串**完整编号**。
2. **在服务器执行初始化命令**：SSH 登录部署主机，进入 `~/chirp` 目录执行 `admin bootstrap`（将引号内的文字替换为刚才复制的完整申请编号）：
   ```sh
   cd ~/chirp
   sudo docker compose exec app /usr/local/bin/chirp admin bootstrap --request-id '在此粘贴完整申请编号'
   ```
3. **登录 Web 管理台**：在浏览器打开同域名下的 `/admin/`（例如 `https://voice.example.com/admin/`），使用刚才创建的 Passkey 登录，即可进入空间管理台。

::: info 初始化命令仅能执行一次
`admin bootstrap` 是专为全新空数据库设计的一次性引导指令。如果以后需要增补其他管理员，或者原管理员丢失了 Passkey 需要恢复权限，请使用 CLI 的 `admin grant` 命令。[管理员与管理台指南](./admin-console.md)
:::

4. **审批第二位测试成员**：邀请一位朋友在同一个 `/register` 页面用他自己的设备创建 Passkey 并申请加入，将申请编号发给你。你在 `/admin/` 管理台的「申请」视图中核对编号后点击批准。

## 第三步：双人双向语音验收

只测通网页和 `/healthz` 并不代表语音通路就绪——LiveKit 的媒体流走独立的 `7882/UDP` 端口，必须通过真实设备验证：

1. **分别登录两个获批账号**：两人各自在 macOS、iOS、Android 或 Windows 客户端填入同一服务器 HTTPS 地址，分别使用**不同的获批账号**完成 Passkey 登录，并按引导设置恢复密码、保存好各自的首台 `.chirpkey` 文件。
2. **入房并核对安全码**：两人一起进入默认的「公开大厅」，点击对方的头像发起设备互认。双方通过当面或可信渠道核对全部 **3 组安全码**并点击确认，等待房间完成 OpenMLS 配钥。
3. **验证双向语音**：各自点击开麦并授予麦克风权限，轮流说话测试。只有当 **A 能听见 B，且 B 也能听见 A** 时，才算真正验证了这套部署的 `7882/UDP` 公网媒体通路。

如果出现只能登录却听不见声音、单向有声或卡在等待核验的情况，请先核对[成员首次通话指南](/guide/first-call)与[故障排查](./troubleshooting.md)。
