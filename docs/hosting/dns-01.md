# 用 DNS-01 配置内置 Nginx

如果你的服务器无法对公网开放 `80/TCP`（例如 ISP 封锁了 80 端口、位于内网穿透之后，或不想暴露明文 HTTP 端口），只要你的域名托管在支持 API 更新 TXT 记录的服务商处，就可以让内置 Certbot 通过 **DNS-01** 方式自动验证域名所有权并续期证书。

本方案将容器的 HTTP 监听只绑定在宿主机回环地址 `127.0.0.1:8080`，公网仅需放行 **443/TCP** 与 **7882/UDP**。[了解 Let’s Encrypt DNS-01 验证原理](https://letsencrypt.org/docs/challenge-types/#dns-01-challenge)

## 第一步：配置 `.env` 与 DNS 插件参数

登录已完成[域名、端口与 Docker 准备](./index.md)的服务器，创建目录与 `.env` 文件：

```sh
cd ~/chirp
sudo install -d -m 0700 secrets
touch .env && chmod 600 .env
nano .env
```

以下示例以 **Cloudflare** 为例。请将 `CHIRP_DOMAIN`、`CHIRP_RTC_NODE_IP` 和 `CHIRP_ACME_EMAIL` 替换为你的实际信息，并保留 `${CHIRP_DOMAIN}` 表达式：

<<< @/.vitepress/snippets/dns-01.env{dotenv}

如果你使用的是**阿里云 DNS**，请将上方的 `CHIRP_DNS_PLUGIN=cloudflare` 改为 `CHIRP_DNS_PLUGIN=aliyun`。

## 第二步：写入 DNS API 凭据文件

Certbot 会根据 `CHIRP_DNS_PLUGIN` 的名称去 `secrets/swag/dns-conf/` 下读取同名的 `.ini` 凭据文件。请按你使用的 DNS 服务商完成**其中对应的一节**。

### 方式 A：Cloudflare DNS

在 Cloudflare 控制台创建一个权限最小化的 API 令牌（API Token）：范围限定在目标域名，权限仅授予 `Zone → DNS → Edit`。[Certbot Cloudflare 插件官方文档](https://certbot-dns-cloudflare.readthedocs.io/en/stable/)

在服务器创建仅运维可读写的凭据文件：

```sh
sudo install -d -m 0700 secrets/swag/dns-conf
sudo touch secrets/swag/dns-conf/cloudflare.ini
sudo chmod 600 secrets/swag/dns-conf/cloudflare.ini
sudo nano secrets/swag/dns-conf/cloudflare.ini
```

填入以下内容（将右侧替换为真实令牌）：

```ini
dns_cloudflare_api_token = 在这里填写目标域的令牌
```

### 方式 B：阿里云 DNS

在阿里云 RAM 控制台准备一个仅拥有目标域名解析管理权限（查询记录、增删 TXT 记录）的 AccessKey。[Certbot 阿里云插件格式参考](https://github.com/tengattack/certbot-dns-aliyun#credentials-file)

在服务器创建凭据文件：

```sh
sudo install -d -m 0700 secrets/swag/dns-conf
sudo touch secrets/swag/dns-conf/aliyun.ini
sudo chmod 600 secrets/swag/dns-conf/aliyun.ini
sudo nano secrets/swag/dns-conf/aliyun.ini
```

填入你的 AccessKey ID 与 AccessKey Secret：

```ini
dns_aliyun_access_key = 在这里填写AccessKeyID
dns_aliyun_access_key_secret = 在这里填写AccessKeySecret
```

::: warning 妥善保护 API 凭据
上述 `.ini` 文件会长期保留在服务器的 `secrets/swag/dns-conf/` 目录中供证书自动续期使用。请确保文件权限为 `0600`，且在备份整个部署目录时对备份归档加密保管。
:::

## 第三步：签发证书并启动

执行启动命令并等待健康检查完成：

```sh
sudo docker compose config --services
sudo docker compose up -d --wait --wait-timeout 600
sudo docker compose ps
```

正常启动后应显示 `app`、`livekit`、`nginx` 三个容器且状态全部为 `healthy`。首次签发由于需要等待 DNS TXT 记录传播，可能需要等待数分钟。若发生超时，可运行 `sudo docker compose logs --tail=100 nginx` 检查插件名称、`.ini` 文件名及 API 权限是否正确。

启动完成后，请继续[公网验收与首位管理员](./verification.md)。
