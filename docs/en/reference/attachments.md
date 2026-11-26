# Attachment Transport & Caching (v3)

Chirp's v3 attachment protocol separates **encrypted control metadata** from **chunked HTTPS ciphertext storage**: senders seal files locally with a random 32-byte key under [AES-256-GCM](https://csrc.nist.gov/pubs/sp/800/38/d/final) (record format v1) and upload opaque ciphertext, while file keys, original filenames, and encrypted thumbnails travel **exclusively inside the room's end-to-end encrypted data channel to currently online peers**. [Server Attachment Store](https://github.com/YouZiFeiLe/Chirp/blob/main/internal/store/attachments.go)

Apple, Android, and Windows share identical record framing, chunk APIs, and receipts. [Apple Crypto](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/apple/Shared/AttachmentCrypto.swift) · [Android Crypto](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/android/app/src/main/kotlin/cn/youzifeile/chirp/data/AttachmentCrypto.kt) · [Windows Files](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/windows/engine/files_windows.go)

<AttachmentLifecycleDiagram />

## End-to-End Transfer & Recipient Eligibility

### Four-Step Send & Receive Flow

Senders must hold valid room entry authorization inside a verified secure group:

1. **Local record encryption**: Generate a random 32-byte file key, seal 256 KiB plaintext chunks into AES-256-GCM records, and compute full ciphertext [SHA-256](https://csrc.nist.gov/pubs/fips/180-4/final).
2. **Reserve & snapshot online recipients**: Reserve the object on the server, locking the recipient list to **in-room participants with an active attachment SSE stream** (or inside its 6s reconnect grace window); late arrivals never join retroactively.
3. **Broadcast encrypted descriptor**: Broadcast filename, MIME type, byte size, ciphertext digest, random file key, and optional encrypted thumbnail over the E2EE chat channel (batched ≤ 8 identities / 12 KiB per payload—**zero keys touch server logs or DB**).
4. **Chunked upload & commit**: Upload 1 MiB network chunks sequentially and call `/complete`. Downloads unlock only after full server-side hash verification passes.

### Why Missing the 6-Second Window Is Final

- **Bound to `entry_id` + live `GET /events` SSE**: Recipients open `GET /events` (2s keepalive) upon room entry. Disconnection grants a **6-second** reconnect grace period from disconnect detection.
- **Permanent `skipped` transition**: Exceeding 6s or losing entry auth flips pending deliveries to `skipped` permanently—even reconnecting on the same `entry_id` cannot recover earlier blobs.
- **Queues & manual pauses**: Concurrent defaults cap at 1 active upload + 1 auto download (+ manual triggers up to 2 downloads total). Manually paused downloads resist state refreshes until user resume.
- **Smooth rotations preserve scope**: Active transfers continue delivering solely to the original snapshot under the prior key—**never re-broadcasting old file keys to newly joined callers**.

## HTTPS Endpoints {#https-endpoints}

All routes share `/v1/rooms/{room}/attachments` and require **`Authorization: Bearer <credential>` + `X-Chirp-Entry: <entry_id>`** matching any body `entry_id` (`404 ATTACHMENT_UNAVAILABLE` otherwise).

| Endpoint | Request Rules & Behavior |
| --- | --- |
| `POST` (root) | Strict JSON: `id` (16B lowercase hex), `entry_id`, `ciphertext_size`, `ciphertext_sha256` (32B hex), `recipients` (≤ 256). Returns `201`. |
| `GET` (root) | Lists entry-visible objects, `server_id`, and `revision`. |
| `GET /events` | Attachment SSE stream (`state` events pulse list refresh; latest stream replaces prior for same `entry_id`). |
| `GET /{id}` | Returns object state, upload progress, and chunk digests (`chunk_sha256`). |
| `PUT /{id}/chunks/{index}` | Sequential 0-indexed 1 MiB uploads (`application/octet-stream`, exact `Content-Length`). Idempotent retries return `204`. |
| `GET /{id}/chunks/{index}` | Streams ciphertext chunks while **re-verifying entry, eligibility, and SSE presence every ≤ 64 KiB**. |
| `POST /{id}/pause` / `cancel` | Empty POST pausing or cancelling an incomplete upload. |
| `POST /{id}/complete` | Empty POST; verifies full chunk chain + `ciphertext_sha256` before transitioning to `completed`. |
| `POST /{id}/received` | Strict JSON `{"ciphertext_sha256": "..."}`; called **only after disk write, full hash verification, and per-record AEAD check**. |

::: info State Transitions & HTTP Status Codes
- JSON payloads fix `protocol_version=3` and `chunk_bytes=1048576`.
- When the last `pending` recipient confirms `received` or drops eligibility, status moves to `delivered`, ciphertext deletes immediately, and metadata lingers 5 minutes for idempotent retries.
- Premature downloads return `409 ATTACHMENT_PENDING`; skipped/mismatched chunks return `409 ATTACHMENT_CONFLICT`; quota overflow returns `413 ATTACHMENT_QUOTA`; concurrency saturation returns `429 ATTACHMENT_BUSY` (`Retry-After: 1`). [HTTP API](https://github.com/YouZiFeiLe/Chirp/blob/main/internal/httpapi/attachments.go) · [Delivery Store](https://github.com/YouZiFeiLe/Chirp/blob/main/internal/store/attachment_delivery.go)
:::

## Lifecycle, Quotas & Voice-First Throttling {#windows-quotas-throttling}

| State | Meaning |
| --- | --- |
| `reserved` | Metadata registered and recipients locked; zero chunks uploaded. |
| `uploading` | ≥1 chunk committed. |
| `paused` | Explicitly paused or inactive for **30 seconds** during reservation/upload. |
| `completed` | Full ciphertext verified; downloadable by `pending` recipients. |
| `delivered` | Zero `pending` recipients left; server blob deleted (client caches remain valid). |
| `cancelled` | Cancelled by uploader or invalidated uploader `entry_id`. |
| `expired` | Exceeded 15m upload or 15m delivery TTL; awaiting GC. |

- **Fixed TTLs**: Upload window **15 minutes** (non-renewable), post-complete delivery window **15 minutes**, terminal metadata retention **5 minutes** (1s online presence sweep, 1m disk GC). [State GC](https://github.com/YouZiFeiLe/Chirp/blob/main/internal/store/attachment_state.go)
- **Quotas**: 100 MiB plaintext cap (`16 B` to `100 MiB + 8192 B` ciphertext), **512 MiB / 256 objects per room**, **4 GiB / 4096 objects globally**. Byte quotas free on terminal state; object slots clear after metadata GC.
- **Previews & client reserve**: Client room cache budgets **512 MiB** including queued downloads. Preview images cap at **20 MiB / 60 MP** (256 px thumbnails ≤ 6 KiB encrypted, 2048 px full previews, GIF first-frame preview with original preserved on export). [Image Processor](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/apple/Shared/AttachmentImages.swift)
- **Voice-first throttling**: Runs at **8 MiB/s** per direction, dropping to **512 KiB/s** whenever active track quality is `poor` or jitter reaches **40 ms**, and pausing during track loss/reconnects (up to 4 retries with prefix-verified resume).

## Encrypted Record Format (v1) & Disk Hygiene

- **256 KiB AES-256-GCM records** (16B tag appended per record, decoupled from 1 MiB HTTP chunks; even 0-byte files emit 1 authenticated record).
- **12B Nonce & AAD**: `4 zero bytes + 64-bit big-endian record index`. UTF-8 AAD (`Chirp attachment AES256GCM v1`) binds **room ID, sender identity, object ID, plaintext size, record count, and record index**—stopping truncation, reordering, or splicing completely.
- **Thumbnail subkey**: Derived via `HKDF-SHA256` (`salt = object ID`, `info = "Chirp attachment thumbnail v1"`) using random Nonce and `index = -1` AAD.
- **Server `os.Root` & client `AttachmentLease` teardown**: Server rejects symlinks and colocated DB paths, caps global chunk handles at 16, `fsync`s sequential writes before SQLite commit, and cleans orphans on boot. Clients hold ciphertext solely in cloud-excluded directories and **destroy in-memory `AttachmentLease` keys before cancelling transfers and scrubbing disk files**. [Apple Cache](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/apple/Shared/AttachmentCache.swift) · [Android Attachments](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/android/app/src/main/kotlin/cn/youzifeile/chirp/media/RoomAttachments.kt) · [Windows Attachments](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/windows/engine/attachment_session_windows.go)
