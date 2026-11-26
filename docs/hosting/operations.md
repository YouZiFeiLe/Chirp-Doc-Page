# 服务端配置与运维参考

本页汇集了 Chirp 服务端的全部环境变量、反向代理转发规则、健康检查端口、公开版与源码构建版 Compose 的差异，以及持久化数据迁移说明。请在部署目录（`compose.yaml` 所在目录）下使用具有 Docker 权限的账号操作。[从零部署](/hosting/) · [管理台指南](./admin-console.md) · [升级与备份](./maintenance.md)

## 环境变量参考 {#配置入口}

公开版根目录 `compose.yaml`（基于 Debian 13 `linux/amd64` 推荐环境）会自动读取同目录下的 `.env` 或宿主环境变量。修改 `.env` 后，执行 `sudo docker compose up -d --wait` 即可平滑应用更改。[查看公开 Compose](https://github.com/YouZiFeiLe/Chirp/blob/main/compose.yaml) · [配置加载与校验源码](https://github.com/YouZiFeiLe/Chirp/blob/main/internal/config/config.go)

| 变量名 | 默认值（公开 Compose） | 说明与约束 |
| --- | --- | --- |
| `COMPOSE_PROFILES` | 空 | 设为 `https` 时自动启动内置 SWAG Nginx 与 Certbot；留空则仅启动 `app` 与 `livekit`（用于接入已有 Nginx 或本地调试）。 |
| `CHIRP_DOMAIN` | 空 | 内置 Nginx 申请证书使用的纯主机名（不含 `https://`）。 |
| `CHIRP_ACME_EMAIL` | 空 | Let's Encrypt 证书到期或异常告警联系邮箱。 |
| `CHIRP_ACME_METHOD` | `http` | 证书验证方式，可选 `http`（HTTP-01）或 `dns`（DNS-01）。 |
| `CHIRP_DNS_PLUGIN` | `cloudflare` | `dns` 模式下的 Certbot 插件名（如 `cloudflare`、`aliyun`），对应 `secrets/swag/dns-conf/<插件名>.ini`。 |
| `CHIRP_NGINX_HTTP_BIND` | `0.0.0.0:80` | 内置 Nginx 的 HTTP 宿主机监听地址。DNS-01 模式通常设为 `127.0.0.1:8080` 以免占用公网 80 端口。HTTPS 固定绑定 `443/TCP`。 |
| `CHIRP_IMAGE` | `docker.io/youzifeile/chirp-server:latest` | 固定生产版本时建议指定具体版本标签或 `@sha256:...` 摘要。 |
| `CHIRP_PUBLIC_ORIGIN` | `http://localhost:18115` | 客户端与浏览器访问的完整公开 Origin（可含非 443 端口），决定 WebAuthn RP ID、API 与 WSS 发现地址。正式环境必须为 `https://...`，`http://` 仅允许 `localhost` 开发调试。 |
| `CHIRP_RTC_NODE_IP` | 空 | 客户端公网直连 LiveKit `7882/UDP` 的可达 IPv4 地址。若位于 NAT 后方，需做同端口 UDP 转发。 |
| `CHIRP_HTTP_PUBLISH_IP` | `127.0.0.1` | 宿主机暴露 `18115/TCP` 与 `7880/TCP` 的网卡接口。异机反代时可改为内网/VPN 接口地址。 |
| `CHIRP_LOG_LEVEL` | `info` | 服务端日志等级，支持 `debug`、`info`、`warn`、`error`。 |
| `CHIRP_LOG_SERVER_ENABLED` | `false` | 设为 `true` 时，日志将通过异步内存队列直接推送至 [VictoriaLogs](https://docs.victoriametrics.com/victorialogs/)，不再保存本地日期日志文件。 |
| `CHIRP_LOG_SERVER_URL` | 空 | 当开启日志服务器时填写 VictoriaLogs 的 HTTP(S) 基地址（不含查询参数、认证信息或片段）。 |
| `CHIRP_TOKEN_TTL` | `5m` | 签发给客户端的 LiveKit 入房 [JWT](https://datatracker.ietf.org/doc/html/rfc7519) 有效期，合法范围 `1s` 至 `15m`。 |
| `CHIRP_GROUP_ROTATION` | `60s` | 房间端到端加密密钥的计划轮换周期，合法范围 `30s` 至 `30m`。 |
| `CHIRP_AUTHORIZATION_KEY_FILE` | `/usr/share/chirp/authorization-key.default` | 授权快照签名种子的路径。成品镜像内置开源默认种子；需独占签名权时请挂载自定义密钥。[授权签名密钥](/reference/authorization-keys) |

## 公开成品 Compose 与源码构建 Compose 对比

Chirp 仓库中存在两份 `compose.yaml`，用途不同，请勿混用：

| 对比维度 | 根目录 `compose.yaml`（推荐生产使用） | `deploy/compose.yaml`（源码构建与旧部署） |
| --- | --- | --- |
| **镜像来源** | 直接拉取 Docker Hub 成品镜像 `youzifeile/chirp-server` | 从本地源码构建 `deploy/Dockerfile` 的 `app` 目标 |
| **HTTPS 入口** | 支持 `https` profile 启动内置 SWAG Nginx | 不含 Nginx，需配合外置代理 |
| **数据存储方式** | Docker 命名卷（`data`、`logs`、`media-keys`） | 宿主机绑定目录（`./data`、`./log`、`./authorization-data`） |
| **授权签名密钥** | 默认使用镜像内置公开种子（可覆盖） | 强制挂载 `./secrets/authorization-key` |
| **LiveKit 凭据** | `app` 首次启动自动随机生成并写入 `keys.json` | 需在 `.env` 手动配置 `LIVEKIT_API_SECRET`（≥32 字符）并配合 `deploy/livekit.yaml` |

若要查看源码构建版配置，可参考仓库中的 [`deploy/compose.yaml`](https://github.com/YouZiFeiLe/Chirp/blob/main/deploy/compose.yaml)、[`deploy/.env.example`](https://github.com/YouZiFeiLe/Chirp/blob/main/deploy/.env.example) 与 [`deploy/livekit.yaml.example`](https://github.com/YouZiFeiLe/Chirp/blob/main/deploy/livekit.yaml.example)。

## 反向代理路径与端口约束

无论是内置 Nginx 还是接入已有 Nginx，所有公网流量都应遵循以下转发边界：

| 流量路径 / 端口 | 后端目标 | 代理要求与安全约束 |
| --- | --- | --- |
| `/rtc` 及 `/rtc/*` | `livekit:7880/TCP` | 必须保留完整路径、查询参数及 `Upgrade` / `Connection` WebSocket 升级头，并配置长连接超时（如 `3600s`）。 |
| `/authorization/v5/*` | `app:18115/TCP` | 保留原始路径，建议开启速率限制（如 `10r/s`）与小请求体限制（`64k`），禁用缓存。 |
| `/twirp/*`、`/internal/*` | 公网入口直接返回 `404` | 仅允许 `app` 通过内网管理 LiveKit，禁止暴露至公网。 |
| 其余 HTTP 请求（`/register`、`/admin/`、`/v1/` 等） | `app:18115/TCP` | 透传 `Host`、`X-Forwarded-Proto`、`X-Real-IP`，并**关闭代理缓冲**（`proxy_buffering off`）以确保 [SSE](https://html.spec.whatwg.org/multipage/server-sent-events.html) 事件流实时推送。 |
| 实时语音媒体流 | 直达媒体主机 `7882/UDP` | 不经过 Nginx。配置显式禁用 TURN、媒体 TCP 监听与外部 IP 探测。 |

### 已有 Nginx 容器的持久网络配置 {#已有-nginx-容器的持久网络配置}

当已有 Nginx 运行在同一个宿主机的另一个 Docker Compose 项目中时，单靠 `docker network connect` 在下次重建代理容器后会失效。建议先启动 Chirp 后端，然后在**现有 Nginx 的 `compose.yaml`** 中把 Chirp 网络声明为外部网络（假设代理服务名为 `nginx`）：[Docker Compose 跨项目网络文档](https://docs.docker.com/compose/how-tos/networking/)

```yaml
services:
  nginx:
    networks: [default, chirp_backend]

networks:
  chirp_backend:
    external: true
    name: chirp_default
```

在 Nginx 项目目录执行 `docker compose up -d nginx` 使网络生效后，代理配置即可直接使用 `app:18115` 和 `livekit:7880`。注意，**Chirp 后端升级或重建容器后，需在代理侧执行一次 `nginx -t && nginx -s reload`** 让 Nginx 重新解析后端容器的新内网 IP。

## 证书运维、切换与日志检查

- **内置证书管理**：内置 Nginx 基于固定版本的 LinuxServer SWAG 镜像。排障时可查看续期日志与现有证书信息：[SWAG 官方文档](https://docs.linuxserver.io/images/docker-swag/)
  ```sh
  sudo docker compose logs --tail=100 nginx
  sudo docker compose exec nginx certbot certificates --config-dir /config/etc/letsencrypt
  ```
- **在内置 Nginx 与已有 Nginx 之间迁移**：
  - *内置切到外置*：保持原域名与数据卷不变，运行 `sudo docker compose --profile https stop nginx` 释放 80/443 端口，移除 `.env` 中的 `COMPOSE_PROFILES=https`，再按[接入已有 Nginx](./existing-nginx.md)配置外部代理。
  - *外置切回内置*：确保外部服务让出 `443/TCP`（HTTP-01 另需让出 `80/TCP`），启用 `https` profile 并验证新证书与通话正常后，再停用原代理的续期任务。
- **常用健康与日志检查命令**：
  ```sh
  sudo docker compose ps
  sudo docker compose exec app /usr/local/bin/chirp version
  curl -fsS http://127.0.0.1:18115/livez
  curl -fsS http://127.0.0.1:18115/healthz
  curl -fsS -o /dev/null -w '%{http_code}\n' http://127.0.0.1:18115/authorization/healthz
  sudo docker compose logs --tail=100 livekit
  sudo docker compose cp app:/app/log/. ./chirp-logs
  ```
  其中 `/livez`（返回 `200`）仅检测进程存活；`/healthz`（返回 `200`）会同时验证 [SQLite WAL](https://www.sqlite.org/wal.html) 模式下的 `chirp.db` 与 `authorization.db` 可读写；`/authorization/healthz`（返回 `204`）单独检测授权库。[应用路由源码](https://github.com/YouZiFeiLe/Chirp/blob/main/internal/application/application.go)

## 持久化卷布局与迁移 {#备份恢复与迁移}

| Compose 卷名（项目名 `chirp`） | 容器挂载路径 | 存储内容说明 |
| --- | --- | --- |
| `chirp_data` | `/data` | `chirp.db`、`authorization.db`、各自的 WAL/SHM 文件及 `attachments/` 临时密文目录。 |
| `chirp_media-keys` | `/var/lib/chirp-media` | 供 `app` 与 `livekit` 共用的 `keys.json`（`app` 自动写入，`livekit` 只读挂载）。 |
| `chirp_logs` | `/app/log` | 服务端按天滚动的 JSON Lines 日志（默认保存当天及此前 6 天）。 |

**从源码版 `deploy/compose.yaml` 迁移到公开版 `compose.yaml`**：
1. 先停止旧实例并备份全部绑定目录。
2. 在新实例预先创建好的 `chirp_data` 卷根目录中，将原 `deploy/data/` 内的业务库与附件放入，并将原 `deploy/authorization-data/` 中的 `authorization.db`（及其 `-wal`/`-shm`）一并放至 `chirp_data` 卷根目录。
3. 确认文件属主为 `65532:65532`，如沿用旧客户端则同步挂载原自定义授权签名种子，并保持 `CHIRP_PUBLIC_ORIGIN` 域名不变（Passkey 与原域名绑定）。

## 开发与测试数据重建

当前数据库引擎仅允许打开空数据库或与本版本 schema（目前为 schema `23`）完全一致的库。如果需要测试全新初始化或首管引导流程而又不希望影响生产卷，可以直接使用独立的 Compose 项目名启动一套隔离测试环境（先停掉占用了相同端口的旧实例）：

```sh
sudo docker compose -p chirp-dev up -d --wait
```
