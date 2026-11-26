# Admin Console & Administrator Guide

Chirp provides a built-in web admin console at `/admin/` on your server's public origin (for example `https://voice.example.com/admin/`). Console actions require an active 8-hour admin browser session (mutations enforce same-origin validation), while **granting or revoking admin privileges itself is strictly restricted to server-side CLI** so web compromises cannot self-escalate.

## Authentication & Permission Boundaries

1. Sign in with Passkey at `/`; accounts holding the admin role see a link to **Admin Space** (or open `/admin/` directly).
2. Disabling, deleting, or CLI-demoting an administrator immediately invalidates their active browser sessions.
3. Supports live Chinese/English switching and light/dark theming; destructive actions (deleting rooms, revoking devices, banning accounts) prompt confirmation and record audit entries.

<AdminSessionCascadeDiagram />

## The Five Console Views

### 1. Members

Inspect every approved member's enabled status, active room placement, creation date, and current login session, with instant filtering (**All / Enabled / Disabled**).

- **Edit member**: Rename display name (1–80 chars, synced on next room join) or toggle enabled state (disabling immediately terminates active media connections and locks login).
- **Revoke active session**: Disconnects the current native client Bearer token without banning the account—the user can sign back in via Passkey anytime.
- **Inspect devices & permanent blacklist**: View each registered device (name, platform, fingerprint, created/last-used timestamps) and audit the global **Permanent Blacklist**.
  > [!CAUTION] Revoking a member's last valid device bans the account permanently
  > Self-service clients prevent users from revoking their own last device. In `/admin/`, admins *can* revoke any device; revoking an account's **final active device** (even your own admin account) adds both account and device to the immutable blacklist permanently—the handle is never freed and `.chirpkey` cannot unban it.
- **Delete member**: Removes the account and drops active media sessions, guarded by **Last-Administrator Protection** so you cannot lock yourself out by deleting or disabling the sole remaining admin.

### 2. Registrations

Review incoming `/register` requests (the server retains at most **100 pending registrations** at a time—prune stale unclaimed entries periodically):

- **Registration toggle (Open / Closed)**: Pause new registrations globally with one click. While closed, `/register` rejects new submissions, yet **admins can still approve or delete earlier pending entries** and existing members sign in normally. If locked out with registration closed, run `chirp admin reopen-registration` via CLI.
- **Verify Request ID & Approve / Delete**: Ask applicants for their exact `CHIRP-...` receipt ID, match username + request ID in search, and click **Approve** (or **Delete** lost receipts so they can reapply).

### 3. Rooms

Fresh servers include a non-deletable default lobby (**Public Lobby**, internal ID `friends`) which you can freely rename, describe, or password-protect.

- **Create & delete rooms**: Spin up extra voice channels anytime. Deleting an active room immediately terminates room authorizations and media sessions while keeping members logged into the directory.
- **Name & description**: Names allow 1–80 chars; descriptions allow 1–280 multiline chars (saving empty resets defaults). Changes broadcast live without interrupting active calls.
- **Room password**: Optional **8–128 char** password (up to 512 UTF-8 bytes; leading/trailing spaces preserved verbatim), hashed with a random 16-byte salt and [Argon2id](https://datatracker.ietf.org/doc/html/rfc9106). To stop online brute-forcing, the server enforces a **5 failed attempts per 30 seconds** limit per member per room (`429 ROOM_PASSWORD_RATE_LIMITED`, tracking up to 256 active member/room windows).
  ::: info Password updates apply to new entries only
  Changing or removing a room password **affects only subsequent joins**; current callers remain connected, and passwords never participate in voice encryption. Use **Remove Member** or **End Call** to clear a room immediately.
  :::
- **Live participants & moderation**: View active LiveKit callers, kick individual members (revokes that room entry only), or click **End Current Call** to close all secure groups and media sessions in that room.

### 4. Client Versions

Configure independent minimum version policies for `ios`, `macos`, `windows`, and `android` (applies immediately to new discovery/login checks without dropping active calls):

| Field | Format & Rule | Effect |
| --- | --- | --- |
| **Latest Version / Build** | Three integers (e.g., `2026.11.24`) + positive build integer | Signals available updates to clients. |
| **Minimum Version / Build** | Must not exceed the corresponding latest version/build | Compares 3-part tuple first, then build integer. Older clients fail discovery, code exchange, or QR claim with `CLIENT_UPDATE_REQUIRED`. |

### 5. System

Real-time health summary: enabled member count, callers online, pending requests, LiveKit management connectivity, SQLite engine version, transport (`UDP · E2EE`), and quick `/healthz` test trigger.

## Administrator CLI Reference

Role elevation/demotion, initial bootstrap, and emergency recovery run inside `~/chirp` via `sudo docker compose exec app /usr/local/bin/chirp`: [CLI Source](https://github.com/YouZiFeiLe/Chirp/blob/main/cmd/chirp/main.go)

| Command | Purpose & Notes |
| --- | --- |
| `admin bootstrap --request-id <ID>` | Approves a pending request as the database's **first** admin (single-use per DB). |
| `member list` | Outputs all accounts as JSON (`id`, nickname, enabled status, admin flag). |
| `admin grant --id <memberID>` | Promotes an existing member to administrator. |
| `admin grant --request-id <ID>` | Approves a pending request directly as administrator (emergency Passkey loss recovery). |
| `admin revoke --id <memberID>` | Removes admin role (subject to Last-Administrator Protection). |
| `admin reopen-registration` | Reopens `/register` if disabled. |
| `member disable --id <memberID>` | Permanently disables a member (subject to Last-Administrator Protection). |
| `version` | Prints app version, SQLite version, and database schema version. |
