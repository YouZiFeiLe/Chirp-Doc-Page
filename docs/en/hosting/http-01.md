# Bundled Nginx with HTTP-01 Certificates

If your DNS `A` record points straight at this server and `80/TCP` is open to the public internet, this is the simplest automated setup: Compose launches SWAG (Nginx + Certbot) alongside Chirp to issue and renew Let's Encrypt TLS certificates automatically.

::: info Port Requirements
Requires **80/TCP** (ACME HTTP-01 challenges & HTTP→HTTPS redirect), **443/TCP** (APIs, Passkeys, and signaling), and **7882/UDP** (encrypted audio media). If another service already occupies port `80` or `443`, follow [Using Existing Nginx & Certificates](./existing-nginx.md) instead.
:::

Complete [Host, Domain & Docker Setup](./index.md) before proceeding. [How Let's Encrypt HTTP-01 works](https://letsencrypt.org/docs/challenge-types/#http-01-challenge)

## Step 1: Write `.env`

Prepare the `secrets` directory and restricted `.env` file on the server:

```sh
cd ~/chirp
sudo install -d -m 0700 secrets
touch .env && chmod 600 .env
nano .env
```

Replace the domain, ACME email, and public media IPv4 (`CHIRP_DOMAIN` takes the bare hostname without `https://`; keep `${CHIRP_DOMAIN}` intact inside `CHIRP_PUBLIC_ORIGIN`):

<<< @/.vitepress/snippets/http-01.env{dotenv}

## Step 2: Launch Services & Issue Certificate

Inspect the enabled service list and start the full stack with `--wait`:

```sh
sudo docker compose config --services
sudo docker compose up -d --wait --wait-timeout 600
sudo docker compose ps
```

With `COMPOSE_PROFILES=https`, `config --services` outputs `app`, `livekit`, and `nginx`. First boot takes 1–3 minutes to pull images and finish HTTP-01 issuance. Once ready, all three services show `healthy` (bundled Nginx verifies `/healthz` over port 443 using your hostname and trusted cert).

::: tip If startup times out or `nginx` reports `unhealthy`
Inspect `sudo docker compose logs --tail=100 nginx` for Certbot output. Typical causes include unpropagated DNS, blocked `80/TCP` in cloud security groups, or port conflicts on `80`/`443`. [Troubleshooting](./troubleshooting.md)
:::

## Where Certificates Live

Issued chains, private keys, ACME account credentials, and renewal config persist in `secrets/swag/`. Back up `secrets/swag/` alongside Docker volumes before upgrades or migrations. [Verification & First Admin](./verification.md) · [Upgrades & Backups](./maintenance.md)
