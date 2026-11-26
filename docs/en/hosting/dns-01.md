# Bundled Nginx with DNS-01 Certificates

If port `80/TCP` cannot be exposed publicly (ISP blocks port 80, firewall rules prohibit HTTP, or you prefer keeping plaintext HTTP off the internet), Certbot can prove domain ownership via **DNS-01** TXT records through your DNS provider's API.

This profile binds Nginx's HTTP listener strictly to loopback (`127.0.0.1:8080`), exposing only **443/TCP** and **7882/UDP** publicly. [How Let's Encrypt DNS-01 works](https://letsencrypt.org/docs/challenge-types/#dns-01-challenge)

## Step 1: Configure `.env` & DNS Plugin

On your prepared host ([Host, Domain & Docker Setup](./index.md)), create directories and `.env`:

```sh
cd ~/chirp
sudo install -d -m 0700 secrets
touch .env && chmod 600 .env
nano .env
```

The example below uses **Cloudflare**. Substitute your real `CHIRP_DOMAIN`, `CHIRP_RTC_NODE_IP`, and `CHIRP_ACME_EMAIL`, leaving `${CHIRP_DOMAIN}` intact:

<<< @/.vitepress/snippets/dns-01.env{dotenv}

For **Alibaba Cloud DNS**, change `CHIRP_DNS_PLUGIN=cloudflare` to `CHIRP_DNS_PLUGIN=aliyun`.

## Step 2: Create the DNS Credentials File

Certbot reads `secrets/swag/dns-conf/<plugin>.ini` matching `CHIRP_DNS_PLUGIN`. Follow the section for your provider.

### Option A: Cloudflare DNS

Create a scoped Cloudflare API Token granting only `Zone → DNS → Edit` on your target zone. [Certbot Cloudflare Plugin Docs](https://certbot-dns-cloudflare.readthedocs.io/en/stable/)

Create the restricted credentials file on the server:

```sh
sudo install -d -m 0700 secrets/swag/dns-conf
sudo touch secrets/swag/dns-conf/cloudflare.ini
sudo chmod 600 secrets/swag/dns-conf/cloudflare.ini
sudo nano secrets/swag/dns-conf/cloudflare.ini
```

Add your token:

```ini
dns_cloudflare_api_token = YOUR_SCOPED_TOKEN_HERE
```

### Option B: Alibaba Cloud DNS

Create a RAM AccessKey scoped strictly to DNS record management for your domain. [Certbot Aliyun Plugin Format](https://github.com/tengattack/certbot-dns-aliyun#credentials-file)

Create the credentials file:

```sh
sudo install -d -m 0700 secrets/swag/dns-conf
sudo touch secrets/swag/dns-conf/aliyun.ini
sudo chmod 600 secrets/swag/dns-conf/aliyun.ini
sudo nano secrets/swag/dns-conf/aliyun.ini
```

Fill in AccessKey ID and Secret:

```ini
dns_aliyun_access_key = YOUR_ACCESS_KEY_ID
dns_aliyun_access_key_secret = YOUR_ACCESS_KEY_SECRET
```

::: warning Protect DNS API credentials
These `.ini` files remain in `secrets/swag/dns-conf/` for automated renewals. Keep permissions at `0600` and encrypt full server archives when copying backups off-host.
:::

## Step 3: Start Services & Verify

Launch and wait for health checks:

```sh
sudo docker compose config --services
sudo docker compose up -d --wait --wait-timeout 600
sudo docker compose ps
```

All three containers (`app`, `livekit`, `nginx`) should turn `healthy`. Initial issuance can take a couple of minutes for TXT propagation; inspect `sudo docker compose logs --tail=100 nginx` if anything stalls.

Proceed to [Verification & First Admin](./verification.md).
