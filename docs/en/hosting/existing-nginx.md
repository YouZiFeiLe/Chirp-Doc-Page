# Using Existing Nginx & Certificates

If Nginx and valid TLS certificates already run on your server, keep Nginx in charge of TLS termination and renewal and start only `app` and `livekit` in Chirp's Compose stack.

Ensure you have finished [Host, Domain & Docker Setup](./index.md), your certificate covers your Chirp subdomain, `443/TCP` reaches Nginx, and `7882/UDP` reaches the media host.

## Step 1: Configure & Start `app` and `livekit`

On the backend host, create a permission-restricted `.env` file:

```sh
cd ~/chirp
touch .env && chmod 600 .env
nano .env
```

For Nginx running directly on the same Linux host OS, only two variables are needed. Replace `CHIRP_PUBLIC_ORIGIN` with your full HTTPS origin and `CHIRP_RTC_NODE_IP` with your media host's public IPv4 (`Ctrl+O`, Enter, `Ctrl+X` in Nano):

<<< @/.vitepress/snippets/existing-nginx.env{dotenv}

Pick upstream addresses matching your Nginx placement:

| Nginx Placement | App Upstream (`chirp_app_backend`) | Signaling Upstream (`chirp_livekit_backend`) | Additional Backend `.env` Setting |
| --- | --- | --- | --- |
| **Same-host native Nginx** | `127.0.0.1:18115` | `127.0.0.1:7880` | None—ports bind loopback by default. |
| **Separate host via LAN / VPN** | e.g., `10.0.0.20:18115` | e.g., `10.0.0.20:7880` | Set `CHIRP_HTTP_PUBLISH_IP=10.0.0.20` and restrict these TCP ports to Nginx's IP. |
| **Same-host Docker container** | `app:18115` | `livekit:7880` | Attach your Nginx container to Chirp's Compose network so DNS resolves `app` and `livekit`. |

Start `app` and `livekit` (without the `https` profile, so bundled Nginx stays off):

```sh
sudo docker compose config --services
sudo docker compose up -d --wait app livekit
sudo docker compose ps
```

`config --services` should print `app` and `livekit`, and both should become `healthy`.

If Nginx runs in another Docker container on the same host, attach it to Chirp's network (replace `my-nginx` with your container name). If managed by another Compose project, declare the external network cleanly so container rebuilds preserve connectivity: [Persistent Proxy Network Config](./operations.md#persistent-nginx-network)

```sh
sudo docker network connect chirp_default my-nginx
```

## Step 2: Configure Nginx Reverse Proxy Rules

On your **Nginx host**, download the reference template: [Nginx Upstream Template](https://github.com/YouZiFeiLe/Chirp/blob/main/deploy/nginx-upstreams.example.conf)

```sh
curl -fL https://raw.githubusercontent.com/YouZiFeiLe/Chirp/main/deploy/nginx-upstreams.example.conf -o chirp-nginx.conf &&
  nano chirp-nginx.conf
```

Update the template:

1. Point `chirp_app_backend` and `chirp_livekit_backend` at the table values for your topology.
2. Replace `server_name`, `ssl_certificate`, and `ssl_certificate_key` with your real domain and certificate paths.
3. Install into Nginx:
   - **New virtual host**:
     ```sh
     sudo install -m 0644 chirp-nginx.conf /etc/nginx/conf.d/chirp.conf
     ```
   - **Merging into an existing HTTPS `server` block**: Keep your listener and TLS directives; move `upstream`, `map`, and `limit_req_zone` into the global `http` context without duplicates, and merge the proxy headers and `location` blocks into your existing `server` block.

::: info Path Routing Boundaries
- `/rtc` and subpaths: enable WebSocket upgrade headers with long timeouts and proxy to `7880/TCP`.
- `/authorization/v5/`: proxy to `app:18115`, disable caching, and apply request rate limits.
- `/twirp/` and `/internal/`: return `404` immediately so LiveKit admin endpoints stay private.
- All other paths (`/`): proxy to `app:18115` with **`proxy_buffering off`** so [Server-Sent Events (SSE)](https://html.spec.whatwg.org/multipage/server-sent-events.html) stream instantaneously.
:::

## Step 3: Test Syntax & Reload Nginx

Native Nginx on the host:

```sh
sudo nginx -t && sudo systemctl reload nginx
```

Containerized Nginx (replace `my-nginx`):

```sh
sudo docker exec my-nginx nginx -t &&
  sudo docker exec my-nginx nginx -s reload
```

Once reloaded, proceed to [Verification & First Admin](./verification.md).
