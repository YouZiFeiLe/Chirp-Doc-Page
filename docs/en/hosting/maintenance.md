# Upgrades, Backups & Disaster Recovery

Pause services cleanly with `sudo docker compose stop` inside `~/chirp` (default Compose project name `chirp`), and resume with `sudo docker compose up -d --wait --wait-timeout 600`.

::: danger Never run `docker compose down -v` casually
Passing `-v` **destroys all persistent Docker named volumes** (databases, attachments, and LiveKit keys). Never run it without verified off-host backups!
:::

## Step 1: Record Current Version & Image Digest

Before any upgrade or host migration, record both the exact running version and immutable SHA-256 image digest (`latest` moves over time):

```sh
cd ~/chirp
sudo docker compose exec -T app /usr/local/bin/chirp version
sudo docker compose images
chirp_image_id=$(sudo docker compose images -q app)
sudo docker image inspect "$chirp_image_id" --format '{{range .RepoDigests}}{{println .}}{{end}}'
```

## Step 2: Stop Writes & Take Consistent Backups

Persistent state spans these named volumes and host directories:

| Location | Essential Files | Notes |
| --- | --- | --- |
| `chirp_data` volume | `chirp.db`, `authorization.db`, their `-wal`/`-shm` sidecars, and `attachments/` | Primary state + V5 authorization log. |
| `chirp_media-keys` volume | `keys.json` | Auto-generated LiveKit API credentials. |
| Deploy dir `~/chirp` | `compose.yaml`, `.env`, overrides (`compose.override.yaml`), custom signing key | With bundled Nginx, back up all of `secrets/swag/` (TLS certs, ACME creds, DNS `.ini`). |
| External Nginx host | Site `.conf`, TLS certificate chains, private keys, renewal hooks | Preserve ownership and symlinks. |
| `chirp_logs` volume | Server JSON Lines logs (7-day retention) | Optional unless needed for audit retention. |

To avoid SQLite WAL tearing, **always stop containers before copying files or snapshotting**:

```sh
cd ~/chirp
sudo docker compose stop
sudo docker compose ps --all
sudo docker volume inspect --format '{{.Name}} {{.Mountpoint}}' chirp_data chirp_media-keys chirp_logs
```

- **Cloud block snapshot**: While stopped, snapshot disks holding `~/chirp` and Docker volumes together.
- **Tar archive backup** (portable across servers; `--numeric-owner` preserves container UID/GID `65532`):

```sh
chirp_backup_dir="$HOME/chirp-backups/$(date -u +%Y%m%dT%H%M%SZ)"
sudo install -d -m 0700 "$chirp_backup_dir"
chirp_data_dir=$(sudo docker volume inspect -f '{{.Mountpoint}}' chirp_data)
chirp_media_dir=$(sudo docker volume inspect -f '{{.Mountpoint}}' chirp_media-keys)

sudo tar --numeric-owner -cpf "$chirp_backup_dir/deployment.tar" -C "$PWD" compose.yaml .env
sudo tar --numeric-owner -cpf "$chirp_backup_dir/data.tar" -C "$chirp_data_dir" .
sudo tar --numeric-owner -cpf "$chirp_backup_dir/media-keys.tar" -C "$chirp_media_dir" .
```

Include `secrets/` when using bundled Nginx:

```sh
sudo tar --numeric-owner -cpf "$chirp_backup_dir/swag.tar" -C "$PWD" secrets
```

::: warning Store backups safely off-host
Archives contain LiveKit secrets, TLS keys, and DNS API tokens. Restrict directory permissions (`0700`), encrypt archives before uploading off-host, and periodically rehearse restores onto a clean VM.
:::

## Step 3: Upgrade the Public Stack

After backing up, download the updated `compose.yaml` to a staging file, validate syntax, preserve `compose.previous.yaml`, pull images, and recreate (update `CHIRP_IMAGE` in `.env` first if pinned): [Docker Hub Tags](https://hub.docker.com/r/youzifeile/chirp-server/tags)

```sh
cd ~/chirp
curl -fL https://raw.githubusercontent.com/YouZiFeiLe/Chirp/main/compose.yaml -o compose.next.yaml &&
  sudo docker compose -f compose.next.yaml config --quiet &&
  cp -p compose.yaml compose.previous.yaml &&
  mv compose.next.yaml compose.yaml &&
  sudo docker compose pull &&
  sudo docker compose up -d --wait --wait-timeout 600
```

Verify `sudo docker compose ps` and `chirp version`. If an external Nginx container resolves `app`/`livekit` over Docker DNS, reload Nginx so it picks up the recreated container IPs, then run [Verification](./verification.md).

## Step 4: Restore onto a New Server

1. **Keep the old server stopped**: Never run two live writers sharing the same identity domain.
2. **Stage config & directories**: Recreate `~/chirp` with the same origin and authorization signing key (update `CHIRP_RTC_NODE_IP` and firewall rules if the public IP changed; pin `CHIRP_IMAGE` to the recorded SHA-256 digest during restore).
3. **Initialize empty volumes, then extract archives** (example archive path `/srv/chirp-restore`):
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
4. **Verify ownership (`65532:65532`) & permissions (`keys.json` mode `600`), then start**: Run `sudo docker compose up -d --wait --wait-timeout 600` and verify sign-in, attachments, and bidirectional voice.

> [!IMPORTANT] Never roll `authorization.db` backward
> Restoring an older `authorization.db` drops newer device revocations—and clients that already saw higher log sequence numbers **will reject** stale regressed snapshots. Always restore your newest consistent backup pair. [Security Boundaries](/en/reference/security)
