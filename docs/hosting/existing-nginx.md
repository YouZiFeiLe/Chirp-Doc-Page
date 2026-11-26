# 接入已有 Nginx 和证书

如果你的服务器上已经运行着 Nginx，并且已经为目标域名申请了有效的 HTTPS 证书，可以选择这条路线：让现有的 Nginx 继续负责 TLS 终止和证书自动续期，Chirp 的 Compose 仅启动后端 `app` 与媒体节点 `livekit`。

开始前，请确认你已完成[域名、端口与 Docker 准备](./index.md)，现有证书覆盖 Chirp 专用域名，且公网已放行 `443/TCP` 到 Nginx、放行 `7882/UDP` 到媒体主机。

## 第一步：配置并启动后端服务

登录运行 Chirp 后端的主机，进入部署目录创建权限受限的 `.env` 文件：

```sh
cd ~/chirp
touch .env && chmod 600 .env
nano .env
```

如果你的 Nginx 直接安装在同一台宿主机的操作系统上（即「同机原生 Nginx」），只需写入以下两行。请将 `CHIRP_PUBLIC_ORIGIN` 改为客户端访问的完整 HTTPS 地址，将 `CHIRP_RTC_NODE_IP` 改为媒体主机的公网 IPv4（Nano 中按 `Ctrl+O` 回车保存，`Ctrl+X` 退出）：

<<< @/.vitepress/snippets/existing-nginx.env{dotenv}

根据你的已有 Nginx 与 Chirp 后端之间的网络位置，选择对应的一组上游地址与后端配置：

| 已有 Nginx 的部署形态 | 业务上游（`chirp_app_backend`） | 信令上游（`chirp_livekit_backend`） | 后端补充设置 |
| --- | --- | --- | --- |
| **同机原生运行**（Nginx 装在宿主机） | `127.0.0.1:18115` | `127.0.0.1:7880` | 直接使用上方两行 `.env` 即可。两个 TCP 端口默认只绑定宿主机回环接口。 |
| **异机独立部署**（通过内网或 VPN 互联） | 例如 `10.0.0.20:18115` | 例如 `10.0.0.20:7880` | 在 `.env` 中追加 `CHIRP_HTTP_PUBLISH_IP=10.0.0.20`（填后端真实的私网/VPN IP），且防火墙仅允许 Nginx 来源访问这两个 TCP 端口。 |
| **同机 Docker 容器**（Nginx 运行在另一个容器） | `app:18115` | `livekit:7880` | 需让 Nginx 容器加入 Chirp 的 Compose 网络，使容器 DNS 能直接解析 `app` 和 `livekit`。 |

启动 `app` 与 `livekit`（不启用 `https` profile，因此不会启动内置 Nginx）：

```sh
sudo docker compose config --services
sudo docker compose up -d --wait app livekit
sudo docker compose ps
```

正常情况下，`config --services` 会列出 `app` 和 `livekit` 两项，启动完成后两者的状态均应为 `healthy`。

如果你的 Nginx 运行在同机的另一个 Docker 容器中，还需要将它接入 Chirp 的默认网络（请将 `my-nginx` 替换为你的实际容器名称）。对于由另一个 Compose 项目管理的 Nginx，建议将该网络正式写入其 `compose.yaml`，避免重建代理容器后网络断开：[持久化代理容器的网络配置](./operations.md#已有-nginx-容器的持久网络配置)

```sh
sudo docker network connect chirp_default my-nginx
```

## 第二步：配置 Nginx 反向代理规则

登录 **Nginx 所在服务器**，下载项目提供的站点配置模板：[查看 Nginx 站点模板](https://github.com/YouZiFeiLe/Chirp/blob/main/deploy/nginx-upstreams.example.conf)

```sh
curl -fL https://raw.githubusercontent.com/YouZiFeiLe/Chirp/main/deploy/nginx-upstreams.example.conf -o chirp-nginx.conf &&
  nano chirp-nginx.conf
```

根据你的 Nginx 现状修改并应用该文件：

1. 将模板顶部的 `chirp_app_backend` 和 `chirp_livekit_backend` 两个 `upstream` 地址改为上一步表格中对应的一组。
2. 把 `server_name` 替换为你的 Chirp 域名，把 `ssl_certificate` 与 `ssl_certificate_key` 指向已有证书链和私钥的真实路径。
3. 将配置放入 Nginx 配置体系：
   - **该域名尚未创建任何站点配置**：直接把修改后的文件安装到 Nginx 的 `conf.d` 目录（以 Debian 默认布局为例）：
     ```sh
     sudo install -m 0644 chirp-nginx.conf /etc/nginx/conf.d/chirp.conf
     ```
   - **该域名已有现成的 HTTPS 站点配置**：保留你原有的监听端口与证书配置；将 `upstream`、`map` 和 `limit_req_zone` 这几段放在全局 `http` 上下文（注意不要重复定义）；再将模板 `server` 块中的代理通用头和各 `location` 规则合并进现有 `server` 块中，替换同路径旧规则。

::: info 反向代理路径分工说明
- `/rtc` 及子路径：启用 WebSocket 升级头与长连接超时，转发至 LiveKit 信令端口 `7880/TCP`。
- `/authorization/v5/`：转发至 `app:18115`，禁用缓存并开启请求限流。
- `/twirp/` 与 `/internal/`：直接返回 `404`，防止内部接口暴露到公网。
- `/` 其余路径：转发至 `app:18115`，并关闭 `proxy_buffering` 以确保 SSE 事件流实时送达客户端。
:::

## 第三步：检查语法并重载 Nginx

原生安装于宿主机的 Nginx 执行：

```sh
sudo nginx -t && sudo systemctl reload nginx
```

容器化运行的 Nginx 则通过 `docker exec` 校验并重载（替换 `my-nginx` 为实际容器名）：

```sh
sudo docker exec my-nginx nginx -t &&
  sudo docker exec my-nginx nginx -s reload
```

重载成功后，请继续完成[公网验收与首位管理员](./verification.md)。
