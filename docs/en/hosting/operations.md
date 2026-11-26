# Server Configuration & Operations Reference

Complete reference for Chirp server environment variables, reverse-proxy rules, health probes, differences between the public prebuilt Compose and source-build Compose files, and persistent volume migration. [Getting Started](/en/hosting/) · [Admin Console](./admin-console.md) · [Upgrades & Backups](./maintenance.md)

## Environment Variables {#env-reference}

The root `compose.yaml` reads `.env` in the same directory (recommended host: Debian 13 `linux/amd64`). Apply `.env` updates with `sudo docker compose up -d --wait`. [Public Compose](https://github.com/YouZiFeiLe/Chirp/blob/main/compose.yaml) · [Config Loader Source](https://github.com/YouZiFeiLe/Chirp/blob/main/internal/config/config.go)

| Variable | Default (Public Compose) | Purpose & Constraints |
| --- | --- | --- |
| `COMPOSE_PROFILES` | empty | Set `https` to launch bundled SWAG Nginx + Certbot; leave empty for external Nginx or local dev. |
| `CHIRP_DOMAIN` | empty | Bare hostname for bundled Certbot certificate issuance (no `https://`). |
| `CHIRP_ACME_EMAIL` | empty | Contact email for Let's Encrypt expiry notices. |
| `CHIRP_ACME_METHOD` | `http` | Certificate challenge method: `http` (HTTP-01) or `dns` (DNS-01). |
| `CHIRP_DNS_PLUGIN` | `cloudflare` | Certbot DNS plugin name (`cloudflare`, `aliyun`, etc.), matching `secrets/swag/dns-conf/<plugin>.ini`. |
| `CHIRP_NGINX_HTTP_BIND` | `0.0.0.0:80` | Host bind for Nginx HTTP (set `127.0.0.1:8080` in DNS-01 mode). HTTPS always binds `443/TCP`. |
| `CHIRP_IMAGE` | `docker.io/youzifeile/chirp-server:latest` | Pin to a specific tag or `@sha256:...` digest in production. |
| `CHIRP_PUBLIC_ORIGIN` | `http://localhost:18115` | Full client/browser origin (optional port). Controls WebAuthn RP ID, discovery, and WSS links. Must be `https://` in production (`http://` allowed only for `localhost`). |
| `CHIRP_RTC_NODE_IP` | empty | Public IPv4 reachable on `7882/UDP` for LiveKit media. Forward port `7882/UDP` identically if behind NAT. |
| `CHIRP_HTTP_PUBLISH_IP` | `127.0.0.1` | Host interface exposing `18115/TCP` and `7880/TCP` (set private/VPN IP for remote reverse proxies). |
| `CHIRP_LOG_LEVEL` | `info` | Log verbosity: `debug`, `info`, `warn`, or `error`. |
| `CHIRP_LOG_SERVER_ENABLED` | `false` | When `true`, streams JSON logs asynchronously to [VictoriaLogs](https://docs.victoriametrics.com/victorialogs/) and disables local daily log files. |
| `CHIRP_LOG_SERVER_URL` | empty | Base HTTP(S) endpoint for VictoriaLogs (no query string, auth, or fragment). |
| `CHIRP_TOKEN_TTL` | `5m` | Short-lived LiveKit room [JWT](https://datatracker.ietf.org/doc/html/rfc7519) lifetime (`1s` to `15m`). |
| `CHIRP_GROUP_ROTATION` | `60s` | Scheduled E2EE room key rotation period (`30s` to `30m`). |
| `CHIRP_AUTHORIZATION_KEY_FILE` | `/usr/share/chirp/authorization-key.default` | Authorization snapshot signing seed path. Prebuilt image embeds the open-source default seed; mount your own key for private trust control. [Signing Keys](/en/reference/authorization-keys) |

## Public Compose vs. Source-Build Compose

Two Compose definitions exist in the repository—keep them distinct:

| Aspect | Root `compose.yaml` (Recommended Production) | `deploy/compose.yaml` (Source Builds & Legacy) |
| --- | --- | --- |
| **Image source** | Pulls Docker Hub image `youzifeile/chirp-server` | Builds `deploy/Dockerfile` `app` target locally |
| **HTTPS ingress** | Built-in `https` profile launches SWAG Nginx | No Nginx included—requires external proxy |
| **Storage** | Named Docker volumes (`data`, `logs`, `media-keys`) | Host bind mounts (`./data`, `./log`, `./authorization-data`) |
| **Signing key** | Defaults to bundled open-source seed (overridable) | Requires `./secrets/authorization-key` mount |
| **LiveKit keys** | `app` auto-generates `keys.json` on first boot | Manual `LIVEKIT_API_SECRET` (≥ 32 chars) + `deploy/livekit.yaml` |

Reference files in the repo: [`deploy/compose.yaml`](https://github.com/YouZiFeiLe/Chirp/blob/main/deploy/compose.yaml) · [`deploy/.env.example`](https://github.com/YouZiFeiLe/Chirp/blob/main/deploy/.env.example) · [`deploy/livekit.yaml.example`](https://github.com/YouZiFeiLe/Chirp/blob/main/deploy/livekit.yaml.example).

## Reverse Proxy Paths & Port Boundaries

Apply these exact routing rules whether using bundled SWAG or your own [Nginx](https://nginx.org/):

| Path / Port | Backend Target | Proxy & Security Requirements |
| --- | --- | --- |
| `/rtc` and `/rtc/*` | `livekit:7880/TCP` | Preserve full path and query string, pass `Upgrade` / `Connection` WebSocket headers, set long timeout (`3600s`). |
| `/authorization/v5/*` | `app:18115/TCP` | Preserve raw path, enforce rate limit (e.g., `10r/s`) and small body cap (`64k`), disable caching. |
| `/twirp/*`, `/internal/*` | Return `404` at proxy | Internal LiveKit admin RPC—never expose publicly. |
| All other HTTP (`/register`, `/admin/`, `/v1/`, etc.) | `app:18115/TCP` | Forward `Host`, `X-Forwarded-Proto`, `X-Real-IP`, and disable buffering (`proxy_buffering off`) so [SSE](https://html.spec.whatwg.org/multipage/server-sent-events.html) streams instantly. |
| Encrypted voice media | Direct to media host `7882/UDP` | Bypasses Nginx completely. TURN, media TCP fallback, and public IP probing remain disabled. |

### Persistent Network Config for External Nginx Containers {#persistent-nginx-network}

If an existing Nginx container lives in a separate Compose project, `docker network connect` does not survive container recreation. Declare Chirp's default network as external inside your Nginx `compose.yaml`: [Docker Compose Networking](https://docs.docker.com/compose/how-tos/networking/)

```yaml
services:
  nginx:
    networks: [default, chirp_backend]

networks:
  chirp_backend:
    external: true
    name: chirp_default
```

Apply with `docker compose up -d nginx`, then target `app:18115` and `livekit:7880`. **Remember to run `nginx -t && nginx -s reload` whenever Chirp containers recreate** so Nginx picks up updated container IPs.

## Certificate Maintenance, Switching & Diagnostics

- **Bundled certificates (SWAG)**: [LinuxServer SWAG Docs](https://docs.linuxserver.io/images/docker-swag/)
  ```sh
  sudo docker compose logs --tail=100 nginx
  sudo docker compose exec nginx certbot certificates --config-dir /config/etc/letsencrypt
  ```
- **Migrating between bundled & external Nginx**:
  - *Bundled → External*: Keep domain and volumes untouched; run `sudo docker compose --profile https stop nginx`, remove `COMPOSE_PROFILES=https` from `.env`, then configure [Existing Nginx](./existing-nginx.md).
  - *External → Bundled*: Free `443/TCP` (and `80/TCP` for HTTP-01), enable the `https` profile, verify certs and voice before stopping the old renewal timer.
- **Health probes & log collection**:
  ```sh
  sudo docker compose ps
  sudo docker compose exec app /usr/local/bin/chirp version
  curl -fsS http://127.0.0.1:18115/livez
  curl -fsS http://127.0.0.1:18115/healthz
  curl -fsS -o /dev/null -w '%{http_code}\n' http://127.0.0.1:18115/authorization/healthz
  sudo docker compose logs --tail=100 livekit
  sudo docker compose cp app:/app/log/. ./chirp-logs
  ```
  `/livez` (`200`) checks liveness; `/healthz` (`200`) verifies both [SQLite WAL](https://www.sqlite.org/wal.html) databases (`chirp.db` + `authorization.db`); `/authorization/healthz` (`204`) checks the authorization DB independently. [Router Source](https://github.com/YouZiFeiLe/Chirp/blob/main/internal/application/application.go)

## Persistent Volume Layout & Migration {#backup-and-migration}

| Compose Volume (project `chirp`) | Container Path | Stored State |
| --- | --- | --- |
| `chirp_data` | `/data` | `chirp.db`, `authorization.db`, WAL/SHM files, `attachments/` ciphertext cache. |
| `chirp_media-keys` | `/var/lib/chirp-media` | Shared `keys.json` (written by `app`, read-only on `livekit`). |
| `chirp_logs` | `/app/log` | Daily rolling server JSON Lines logs (retains today + prior 6 days). |

**Migrating from `deploy/compose.yaml` to root `compose.yaml`**:
1. Stop the old stack and back up all bind directories.
2. Populate the pre-created `chirp_data` volume root with `chirp.db`, `attachments/`, and `authorization.db` (plus `-wal`/`-shm`) from both old bind directories.
3. Verify `65532:65532` ownership, mount your matching signing seed if custom, and preserve `CHIRP_PUBLIC_ORIGIN` (Passkeys remain bound to that exact domain).

## Ephemeral Dev / Clean-Slate Stacks

Chirp opens only an empty database or schema `23` exactly. To test bootstrap or schema creation cleanly without touching production volumes, stop conflicting port listeners and start a separate project name:

```sh
sudo docker compose -p chirp-dev up -d --wait
```
