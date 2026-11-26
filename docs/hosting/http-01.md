# 用 HTTP-01 配置内置 Nginx

当你的域名 A 记录已经直接指向这台 Chirp 服务器，且服务器可以对外开放公网 `80/TCP` 时，这是最省心的部署路线：Compose 会同时拉起内置的 SWAG（Nginx + Certbot）容器，自动向 Let's Encrypt 申请 TLS 证书并定时续期。

::: info 端口要求
此方案需要宿主机对外开放 **80/TCP**（证书签发与续期验证、HTTP 自动跳转 HTTPS）、**443/TCP**（业务、Passkey 与信令）以及 **7882/UDP**（加密语音媒体流）。如果宿主机的 `80` 或 `443` 端口已被其他站点占用，请改用[接入已有 Nginx](./existing-nginx.md)路线。
:::

开始前，请确保已完成[域名、端口与 Docker 准备](./index.md)。[了解 Let’s Encrypt HTTP-01 验证原理](https://letsencrypt.org/docs/challenge-types/#http-01-challenge)

## 第一步：编写 `.env` 配置文件

登录服务器，进入部署目录并创建权限受限的 `secrets` 目录与 `.env` 文件：

```sh
cd ~/chirp
sudo install -d -m 0700 secrets
touch .env && chmod 600 .env
nano .env
```

写入以下配置内容。请把域名、ACME 联系邮箱以及媒体主机的公网 IPv4 替换为你自己的真实值。注意：`CHIRP_DOMAIN` 只填写纯主机名（不含 `https://`），并保留 `CHIRP_PUBLIC_ORIGIN` 中的 `${CHIRP_DOMAIN}` 引用。

<<< @/.vitepress/snippets/http-01.env{dotenv}

## 第二步：签发证书并启动全部服务

核对启用的服务清单，并带 `--wait` 启动整套服务栈：

```sh
sudo docker compose config --services
sudo docker compose up -d --wait --wait-timeout 600
sudo docker compose ps
```

启用 `COMPOSE_PROFILES=https` 后，`config --services` 会列出 `app`、`livekit` 与 `nginx` 三个服务。首次启动时，容器需要拉取镜像并等待 Certbot 完成 HTTP-01 域名验证，通常需要 1 至 3 分钟。全部就绪后，三个容器都会显示为 `healthy`（内置 Nginx 的健康检查会直接通过本机 443 端口携带你的域名验证 `/healthz` 接口与受信任证书）。

::: tip 如果等待超时或 `nginx` 处于 `unhealthy`
运行 `sudo docker compose logs --tail=100 nginx` 查看 Certbot 输出的详细原因。最常见的阻塞原因包括：域名 A 记录尚未生效、云服务商安全组未开放 `80/TCP`，或宿主机已有其他进程占用了 `80` / `443` 端口。[按症状排障](./troubleshooting.md)
:::

## 证书文件保存位置

签发成功后的证书链、私钥、ACME 账户及续期配置均保存在部署目录下的 `secrets/swag/`。后续升级或迁移服务器时，请务必将整个 `secrets/swag/` 连同数据卷一并备份。[公网验收与首位管理员](./verification.md) · [升级、备份与恢复](./maintenance.md)
