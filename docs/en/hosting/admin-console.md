# Admin Console & Administrator Guide

Chirp provides a built-in web admin console at `/admin/` on your server's public origin (for example `https://voice.example.com/admin/`). Console actions require an active 8-hour admin browser session (mutations enforce same-origin validation), while **granting or revoking admin privileges itself is strictly restricted to server-side CLI** so web compromises cannot self-escalate.

## Authentication & Permission Boundaries

1. Sign in with Passkey at `/`; accounts holding the admin role see a link to **Open admin console** (or open `/admin/` directly).
2. Disabling, deleting, or CLI-demoting an administrator immediately invalidates their active browser sessions.
3. Supports live Chinese/English switching and light/dark theming; destructive actions (deleting rooms, revoking devices, banning accounts) prompt confirmation and record audit entries.

<AdminSessionCascadeDiagram />

## The Five Console Views

### 1. Members

Inspect every approved member's account status (**Active / Banned**), current room placement, join date, and app session, with instant search and filtering (**All / Active / Banned**).

- **Rename member**: Click **Edit** to open the **Rename member** dialog (1–80 chars, synced on next room join).
- **Ban permanently**: Use the row-level **Ban permanently** action to immediately terminate active sessions, disconnect all voice rooms, and place the account and all associated devices on the immutable blacklist (username remains reserved).
- **Sign out session**: Forces the current native client session to sign out without banning the account—the user can sign back in via Passkey anytime.
- **Devices & permanent blacklist**: Click **Devices** to inspect registered hardware (name, platform, device fingerprint, first-registered and last sign-in timestamps), or audit the global **Permanent blacklist**.
  > [!CAUTION] Revoking a member's last valid device bans the account permanently
  > Self-service clients prevent users from revoking their own last device. In `/admin/`, admins *can* revoke any device; revoking an account's **final active device** (even your own admin account) adds both account and device to the immutable blacklist permanently—the handle is never freed and `.chirpkey` cannot unban it.
- **Delete member**: Removes the account and drops active media sessions, guarded by **Last-Administrator Protection** so you cannot lock yourself out by deleting or disabling the sole remaining admin.

### 2. Requests (Applications)

Review incoming `/register` requests (the server retains at most **100 pending registrations** at a time—prune stale unclaimed entries periodically):

- **Accept new applications switch**: Toggle whether new `/register` submissions are accepted globally (accompanied by an **Open / Paused** status badge). While switched off (**Paused**), `/register` rejects new submissions, yet **admins can still approve or delete earlier pending entries** and existing members sign in normally. If locked out with registration paused, run `chirp admin reopen-registration` via CLI.
- **Verify Request ID & Approve / Delete**: Filter by **Pending / Approved / All**, use the inline **Copy** button next to any `CHIRP-...` ID, match nickname + application ID, and click **Approve** (or **Delete** lost receipts so applicants can reapply).

### 3. Rooms (Voice rooms)

Uses a master-detail workspace with a **Rooms** directory on the left and live settings/participants on the right. Fresh servers include a non-deletable default lobby (**Public lobby**, internal ID `friends`, badged **Default lobby**) whose delete button stays hidden while still allowing renames, descriptions, and passwords.

- **Add & delete rooms**: Click **Add room** in the header to create channels in a modal dialog; deleting a custom room from its **Danger zone** immediately terminates room authorizations and media sessions while keeping members signed in.
- **Name & description**: Names allow 1–80 chars; descriptions allow 1–280 multiline chars with a live `0 / 280` counter (saving empty resets defaults). Changes sync live without interrupting active calls.
- **Entry password**: Optional **8–128 char** password (up to 512 UTF-8 bytes; leading/trailing spaces preserved verbatim; includes a show/hide password toggle), hashed with a random 16-byte salt and [Argon2id](https://datatracker.ietf.org/doc/html/rfc9106). To stop online brute-forcing, the server enforces a **5 failed attempts per 30 seconds** limit per member per room (`429 ROOM_PASSWORD_RATE_LIMITED`, tracking up to 256 active member/room windows).
  ::: info Password updates apply to new entries only
  Changing or removing a room password **affects only subsequent joins**; current callers remain connected, and passwords never participate in voice encryption. Use **Remove** or **End current call** to clear a room immediately.
  :::
- **Active media connections & moderation**: View active LiveKit callers, kick individual members (**Remove** revokes that room entry only), or click **End current call** to close all secure groups and media sessions in that room.

### 4. Versions (Client versions)

Four interactive platform selector cards (`iOS`, `macOS`, `Windows`, `Android`; displaying an **Unsaved** badge for unpersisted edits) feed a paired policy editor below—applies immediately to new discovery/login checks without dropping active calls:

| Field | Format & Rule | Effect |
| --- | --- | --- |
| **Latest version / build** | Three integers (e.g., `2026.11.24`) + positive build integer | Signals available updates to clients. |
| **Minimum supported version / build** | Must not exceed the corresponding latest version/build | Compares 3-part tuple first, then build integer. Older clients fail discovery, code exchange, or QR claim with `CLIENT_UPDATE_REQUIRED`. |

### 5. Status (Service status)

Four clickable overview cards at the top summarize **Active members**, **In voice rooms**, **Pending requests**, and **Voice service** health; the Status view displays LiveKit management API connectivity, SQLite engine version, transport (`UDP · End-to-end encrypted`), single-device session enforcement, and a quick **Health endpoint** link (`/healthz`).

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
