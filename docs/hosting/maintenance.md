# 升级、备份与恢复

日常在 Linux 主机上维护公开版 `~/chirp/compose.yaml`（默认 Compose 项目名为 `chirp`）时，暂停服务可使用 `sudo docker compose stop`，恢复运行使用 `sudo docker compose up -d --wait --wait-timeout 600`。

::: danger 切勿随意执行 `docker compose down -v`
在 Compose 命令中携带 `-v` 参数会**直接销毁项目的全部持久化命名卷**（包含数据库、附件和媒体密钥），操作前务必确认已完成有效备份！
:::

## 第一步：记录当前运行状态与镜像摘要

在任何升级或迁移操作前，先记录当前运行的应用版本和精确的镜像摘要（`latest` 标签会随新版本发布而向前移动，只有 SHA-256 摘要能锁定当前运行的精确版本）：

```sh
cd ~/chirp
sudo docker compose exec -T app /usr/local/bin/chirp version
sudo docker compose images
chirp_image_id=$(sudo docker compose images -q app)
sudo docker image inspect "$chirp_image_id" --format '{{range .RepoDigests}}{{println .}}{{end}}'
```

## 第二步：确认备份范围并停服快照

Chirp 的持久化数据分布在以下命名卷与宿主机目录中：

| 存储位置 | 必须备份的内容 | 备注 |
| --- | --- | --- |
| `chirp_data` 卷 | `chirp.db`、`authorization.db`、两者的 `-wal`/`-shm` 文件以及 `attachments/` | 核心业务数据与 V5 授权历史。 |
| `chirp_media-keys` 卷 | `keys.json` | 首次启动自动生成的 LiveKit API 密钥对。 |
| 部署目录 `~/chirp` | `compose.yaml`、`.env`、覆盖文件（如 `compose.override.yaml`）及自用授权密钥（如有） | 若使用内置 Nginx，必须完整保留 `secrets/swag/`（含证书、ACME 账户及 DNS 插件凭据）。 |
| 已有 Nginx 主机 | 站点配置文件、TLS 证书链、私钥及续期配置 | 注意保留证书目录的权限与符号链接。 |
| `chirp_logs` 卷 | 服务端 JSON Lines 本地日志（默认保留近 7 天） | 仅在有审计留存或排障需求时备份。 |

为防止在复制 SQLite 数据库及其 WAL 日志期间有新数据写入导致一致性损坏，**备份前必须先停止所有容器**：

```sh
cd ~/chirp
sudo docker compose stop
sudo docker compose ps --all
sudo docker volume inspect --format '{{.Name}} {{.Mountpoint}}' chirp_data chirp_media-keys chirp_logs
```

- **云服务器磁盘快照**：趁服务处于停写状态，对包含部署目录和 Docker 卷的磁盘创建同一时间点快照，记下快照时间与当前版本即可恢复启动。
- **文件级归档备份（适合跨主机迁移）**：在服务停止状态下使用 GNU `tar` 打包（注意使用 `--numeric-owner` 保留容器 UID/GID 权限）：

```sh
chirp_backup_dir="$HOME/chirp-backups/$(date -u +%Y%m%dT%H%M%SZ)"
sudo install -d -m 0700 "$chirp_backup_dir"
chirp_data_dir=$(sudo docker volume inspect -f '{{.Mountpoint}}' chirp_data)
chirp_media_dir=$(sudo docker volume inspect -f '{{.Mountpoint}}' chirp_media-keys)

sudo tar --numeric-owner -cpf "$chirp_backup_dir/deployment.tar" -C "$PWD" compose.yaml .env
sudo tar --numeric-owner -cpf "$chirp_backup_dir/data.tar" -C "$chirp_data_dir" .
sudo tar --numeric-owner -cpf "$chirp_backup_dir/media-keys.tar" -C "$chirp_media_dir" .
```

如果使用内置 Nginx，请一并归档 `secrets/` 目录（包含证书与 DNS 凭据）：

```sh
sudo tar --numeric-owner -cpf "$chirp_backup_dir/swag.tar" -C "$PWD" secrets
```

::: warning 妥善保管离机备份副本
归档包内含 LiveKit 共享密钥、TLS 私钥或 DNS API 令牌等敏感凭据。请限制备份目录访问权限，若需上传至远程存储务必先行加密。建议定期在一台空主机上实际演练一次恢复流程，以验证备份可用。
:::

## 第三步：升级公开版镜像

完成备份后，先下载新版 `compose.yaml` 至临时文件并做语法校验，保留旧配置为 `compose.previous.yaml` 后再拉取镜像并重启（如果 `.env` 中锁定过 `CHIRP_IMAGE`，请先同步修改为目标版本标签或摘要）：[查看 Docker Hub 镜像标签](https://hub.docker.com/r/youzifeile/chirp-server/tags)

```sh
cd ~/chirp
curl -fL https://raw.githubusercontent.com/YouZiFeiLe/Chirp/main/compose.yaml -o compose.next.yaml &&
  sudo docker compose -f compose.next.yaml config --quiet &&
  cp -p compose.yaml compose.previous.yaml &&
  mv compose.next.yaml compose.yaml &&
  sudo docker compose pull &&
  sudo docker compose up -d --wait --wait-timeout 600
```

升级完成后，运行 `sudo docker compose ps` 与 `chirp version` 核对状态和版本号。如果使用了同机容器版已有 Nginx 通过服务名访问后端，请重载一次 Nginx 配置以刷新后端容器的新 IP 解析，随后执行公网接口与双人语音验收。[公网验收](./verification.md)

## 第四步：将备份恢复到新主机

1. **保持旧实例停写**：切换生产流量前务必让旧服务器保持停止状态，避免新旧两台实例同时写入而导致状态分叉。
2. **还原配置与目录**：在目标主机准备好 `~/chirp`，使用相同的公开域名和配套授权签名密钥（若换了媒体主机公网 IP，同步更新 `.env` 中的 `CHIRP_RTC_NODE_IP` 与防火墙规则）。
   - 若使用文件级恢复：解包 `deployment.tar`（及 `swag.tar` / 自定义 `secrets/`），并在 `.env` 中将 `CHIRP_IMAGE` 锁定为备份时记录的精确镜像摘要。
3. **先建空卷，再导入数据**：使用 `docker compose create` 创建容器和空卷（此时服务尚未启动），再将归档还原进对应的挂载点（以下假设归档位于 `/srv/chirp-restore`）：
   ```sh
   cd ~/chirp
   sudo docker compose create
   chirp_archive_dir=/srv/chirp-restore
   chirp_data_dir=$(sudo docker volume inspect -f '{{.Mountpoint}}' chirp_data)
   chirp_media_dir=$(sudo docker volume inspect -f '{{.Mountpoint}}' chirp_media-keys)
   sudo tar --numeric-owner --same-permissions -xpf "$chirp_archive_dir/data.tar" -C "$chirp_data_dir"
   sudo tar --numeric-owner --same-permissions -xpf "$chirp_archive_dir/media-keys.tar" -C "$chirp_media_dir"
   sudo stat -c '%u:%g %a %n' "$chirp_media_dir/keys.json"
   ```
4. **校验权限并启动**：确认业务文件保留属主 `65532:65532`，且 `keys.json` 权限为 `600`。执行 `sudo docker compose up -d --wait --wait-timeout 600` 启动服务，并用已有成员账号测试登录、附件与双向通话。

> [!IMPORTANT] 不要回滚到过期授权库
> 如果恢复了较早时间点的 `authorization.db`，会丢失备份时间点之后发生的设备撤销记录；而此前已经见过更高版本号历史快照的客户端会**拒绝**这种倒退的历史状态。因此务必选取最新且一致的完整备份进行恢复。[授权连续性与安全边界](/reference/security)
