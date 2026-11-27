# Client Diagnostic Log Specification (`.chirplog` v1)

`.chirplog` is Chirp's local diagnostic database format—a standard single-file **SQLite 3** database sharing identical English table schemas, event names, and strict redaction rules across macOS, iOS, Android, and Windows.

::: info Per-install local diagnostics—zero automatic upload
Recording state applies per app install across accounts/servers. Clients **never upload logs automatically**; users explicitly export the trailing 24-hour snapshot whenever sharing diagnostics.
:::

<ChirpLogDiagram />

## Switch Behavior & Lifecycle

- **Off by default**: Disabled on fresh install; configurable both before and after login under **Settings → Diagnostic Logs**.
- **Toggle semantics**: Enabling starts recording immediately (call quality and crypto metrics always run internally regardless); disabling stops new ingestion, flushes queued writes, and lets shards expire naturally after 24 hours.
- **Export & clear**: **Export Logs** merges the trailing 24-hour closed interval into one self-contained `.chirplog`; **Clear Logs** wipes shards/buffers while **keeping** the toggle state; sign-in **Clear Local Data** wipes logs and resets the switch off.

## Hourly Shards & 24-Hour Sliding Retention

- **UTC hour shards**: `<utc_hour>.chirplog` (`floor(unix_ms / 3600000)`), eliminating timezone/DST shifts.
- **Per-platform paths** (excluded from cloud backups):
  - **Apple (macOS / iOS)**: `Application Support/Chirp/ClientLogs/`
  - **Android**: `noBackupFilesDir/ClientLogs/`
  - **Windows**: `ClientLogs/` under the Go engine cache directory
- **Sliding trim**: `cutoff = now_ms - 86400000`. Entire expired shards unlink cleanly; boundary shards purge `time_ms < cutoff` with `PRAGMA secure_delete=ON` (removing empty shards afterward).

## SQLite Headers & 12 Standardized Tables

Every shard and export embeds standard SQLite markers: [SQLite PRAGMA Docs](https://www.sqlite.org/pragma.html#pragma_application_id)

| Marker | v1 Standard Value |
| --- | --- |
| SQLite Header | `SQLite format 3\0` |
| `PRAGMA application_id` | `1128813136` (`0x43485250`, ASCII `CHRP`) |
| `PRAGMA user_version` | `1` |
| Extension / Apple UTI | `.chirplog` · `cn.youzifeile.chirp.log` (`public.data`) |

All **12 tables** always exist (even when empty):

| Table | Scope | Sample `event` Names |
| --- | --- | --- |
| `application` | App lifecycle, runtime env, write overflows | `launch`, `active`, `background`, `storageOverflow` |
| `navigation` | Screen visits & toggles | `room`, `roomChat`, `friends`, `settings`, `logSettings` |
| `account` | Passkey/QR sign-in, cold-launch unlock, sign-out, profile | `browserLogin`, `phoneLogin`, `loginAccepted`, `saveLoginForRelaunch`, `loginWithoutResumptionGrant`, `sessionEnded`, `logout` |
| `identity` | Pairing, `.chirpkey`, SAS checks, friends | `approveDevice`, `verifyBackup`, `verificationMismatch`, `removeFriend` |
| `network` | HTTP/SSE timings, codes, retries | `preflight`, `groupHeartbeat`, `mediaLease`, `rotationActivate`, `eventStreamEnded` |
| `room` | Room entry operations | `join` |
| `call` | Call transitions & track quality samples | `lifecycle`, `trackSample` |
| `audio` | Device switches, VAD, presets | `selectInput`, `preferOutput`, `captureInitialized`, `changeActivationThreshold` |
| `crypto` | Voice, attachment & thumbnail crypto timings | `voiceDecrypt`, `attachmentDecrypt`, `thumbnailEncrypt` |
| `chat` | Drafts, message send/receive | `compose`, `restoreDraft`, `sendMessage`, `receiveAttachment` |
| `attachment` | Transfers, pause/cancel, preview, export | `selectFile`, `upload`, `retryUpload`, `previewAttachment`, `exportAttachment` |
| `settings` | Preferences, cache clear, log toggle | `confirmServer`, `changeLanguage`, `recordingEnabled`, `recordingDisabled`, `exportLogs` |

Uniform schema across all 12 tables (`call` example):

```sql
CREATE TABLE call (
    time_ms INTEGER NOT NULL,
    event TEXT NOT NULL,
    outcome TEXT,
    error_code TEXT,
    duration_us INTEGER,
    http_status INTEGER,
    details TEXT,
    segment TEXT NOT NULL,
    seq INTEGER NOT NULL
);
CREATE INDEX call_time ON call(time_ms);
```

## Telemetry Metrics & Allowlist Privacy Rules

- **`call.lifecycle`**: Captures `event`, `phase`, `sequence`, `elapsedMilliseconds` (monotonic timing from `authorizationStarted` to `activated`), `transportGeneration`, `keyRevision`, optional `failure` and `audio`.
- **`call.trackSample`**: Captures `schema=1`, local states, and anonymous `tracks` entries (`number`, `muted`, `subscribed`, `encryption`, `quality`, `packetsReceived/Lost`, `jitterMS`, `roundTripMS` capped at `600000` on Apple, `lastDecryptionEventAgeMS`).
- **`crypto.voiceDecrypt`**: Aggregates decrypted playout frame metrics (`frames`, `total_ns`, `max_ns`), flushing summaries periodically so high-frequency audio threads never block on disk I/O.

::: danger Strict Allowlist Redaction
LiveKit default logging is disabled at boot, and `.chirplog` uses an **explicit field allowlist**: never logs full HTTP bodies, stack traces, raw SDK dumps, account IDs, room IDs, names, fingerprints, server IPs/URLs, file paths, plaintext chat, audio, passwords, tokens, or keys.
:::

## Background Flushing, Export & SQL Examples

Writes batch serially per generation on a background queue; **Export** uses `ATTACH DATABASE` inside a rollback-journal SQLite output so exported `.chirplog` files are standalone single files. [SQLite ATTACH](https://www.sqlite.org/lang_attach.html) · [Apple Store](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/apple/Shared/ChirpLogStore.swift) · [Android Store](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/android/app/src/main/kotlin/cn/youzifeile/chirp/data/ChirpLogStore.kt) · [Windows Writer](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/windows/engine/client_log_windows.go)

Inspect headers and query mean/peak voice decryption latency (`µs`):

```sh
sqlite3 -readonly 'report.chirplog' 'PRAGMA application_id; PRAGMA user_version;'
```

```sql
SELECT sum(json_extract(details, '$.frames')) AS frames,
       sum(json_extract(details, '$.total_ns')) /
         (1000.0 * nullif(sum(json_extract(details, '$.frames')), 0)) AS mean_us,
       max(json_extract(details, '$.max_ns')) / 1000.0 AS max_us
FROM crypto WHERE event = 'voiceDecrypt';
```

Portability verification fixture (must evaluate to `3` frames, `mean_us = 50.0`, `max_us = 70.0`):

```sql
INSERT INTO crypto (time_ms, event, details, segment, seq) VALUES
(1800000000000, 'voiceDecrypt', '{"frames":2,"total_ns":80000,"max_ns":50000}',
 '51dd4149-46fa-432e-bb84-bab6d005e39c', 1),
(1800000001000, 'voiceDecrypt', '{"frames":1,"total_ns":70000,"max_ns":70000}',
 '51dd4149-46fa-432e-bb84-bab6d005e39c', 2);
```
