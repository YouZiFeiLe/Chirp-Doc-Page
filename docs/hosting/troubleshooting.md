# 按症状排查故障

遇到部署或通话异常时，建议先在部署目录检查容器运行状态和最新日志，确认故障停留在哪一环（正常启用内置 HTTPS 应包含 `app`、`livekit`、`nginx` 三个容器；使用已有 Nginx 则包含前两个）：

```sh
cd ~/chirp
sudo docker compose config --services
sudo docker compose ps --all
sudo docker compose logs --tail=80 app livekit
```

## 1. 下载配置失败或拉取镜像报错

| 报错现象 | 常见原因与排查方式 |
| --- | --- |
| `curl` 下载 `compose.yaml` 返回 **404** | 检查下载链接是否准确指向公开仓库根目录的 `compose.yaml`。[查看公开 Compose](https://raw.githubusercontent.com/YouZiFeiLe/Chirp/main/compose.yaml) |
| 拉取镜像报错 `manifest unknown` | 检查 `.env` 中 `CHIRP_IMAGE` 的仓库路径和版本标签是否正确。默认应为 `docker.io/youzifeile/chirp-server:latest`，手动指定版本时请先核对[Docker Hub 已发布标签](https://hub.docker.com/r/youzifeile/chirp-server/tags)。 |
| 报错平台不匹配或 Compose 语法不识别 | 运行 `dpkg --print-architecture` 确认主机为 `amd64`，运行 `sudo docker compose version` 确认 Compose 版本不低于 `2.26`。[准备部署环境](./index.md) |

## 2. 内置 Nginx 证书签发失败或健康检查超时

先查看 `nginx` 容器日志与宿主机当前端口占用情况：

```sh
sudo docker compose logs --tail=100 nginx
sudo ss -ltnp
```

| 日志或状态现象 | 排查重点 |
| --- | --- |
| **端口被占用（Address already in use）** | 两种内置路线都需要宿主机 `443/TCP`；HTTP-01 还需要 `80/TCP`；DNS-01 示例默认使用 `127.0.0.1:8080`。用 `ss -ltnp` 找出占用进程并停用，或改走[接入已有 Nginx](./existing-nginx.md)。 |
| **HTTP-01 挑战验证失败** | 从外网检查域名的 A 记录是否已指向本机公网 IPv4（Cloudflare 需设为「仅 DNS」），并确认云安全组、本机防火墙与路由器已放行 `80/TCP`。[HTTP-01 配置](./http-01.md) |
| **DNS-01 提示插件或凭据错误** | 核对 `.env` 中的 `CHIRP_DNS_PLUGIN` 名称是否与 `secrets/swag/dns-conf/<插件名>.ini` 一致、文件权限是否为 `0600`、API Token 是否具备目标域 DNS 修改权限，以及日志里的 TXT 记录传播状态。[DNS-01 配置](./dns-01.md) |
| **证书已成功签发，但容器一直 `unhealthy`** | 内置健康检查会通过本机 `443` 携带 `CHIRP_DOMAIN` 请求 `/healthz`。请确认 `app` 容器已处于 `healthy` 状态，且 `.env` 中的 `CHIRP_DOMAIN` 与实际签发证书的域名完全一致。 |

调整配置后，强制重建 `nginx` 容器并观察状态：

```sh
sudo docker compose up -d --force-recreate --wait --wait-timeout 600 nginx
sudo docker compose ps
```

## 3. 已有 Nginx 返回 `502 Bad Gateway` 或 `/rtc` 返回 `404`

在 **Nginx 所在主机（或代理容器网络内部）** 直接探测两个后端上游端口（异机部署请将 `127.0.0.1` 换为后端内网 IP，同机容器网络则换为 `app:18115` 与 `livekit:7880`）：

```sh
curl -sS -o /dev/null -w '%{http_code}\n' http://127.0.0.1:18115/healthz
curl -sS -o /dev/null -w '%{http_code}\n' http://127.0.0.1:7880/rtc/v1/validate
```

- 第一条应返回 **`200`**，第二条应返回 **`401`**。如果连不上，请检查后端 `CHIRP_HTTP_PUBLISH_IP`、防火墙以及 Docker 容器是否已加入同一网络。
- 如果上述上游直连均正常，但通过公网域名访问 `/rtc/v1/validate` 却返回 **`404`**，说明 Nginx 的 `/rtc` `location` 规则配置有误（例如 `proxy_pass` 末尾误加了斜杠导致路径被截断，或缺少 WebSocket `Upgrade` / `Connection` 头）。
- 若重启或升级了后端容器，通过服务名访问上游的已有 Nginx 容器必须执行 `nginx -s reload` 刷新容器内网 IP 缓存。[接入已有 Nginx](./existing-nginx.md)

## 4. 网页可以打开，但登记或登录失败

- **Passkey 报错或跨域拒绝**：在浏览器直接访问完整 HTTPS 地址下的 `/register`，确认证书受信任、无浏览器警告，且 `.env` 中的 `CHIRP_PUBLIC_ORIGIN` 与浏览器地址栏、客户端内填写的服务器地址**完全一致**（包括端口）。修改 `.env` 后须重新运行 `sudo docker compose up -d --wait --wait-timeout 600` 使配置生效。
- **注册后提示等待审批**：新成员必须由管理员在管理台的「申请」视图核对申请编号后批准；如果是全新数据库的首个账号，需在服务器通过 `chirp admin bootstrap` 初始化。[公网验收与首位管理员](./verification.md)
- **提示「时间校验失败」（`NETWORK_TIME_REQUIRED`）**：设备系统时钟与标准网络时间偏差过大，请开启设备自动日期与时间同步，并确保网络未拦截 NTP（`123/UDP`）。
- **另一台设备突然被踢下线**：属于预期行为——每个账号同一时间仅允许一台客户端保持有效登录，新设备完成激活后会自动替换旧会话。

## 5. 可以进房但完全无声，或只有单向声音

请按从端到网的顺序逐项排查：

1. **检查房内互认状态**：确认成员列表中没有任何「待核验」提示。未完成全部三组安全码核验时，房间会强制暂停语音发送与播放。
2. **检查两端本机音频状态**：请说话方检查是否误点静音、是否启用了语音激活（VAD）且阈值过高、以及操作系统是否已授予 Chirp 麦克风权限；请收听方检查是否开启了「停止收听」、系统输出设备是否正确，以及是否误将对方单独音量调到了 `0%`。[音频设置与降噪](/guide/audio-and-profile)
3. **检查媒体公网 IP 与 UDP 7882**：确认 `.env` 中的 `CHIRP_RTC_NODE_IP` 填写的是客户端从公网能直接连通的媒体主机真实 IPv4，并在云安全组、宿主机防火墙及路由器 NAT 上确认 **`7882/UDP` 入站畅通**。注意：Chirp 的媒体流默认完全走 UDP直连，不回退 TCP 也不走第三方 TURN 中继。
4. **核对 LiveKit 实时日志**：在通话测试的同时在服务器运行 `sudo docker compose logs --tail=80 livekit` 观察 ICE 连接与候选状态。修正 `CHIRP_RTC_NODE_IP` 后执行 `sudo docker compose up -d --wait --wait-timeout 600` 重建并再次实测双人互听。
