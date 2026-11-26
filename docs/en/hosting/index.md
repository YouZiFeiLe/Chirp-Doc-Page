<script setup>
import DeploymentPicker from '../../.vitepress/theme/components/DeploymentPicker.vue'
</script>

# Self-Hosting from Scratch

Deploy Chirp on a single Linux server with [Docker Compose](https://docs.docker.com/compose/) to bring up both core coordination and real-time media forwarding: the Go server (`app`) handles Passkey authentication, member approvals, authorization logs, and room coordination, while [LiveKit](https://livekit.io/) (`livekit`) relays encrypted audio packets. Every client connects through one HTTPS domain.

## Network Topology at a Glance

Control APIs, Passkey login, and WebSocket signaling flow over **443/TCP (HTTPS / WSS)** behind your reverse proxy, while end-to-end encrypted audio packets stream directly over **7882/UDP** to LiveKit without traversing Nginx.

<NetworkTopologyDiagram />

## Step 1: Choose an HTTPS Ingress Strategy {#choose-https-ingress}

Chirp supports three deployment layouts. Keep your own proxy if Nginx and valid TLS certificates already run on the box, or let Compose spin up [SWAG](https://docs.linuxserver.io/images/docker-swag/) (Nginx + Certbot) to manage [Let's Encrypt](https://letsencrypt.org/) certificates automatically.

<DeploymentPicker />

## Step 2: Prepare Host, Domain & Firewall Ports

1. **Server host**: Provision a **Debian 13 (trixie) x86_64 / amd64** server with `sudo` access (published Docker images target `linux/amd64`).
2. **Dedicated subdomain & DNS**: Assign a dedicated subdomain (e.g., `voice.example.com`). WebAuthn Passkeys bind strictly to the origin and clients hit fixed root endpoints, so **subpath mounting (like `/chirp`) is not supported**.
   - Create an **A record** pointing to your Nginx proxy's public IPv4 address.
   - If using [Cloudflare](https://developers.cloudflare.com/dns/) DNS, set the proxy toggle to **DNS only** (grey cloud) and remove stale `AAAA` records pointing elsewhere.
3. **Media public IPv4**: Record the public IPv4 of the host running LiveKit for `CHIRP_RTC_NODE_IP`. On single-host setups this matches your A record; on split setups use the **media host's** real public IPv4.
4. **Open firewall / security group ports**:
   - `443/TCP` (required): to Nginx for web pages, APIs, and WebSocket signaling.
   - `80/TCP` (HTTP-01 only): to Nginx for ACME verification and HTTP-to-HTTPS redirect.
   - `7882/UDP` (required): to LiveKit for E2EE audio packets (forward `7882/UDP` verbatim through NAT if behind a router).
   - Keep your administrative SSH port accessible.

Verify DNS resolution from an external Linux machine before launching containers:

```sh
getent ahostsv4 voice.example.com | awk '{print $1}' | sort -u
```

## Step 3: Install Docker Engine & Compose

Sign in to your **Chirp backend host**. Skip this step if Docker Engine and **Compose 2.26+** are already present (Compose 2.26+ is required for inline Nginx config templates).

On a fresh Debian 13 (`amd64`) host, install from the official apt repository: [Docker Engine on Debian](https://docs.docker.com/engine/install/debian/)

```sh
sudo apt-get update
sudo apt-get install -y ca-certificates curl nano
sudo install -d -m 0755 /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/debian/gpg -o docker-signing-key.asc &&
  sudo install -m 0644 docker-signing-key.asc /etc/apt/keyrings/docker.asc
echo 'deb [arch=amd64 signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/debian trixie stable' |
  sudo tee /etc/apt/sources.list.d/docker.list >/dev/null
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
sudo systemctl enable --now docker
```

Confirm both binaries respond normally:

```sh
sudo docker version --format '{{.Server.Version}}'
sudo docker compose version
```

## Step 4: Fetch & Validate the Public Compose File

Create `~/chirp` and download the root `compose.yaml` (pulls prebuilt Docker Hub images and embeds SWAG rules). For existing instances, use the upgrade workflow instead. [Public Compose](https://github.com/YouZiFeiLe/Chirp/blob/main/compose.yaml) · [Upgrades & Backups](./maintenance.md)

```sh
mkdir -p ~/chirp
cd ~/chirp
curl -fL https://raw.githubusercontent.com/YouZiFeiLe/Chirp/main/compose.yaml -o compose.yaml &&
  sudo docker compose -f compose.yaml config --quiet
```

Once syntax checks pass, scroll back up to [Choose an HTTPS Ingress Strategy](#choose-https-ingress), complete `.env` for your selected route, start the containers, and finish [Verification & First Admin](./verification.md).
