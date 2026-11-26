# Troubleshooting by Symptom

Whenever deployment or voice calls misbehave, check service status and recent container logs inside `~/chirp` (`https` profile runs `app`, `livekit`, `nginx`; external proxy setups run `app` and `livekit`):

```sh
cd ~/chirp
sudo docker compose config --services
sudo docker compose ps --all
sudo docker compose logs --tail=80 app livekit
```

## 1. Config Download or Image Pull Fails

| Symptom | Cause & Fix |
| --- | --- |
| `curl` returns **404** for `compose.yaml` | Confirm URL points to root `compose.yaml` on `main`. [View Compose](https://raw.githubusercontent.com/YouZiFeiLe/Chirp/main/compose.yaml) |
| Image pull says `manifest unknown` | Check `CHIRP_IMAGE` repo and tag in `.env` against [Docker Hub Tags](https://hub.docker.com/r/youzifeile/chirp-server/tags). |
| Architecture mismatch or syntax error | Check `dpkg --print-architecture` equals `amd64` and `sudo docker compose version` is `2.26+`. [Getting Started](./index.md) |

## 2. Bundled Nginx Certificate Issuance Fails or Stays `unhealthy`

Inspect `nginx` logs and host TCP listeners:

```sh
sudo docker compose logs --tail=100 nginx
sudo ss -ltnp
```

| Log / Status Symptom | What to Check |
| --- | --- |
| **Address already in use** | Both bundled profiles need `443/TCP`; HTTP-01 needs `80/TCP`; DNS-01 defaults to `127.0.0.1:8080`. Stop conflicting listeners or switch to [Existing Nginx](./existing-nginx.md). |
| **HTTP-01 challenge failed** | Verify public `A` record points to your host (Cloudflare set to DNS-only) and firewall/security groups allow `80/TCP`. [HTTP-01 Guide](./http-01.md) |
| **DNS-01 plugin or credential error** | Match `CHIRP_DNS_PLUGIN` to `secrets/swag/dns-conf/<plugin>.ini`, verify `0600` permissions, scoped API token permissions, and TXT propagation logs. [DNS-01 Guide](./dns-01.md) |
| **Certificate issued, yet container `unhealthy`** | Health check queries `/healthz` over `443` with `CHIRP_DOMAIN` SNI. Confirm `app` is `healthy` and `CHIRP_DOMAIN` matches the cert. |

Force-recreate `nginx` after fixing config:

```sh
sudo docker compose up -d --force-recreate --wait --wait-timeout 600 nginx
sudo docker compose ps
```

## 3. Existing Nginx Returns `502 Bad Gateway` or `404` on `/rtc`

Probe both upstreams directly from the **Nginx host (or proxy container network)** (substitute LAN IP or `app:18115` / `livekit:7880`):

```sh
curl -sS -o /dev/null -w '%{http_code}\n' http://127.0.0.1:18115/healthz
curl -sS -o /dev/null -w '%{http_code}\n' http://127.0.0.1:7880/rtc/v1/validate
```

- First command must return **`200`**, second must return **`401`**. If unreachable, verify `CHIRP_HTTP_PUBLISH_IP`, firewalls, or Docker network attachment.
- If direct probes succeed yet public `/rtc/v1/validate` returns **`404`**, fix Nginx's `/rtc` `location` rule (e.g., avoid trailing slash rewriting in `proxy_pass` and preserve `Upgrade` / `Connection` WebSocket headers).
- Whenever Chirp containers recreate behind a Dockerized Nginx proxy, run `nginx -s reload` to flush stale container IP caches. [Existing Nginx](./existing-nginx.md)

## 4. Browser Loads, Registration or Login Fails

- **Passkey errors or origin mismatch**: Open `/register` directly, confirm trusted TLS without warnings, and verify `CHIRP_PUBLIC_ORIGIN` in `.env` matches the browser and client URL character-for-character (including port). Re-run `sudo docker compose up -d --wait --wait-timeout 600` after editing `.env`.
- **Stuck "Pending Approval"**: Approve requests in `/admin/` → **Requests**, or run `chirp admin bootstrap` for a fresh database's first account. [Verification](./verification.md)
- **`NETWORK_TIME_REQUIRED`**: Device clock drifted too far or NTP (`123/UDP`) is blocked; enable automatic network time sync and retry.
- **Other device kicked offline**: Expected—Chirp allows only one active client login session per account at a time.

## 5. Joined Room Cleanly, Zero Audio or One-Way Audio

Check from endpoint out to network:

1. **Verification status**: Confirm no peer displays **Verification Required**. Unverified devices mute voice and data across the whole room.
2. **Local mic & output state**: Have the speaker confirm mute is off, VAD threshold isn't too high, and OS mic permission is granted; have the listener check Deafen is off, output device is right, and per-member gain isn't `0%`. [Audio & Profile](/en/guide/audio-and-profile)
3. **`CHIRP_RTC_NODE_IP` & `7882/UDP`**: Verify `CHIRP_RTC_NODE_IP` holds the media host's reachable public IPv4 and **`7882/UDP` inbound** passes through cloud security groups, host firewall, and router NAT. Chirp streams media exclusively over UDP with no TCP fallback or external TURN.
4. **LiveKit logs**: Run `sudo docker compose logs --tail=80 livekit` during a live test call to inspect ICE candidate pairs, update `.env`, recreate containers, and confirm two-way audio again.
