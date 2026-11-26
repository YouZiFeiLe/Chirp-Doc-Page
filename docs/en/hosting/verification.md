# Public Verification & First Administrator

Regardless of HTTPS setup, post-install acceptance checks follow three steps: probe public routing externally, bootstrap the first administrator via SSH, and verify bidirectional voice across two real accounts.

## Step 1: Probe Endpoints from Outside the Server

Run from an **external machine** with internet access (replace `chirp_origin` without a trailing slash):

```sh
chirp_origin=https://voice.example.com
curl -fsS "$chirp_origin/healthz"
curl -sS -o /dev/null -w '%{http_code}\n' "$chirp_origin/authorization/healthz"
curl -sS -o /dev/null -w '%{http_code}\n' "$chirp_origin/rtc/v1/validate"
```

Verify expected responses:

| Path | Expected Response | What It Proves |
| --- | --- | --- |
| `/healthz` | HTTP `200`, JSON with `"status":"ok"` | Public HTTPS reaches `app`, and both SQLite databases are readable/writable. |
| `/authorization/healthz` | HTTP `204` | V5 authorization signing module is healthy. |
| `/rtc/v1/validate` | HTTP `401` | Unauthenticated signaling reaches LiveKit cleanly (`404` means `/rtc` reverse proxy routing is misconfigured). |

Open `https://voice.example.com/register` in your browser, confirm a trusted TLS lock icon, and check that **Request Access** renders cleanly. From now on, every registration, client login, and admin session must use this exact origin.

## Step 2: Bootstrap the First Administrator

Chirp ships with zero default admin logins or passwords. The initial administrator must be promoted via local server CLI:

1. **Register in browser first**: Open `/register`, enter a **3–15 letter ASCII handle**, create your Passkey, and copy the full `CHIRP-...` **Request ID**.
2. **Run bootstrap over SSH**: In `~/chirp` on the server, pass that request ID to `admin bootstrap`:
   ```sh
   cd ~/chirp
   sudo docker compose exec app /usr/local/bin/chirp admin bootstrap --request-id 'PASTE_FULL_REQUEST_ID'
   ```
3. **Open the Admin Console**: Visit `/admin/` (e.g., `https://voice.example.com/admin/`) in the same browser and sign in with your Passkey.

::: info Bootstrap runs only once
`admin bootstrap` targets a fresh empty database and succeeds only once. To promote additional admins or recover if all existing admins lose Passkeys, use `chirp admin grant` on the server CLI. [Admin Console Guide](./admin-console.md)
:::

4. **Approve a second account for testing**: Have a friend submit `/register` from their device, share their Request ID, and approve them inside `/admin/` → **Requests**.

## Step 3: Two-Party Bidirectional Voice Check

Passing `/healthz` alone never proves `7882/UDP` works—complete a real two-account call:

1. **Sign in on two separate approved accounts**: Enter the exact server HTTPS URL in two native clients (any mix of macOS, iOS, Android, Windows), complete Passkey login, set recovery passphrases, and store each `.chirpkey` backup.
2. **Join Public Lobby & compare SAS**: Enter the default **Public Lobby**, tap the other member to run SAS verification, compare all **3 security code groups** out-of-band, and wait for OpenMLS keying.
3. **Verify audio both ways**: Unmute both clients, allow microphone access, and confirm **A hears B and B hears A** over public `7882/UDP`.

If one or both directions stay silent or stall in verification, see [First Call](/en/guide/first-call) and [Troubleshooting](./troubleshooting.md).
