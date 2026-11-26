<script setup>
import DeploymentPicker from '../.vitepress/theme/components/DeploymentPicker.vue'
</script>

# 从零部署 Chirp

在一台 Linux 服务器上通过 [Docker Compose](https://docs.docker.com/compose/) 部署 Chirp，即可同时拉起核心服务与语音转发节点：Go 后端（`app`）负责 Passkey 登录、成员管理、授权日志与房间协调，[LiveKit](https://livekit.io/)（`livekit`）负责加密语音流转发。所有客户端只需访问同一个 HTTPS 域名即可完成注册、登录与通话。

## 整体网络拓扑

开始配置前，先了解流量如何经过你的服务器：控制接口与信令统一走 **443/TCP（HTTPS / WSS）**，由反向代理转发给后端容器；加密语音数据包则走 **7882/UDP** 直连 LiveKit，不经过 Nginx 中转。

<NetworkTopologyDiagram />

## 第一步：选择 HTTPS 入口方案 {#选择-https-入口}

Chirp 提供三条部署路线。如果你在服务器上已经运行着 Nginx 和可用证书，直接选择第一项即可；如果是全新的服务器，推荐让 Compose 内置的 [SWAG](https://docs.linuxserver.io/images/docker-swag/)（Nginx + Certbot）自动为你签发和续期 [Let's Encrypt](https://letsencrypt.org/) 证书。

<DeploymentPicker />

## 第二步：准备服务器、域名与网络端口

1. **服务器要求**：准备一台 **Debian 13（trixie）x86_64 / amd64** 主机，并配备具有 `sudo` 权限的运维账号（公开镜像仅发布 `linux/amd64` 架构）。
2. **专用子域名与 DNS**：为 Chirp 分配一个长期稳定的独立子域名（下文以 `voice.example.com` 为例）。注意，Passkey 通行密钥严格绑定域名，且客户端会访问域名根目录下的固定路径，因此**不支持挂在子路径下**（如 `/chirp`）。
   - 添加一条 **A 记录**，指向对外提供 HTTPS 服务的 Nginx 公网 IPv4。
   - 本指南按 IPv4 直连设计：若使用 [Cloudflare](https://developers.cloudflare.com/dns/) 等 DNS 托管商，请将代理状态设为「**仅 DNS**」（灰云），且不要保留指向其他入口的 `AAAA` 记录。
3. **确认媒体直连地址**：单独记下运行 LiveKit 容器的服务器的**公网 IPv4**，稍后需要填入 `CHIRP_RTC_NODE_IP`。当 Nginx 与后端位于同一台云服务器时，它与域名 A 记录的 IP 相同；若代理和后端分机部署，此处应填**媒体主机**的真实公网 IP。
4. **放行防火墙与安全组端口**：
   - `443/TCP`（必选）：放行至 Nginx 所在主机，用于网页、API 与 WebSocket 信令。
   - `80/TCP`（仅 HTTP-01 路线需要）：放行至 Nginx，用于 ACME 域名验证与自动跳转 HTTPS。
   - `7882/UDP`（必选）：放行至 LiveKit 所在主机，用于端到端加密语音传输。若服务器位于路由器或内网 NAT 后方，请将公网 `7882/UDP` 原端口映射转发至媒体主机。
   - 保留你日常连接用的 SSH 管理端口。

在任意一台可访问公网的 Linux 主机上查询域名解析，确认返回的是预期 HTTPS 入口的公网 IPv4：

```sh
getent ahostsv4 voice.example.com | awk '{print $1}' | sort -u
```

## 第三步：安装 Docker 与 Compose

登录**运行 Chirp 后端的服务器**。若本机已安装 Docker Engine 与 **Compose 2.26 及以上版本**，可直接跳过安装步骤（需要 Compose 2.26+ 以支持公开配置中的内联 Nginx 模板）。

在全新的 Debian 13（amd64）主机上，可通过 Docker 官方 apt 仓库安装稳定版：[Docker Debian 官方安装指南](https://docs.docker.com/engine/install/debian/)

```sh
sudo apt-get update
sudo apt-get install -y ca-certificates curl nano
sudo install -d -m 0755 /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/debian/gpg -o docker-signing-key.asc &&
  sudo install -m 0644 docker-signing-key.asc /etc/apt/keyrings/docker.asc
echo 'deb [arch=amd64 signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/debian trixie stable' |
  sudo tee /etc/apt/sources.list.d/docker.list >/dev/null
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
sudo systemctl enable --now docker
```

安装完成后，核对 Docker 服务端和 Compose 插件均能正常输出版本：

```sh
sudo docker version --format '{{.Server.Version}}'
sudo docker compose version
```

## 第四步：下载公开版 Compose 文件

新建部署目录并下载公开仓库根目录下的 `compose.yaml`（该配置直接拉取 Docker Hub 上的成品镜像，并已内嵌 SWAG Nginx 的站点规则）。若你已有正在运行的实例，请改走升级流程。[查看公开版 Compose](https://github.com/YouZiFeiLe/Chirp/blob/main/compose.yaml) · [升级、备份与恢复](./maintenance.md)

```sh
mkdir -p ~/chirp
cd ~/chirp
curl -fL https://raw.githubusercontent.com/YouZiFeiLe/Chirp/main/compose.yaml -o compose.yaml &&
  sudo docker compose -f compose.yaml config --quiet
```

校验通过后，请回到上方的[选择 HTTPS 入口方案](#选择-https-入口)，按你选定的路线完成 `.env` 配置并启动容器，最后按[公网验收与首位管理员](./verification.md)验证服务连通性与双人通话。
