# Manual QA & Release Acceptance Checklist

Release checklist for verifying real-device acoustics, OS Passkey prompts, background call survival, Bluetooth audio handoff, and cross-platform interoperability before shipping (for quick deployment checks, see [Verification & First Admin](/en/hosting/verification)). [Server Build & Testing](/en/development/building) · [Native Client Builds](/en/development/clients)

::: info Priority & Severity Rubric
- **Test Priority**: **P0** covers access boundaries, cryptography, and core flows (all P0 cases must pass before release); **P1** covers edge interactions, polish, and recovery paths.
- **Defect Severity**: **S0 (Blocker)** covers privilege escalation, cross-room leaks, unauthorized mic open, or deleting external user files; **S1 (Critical)** blocks login/two-way audio or causes crashes/background disconnects; **S2 (Major)** has a workaround; **S3 (Minor)** covers copy or UI polish.
:::

## Setup & Input Boundary Samples

Prepare at least two real devices running **release builds** across target platforms, two approved standard accounts (A & B), one admin account, plus rooms `R0` (lobby), `R1` (open room), and `R2` (password-protected). Prepare account C for 3-way pairing and a spare device for session takeover. Run destructive admin tests only in isolated test environments.

Pair combinations across macOS, iOS, Android, and Windows, swapping talker/listener directions with identical vocal test samples (soft voice onset, quiet trails, pauses, double-talk barge-in, keyboard/fan background noise, speaker echo).

| Field / Resource | Boundary Inputs & Expected Enforcement |
| --- | --- |
| **Registration handle** | 2 / 3 / 15 / 16 ASCII letters, case duplicates, digits/CJK/spaces. Enforces 3–15 ASCII letters, case-insensitive uniqueness. |
| **Display / room name** | 1 / 80 / 81 Unicode scalars, whitespace-only, control chars, CJK + emoji. Trims edges; enforces 1–80 chars. |
| **Room password** | 7 / 8 / 128 / 129 scalars, 512 UTF-8 bytes, control chars, leading/trailing spaces (matched verbatim). [Password Hash Source](https://github.com/YouZiFeiLe/Chirp/blob/main/internal/store/room_password.go) |
| **Chat message** | 4095 / 4096 / 4097 UTF-8 bytes (hint: `中`×1365＋`a` or `😀`×1024 = 4096 bytes with no trailing newline). |
| **Standard file attachment** | 0 B, 1 B, around 1 MiB, 32 MiB, 100 MiB, `100 MiB + 1B`. Verify SHA-256 matches exported file byte-for-byte. |
| **Image attachment** | Real JPEG/PNG/HEIC/WebP/GIF at 20 MiB and 60 MP limits, EXIF rotation, alpha channel, malformed files. GIF previews first frame; export stays animated. |
| **Avatar** | Static `< 5,000,000` bytes, `8192` px side, `32 MP` limits. Clients convert HEIC locally; API accepts JPEG/PNG. |
| **Quotas & windows** | Upload TTL (15m), delivery TTL (15m), SSE grace (6s), object caps—never conflate total objects with `pending` counts. [Attachment Spec](/en/reference/attachments#windows-quotas-throttling) |

## 8-Step Fast Release Smoke Test

1. Cold-launch real packaged builds; check icons, version string, permissions, and ensure no preview flags are active.
2. Confirm HTTPS server address, register and admin-approve new accounts, set ≥16-char passphrase, export `.chirpkey`, wait 5s, and confirm.
3. Join a room with two unverified devices; verify locked pause state, compare 3 SAS groups out-of-band, confirm both sides, manually unmute, and verify mute/deafen.
4. Exchange CJK text, images, and standard files both ways; export and compare SHA-256 digests.
5. While in an active call, enter a wrong room password or cancel password prompt for `R2`—confirm the **active call continues undisturbed**; then enter the valid password and confirm clean single-room switch.
6. Bring member C into the room, verify missing pairs, confirm post-keying default mute state, and confirm re-keying when C leaves.
7. Test lifecycle behavior while transmitting audio/files: closing Mac window retains active call; closing Windows `×` tears down both processes immediately; test mobile lock/backgrounding.
8. Verify admin kick, new-device takeover, room re-entry, and force-quit restart (room chat wiped; cold start requires re-auth).

## Detailed Module Test Matrix

### Installation, Discovery & Authentication

- [ ] **ENV-01｜P0** Cold-launch release build; verify icons, version, OS privacy prompts; fresh install starts with empty server URL and zero leftover session state on relaunch.
- [ ] **CFG-02｜P0** Discovery checks valid HTTPS URL and registration toggle; editing URL requires confirmation; invalid/mismatched/TLS-error URLs preserve prior valid config without allowing login.
- [ ] **CFG-05｜P0** Release builds reject `http://` (Debug allows `localhost` only); refreshes do not bypass minimum version checks.
- [ ] **REG-01｜P0** Registration validates 3–15 letters case-insensitively, shows one-time `CHIRP-...` ID, offers no public lookup on reload, blocks login until approved.
- [ ] **REG-07｜P0** Admin approves/deletes by exact request ID; normal approval never grants admin rights; cancelled/network-failed web ceremonies retry cleanly without duplicates.
- [ ] **REG-08｜P0** Toggle registration off with a pending request present: new & in-flight registrations fail, existing requests stay approvable, existing users log in cleanly, toggling back restores signup.
- [ ] **LOG-01｜P0** Two accounts sign in via Passkey; cancellations, wrong-server creds, duplicate clicks, expired callbacks, and auth-code replays all fail safely.
- [ ] **LOG-05｜P0** Same account signing in on a new device drops old device's calls/chat/attachments immediately; chained takeovers retain only the latest login.
- [ ] **LOG-07｜P0** Sign-out, credential expiry, or revocation wipes room buffers and transfers; force-quit requires re-login. Android sustains background/locked calls yet dies cleanly when swiped from Recents.
- [ ] **QR-01｜P0** Mac, Windows, and Android login QR approved via phone `/device`: old session stays online through the 5-min setup window until new device completes key activation.
- [ ] **QR-03｜P0** Cancelling, refreshing, 3-min expiry, tampered QR URLs, or disabled accounts reject QR claims; transient offline drops retry boundedly without late takeover.

### Room Admission, Calls & Audio Cues

- [ ] **DIR-01｜P0** Directory loads after login without auto-joining or requesting mic access; browsing rooms never disrupts an active call; disconnect banner clears and resyncs snapshot on reconnect.
- [ ] **DIR-02｜P1** Room Info shows identical initial key time and latest group rotation across clients without jumping clocks ahead of authoritative server confirmation.
- [ ] **PWD-02｜P0** Wrong/cancelled/rate-limited password in-call preserves current call; successful switch enters new room muted only after obtaining new proof with zero cross-room audio leak.
- [ ] **PWD-08｜P0** Exact whitespace password matching; password edits only affect new joins; preflight proofs invalidate on server password edits, expiry, or server restart.
- [ ] **CAL-01｜P0** Voice transmits only once secure; cross-test Mac ↔ iPhone/Android/Windows intelligibility and 3-way talker separation with zero cross-room leakage.
- [ ] **CAL-02｜P0** Listen muted without mic permission; prompt appears only on unmute click; denial keeps listen-only; granting via OS settings unmutes smoothly; leaving while prompt is open does not late-start capture.
- [ ] **CAL-05｜P0** Test all 4 mute × deafen combinations; iOS earpiece/speaker swaps preserve mute state; per-member gain `0%`/`100%`/`200%` stays strictly local.
- [ ] **CAL-09｜P0** Joins, departures, kicks, and reconnects force roster re-keying so departed members cannot decrypt subsequent audio; rapid rejoins leave no ghost tracks.
- [ ] **SND-01｜P1** Single local join chime when secure; no cascade chimes for pre-existing members; subsequent joins chime cleanly; routine rotations stay silent.
- [ ] **SND-05｜P1** Cold-start muted room join plays clean untruncated chime; test again after 30s silence (Mac default & explicit output devices).
- [ ] **SND-06｜P0** No chimes while deafened and no backlog flush upon un-deafening; stale chimes drop across room switches or OS interruptions.

### Audio Presets, Routing & VAD

- [ ] **AUD-01｜P0** Test all presets across all platforms (with RNNoise); UI distinguishes configured vs. runtime-confirmed route; switching presets while muted never leaks audio and rolls back on failure.
- [ ] **AUD-07｜P1** Mac USB/Bluetooth hot-plug routing; iPhone earpiece/speaker/Bluetooth picker handles cancellations without disrupting active headset playback and tracks disconnects cleanly.
- [ ] **AUD-10｜P1** iOS pre-call Voice Settings route overrides release cleanly upon closing settings without poisoning later calls or headset attachments.
- [ ] **AUD-11｜P1** Cold-start Local Mic Test across all presets renders live level from real frames and auto-stops ~10s; missing frame path reports clear failure.
- [ ] **AUD-12｜P1** **Stop & Listen** stops capture immediately and plays last ~3s processed audio; plain **Stop** plays nothing.
- [ ] **AUD-13｜P0** Local test and active calls stay mutually exclusive; joining a room aborts tests and closing settings frees hardware immediately.
- [ ] **VAD-01｜P1** Default off, default `−45 dBFS`, range `−80` to `−10 dBFS`, local-only persistence; idle/muted states show no fake meters.
- [ ] **VAD-03｜P0** Remote peers hear clean gating around threshold; manual mute overrides VAD; live meter tracks pre-gate input while playback reflects post-gate signal.
- [ ] **VAD-07｜P1** Validate onset/tails/fan/keyboard noise suppression before and after swapping input hardware or presets.

### Lifecycle & Smooth Key Rotation

- [ ] **SYS-01｜P0** Closing/reopening last Mac window keeps live call and syncs multi-window controls; `Cmd+Q` tears down immediately.
- [ ] **SYS-02｜P0** Windows `Setup.exe` creates Start/Desktop shortcut; closing last window terminates both `Chirp.exe` and `Chirp.Protocol.exe` with instant peer departure; uninstaller cleans shortcuts, install folder, local data, and URL scheme.
- [ ] **SYS-06｜P1** Mac sleep/wake and force-kill restarts expire stale media permits deterministically and scrub leftover encrypted caches.
- [ ] **SYS-07｜P0** iPhone locked/backgrounded for 5+ min across ≥2 rotation cycles (muted and unmuted) recovers incoming speech cleanly.
- [ ] **SYS-11｜P1** Incoming phone calls, Siri, or media-services resets pause gracefully, resume without unmuting unexpectedly, and skip stale chimes.
- [ ] **SYS-13｜P0** Backgrounded clients kicked, disabled, or superseded terminate stale sessions promptly upon foreground return.
- [ ] **SEC-01｜P0** Unverified state, dropped group SSE, or expired 3s permit halts media/data emission immediately without ever falling back to plaintext or retired providers.
- [ ] **SEC-02｜P0** All clients advertising `smooth_rotation` cross ≥3 60s rotations uninterrupted; membership changes during candidate phase abort candidate round cleanly; non-smooth peers fall back to pause-and-rebuild; mismatched protocol rejected.
- [ ] **SEC-03｜P0** Passive muted presence across 3+ rotations stays connected and unmutes cleanly later.
- [ ] **SEC-05｜P0** With server rotation set to 30m in isolation, client triggers rebuild at ~90s, hard-retires at 120s if blocked, and times out stalled candidates at 15s. [V5 E2EE Protocol](/en/reference/e2ee-v5)

### Chat, Attachments & Caches

- [ ] **CHAT-01｜P0** Two-way CJK/ASCII/emoji/multiline, whitespace rejection, 4096 UTF-8 limit, IME Enter/Shift+Enter/⌘Return shortcuts, scroll position preserved while reading history.
- [ ] **CHAT-09｜P1** Locks send on roster shifts; stays open during smooth prepare; transient switch failures restore empty drafts without overwriting existing draft text.
- [ ] **CHAT-12｜P0** Leave, switch, kick, or logout clears history & drafts instantly; late arrivals see nothing; >1000 items evicts oldest.
- [ ] **FILE-01｜P0** Standard files, images, 0-byte files, max limits; iOS photo/iCloud load cancellation never leaks to new rooms; corrupt or spoofed extensions blocked cleanly.
- [ ] **FILE-09｜P0** Image previews accurate; exported files and GIFs match original size and SHA-256; exports avoid overwriting existing files and leave zero partial files on cancel/permission error.
- [ ] **FILE-15｜P1** Max 1 upload / 1 auto-download / 2 total downloads queued; manual pause resists SSE refreshes; resume verifies prefix SHA-256; terminal items drop resume button.
- [ ] **FILE-18｜P0** 32–100 MiB transfer concurrently with voice triggers 512 KiB/s throttle on `poor` quality/jitter; routine rotation continues delivering strictly to original recipients.
- [ ] **DEL-02｜P0** Late joins, missing attachment SSE, or re-joins skip prior files; single HTTP chunk errors retry; SSE drops past 6s transition permanently to `skipped`.
- [ ] **DEL-07｜P0** Partial multi-recipient receipts keep server copy alive until final recipient confirms or leaves, after which server purges blob while recipient caches remain exportable.
- [ ] **DEL-10｜P0** Uploader departure cancels incomplete uploads; completed uploads continue delivering within fixed 15m windows (non-renewable).
- [ ] **DEL-14｜P0** Server restart marks stale `pending` → `skipped`, drops partial uploads, prunes disk ciphertext, while verified client caches remain usable.
- [ ] **CACHE-01｜P0** Clearing attachment cache mid-download retires `AttachmentLease`, cancels queue, and closes previews cleanly without interrupting audio, chat, or external exported files.
- [ ] **CACHE-08｜P1** 512 MiB client reserve accounts for queued items; server rejects room/global quota overflow; tampered ciphertext fails verification before export/receipt.

### Profiles, Admin Console & Client Version Policy

- [ ] **PRO-01｜P1** Nickname/avatar boundary tests & HTML-injection safety; mid-call profile updates never disrupt audio or keys.
- [ ] **ADM-01｜P0** Unauthenticated and non-admin requests rejected; demoting/disabling active admin invalidates browser sessions immediately; cross-origin mutations blocked.
- [ ] **ADM-06｜P0** Account ban / final device revocation locks out all sessions & rooms, blacklists handle/device permanently.
- [ ] **ADM-08｜P0** Room kick drops entry while retaining login; ending call affects single room only; DB-revoke + LiveKit RPC partial failure surfaces explicit warning.
- [ ] **ADM-15｜P0** Single-use `admin bootstrap` atomicity; standard delete/disable/revoke respect Last-Administrator Protection (test admin final-device ban strictly in isolated DB).
- [ ] **ROOM-01｜P0** Room CRUD & default lobby undeletability; room delete drops only callers in that room cleanly.
- [ ] **ROOM-07｜P1** Console auto-refresh and room selection changes never clobber unsaved form inputs or apply edits to the wrong room.
- [ ] **VER-01｜P0** Independent `ios`/`macos`/`windows`/`android` policies, 3-part + build ordering, blocking old clients cleanly on discovery, exchange, and QR claims (restore policies afterward).

### UI, Network Faults & Penetration Boundaries

- [ ] **UI-01｜P1** Light/dark, ZH/EN/System, dynamic type sizes, long labels, empty/error states, narrow viewports, keyboard shortcuts, and VoiceOver/accessibility pass.
- [ ] **UI-07｜P1** Same-origin web language persistence, fallback, and mid-form switching.
- [ ] **NET-01｜P0** Wi-Fi↔cellular swaps, AP hops, and airplane-mode recoveries keep audio & room security aligned with zero ghost rooms or surprise unmutes.
- [ ] **NET-04｜P1** Packet loss, jitter, high RTT, and lost `429`/`503` responses trigger bounded backoff and voice-first throttling.
- [ ] **NET-06｜P0** Blocking UDP causes crisp error feedback; **packet captures prove zero outbound traffic to third-party STUN/TURN, P2P peers, or media TCP fallbacks**.
- [ ] **NET-07｜P0** Killing LiveKit, restarting `app`, or injecting SQLite errors updates health endpoints cleanly without letting stale cache bypass media locks or leave ghost callers.
- [ ] **NET-13｜P0** Full public HTTPS/WSS/UDP + SSE reverse proxy verification with consistent `CHIRP_PUBLIC_ORIGIN` and `404` on `/internal/*` and `/twirp/*`.
- [ ] **SEC-04｜P0** Isolated tests reject unencrypted/wrong-key frames, cross-account/room/`entry_id` attachment fetches, and tampered ciphertext.
- [ ] **SEC-07｜P1** Export `.chirplog` and verify all 12 tables, 24h cutoff, and zero leakage of plaintext chat, tokens, URLs, or secrets across client logs and server staging dirs.
- [ ] **SOAK-01｜P1** 30-minute continuous two-way call and 2-hour mixed soak testing CPU, RSS, cache growth, and battery drain.

### Device Pairing, Friends, First-Login Setup & `.chirpkey`

- [ ] **ID-01｜P0** Empty vault allows registration/sign-in; pending/rejected/blacklisted states report accurately without displacing existing devices.
- [ ] **ID-02 / ID-02a / ID-02b｜P0** First login enforces ≥16 Unicode scalar / ≤1024 UTF-8 passphrase + `.chirpkey` export; rejects short/oversized inputs, preserves leading/trailing spaces; file save cancel retries cleanly; import asks for file before passphrase.
- [ ] **ID-03｜P0** Full warning text readable; 5s confirmation timer blocks fast taps, keyboard, and VoiceOver activation, pauses in background, and never auto-submits.
- [ ] **ID-04｜P0** Force-killing before encrypt, after local staging, after export, after confirmation, and mid-request resumes cleanly using the staged root key upon next login.
- [ ] **ID-05｜P0** Cross-platform `.chirpkey` export/import (e.g., iOS → Mac, Android → Windows) passes; `CHIRPKEY` magic validated; bad passwords and wrong server origins rejected.
- [ ] **ID-06｜P1** Measure Argon2id `64 MiB / 3 / 4` latency and peak RSS on target hardware; verify zero draft leaks in sandbox or plaintext seeds in vaults.
- [ ] **DEV-01 / DEV-02｜P0** Device rename sync, camera & image pairing; self-revoke blocks current/final device; admin final-device ban enforced; revoking ancestor spares existing descendants.
- [ ] **DEV-03 / DEV-04｜P0** Gallery fallback on camera denial (PNG/JPEG/HEIC), 3-attempt manual 3×4-digit check on image import, replay/tamper/MAC-reflection rejection, old session survives until new device activates.
- [ ] **FR-01 – FR-04｜P0** One-way friend add grants zero trust; bidirectional SAS syncs device trust; offline unfriend/untrust overwrites stale snapshots upon reconnect; simultaneous mutual SAS merges cleanly.
- [ ] **VOI-01 / VOI-02｜P0** Unverified peer immediately locks room; restoring missing pairwise trust unlocks audio; routine rotations preserve trust.
- [ ] **BL-01 / BL-02｜P0** Dropping authorization visibility halts permits ≤60s (sleep/offline counts down); permanent revocation evicts & forces re-keying; friend status never overrides blacklist.
- [ ] **RST-01｜P0** Pre-login or banned **Clear Local Data** scrubs local keys/trust/caches cleanly without touching external `.chirpkey` files or server state.

## Acceptance Sign-Off Template {#results-template}

Copy this table into release tickets (**never overwrite this handbook**). Report timestamps in UTC (`YYYY-MM-DDTHH:MMZ`) or explicitly tagged timezone, and omit all credentials, private keys, and plaintext user data:

| Record Item | Observed Release Evidence |
| --- | --- |
| Round / Tester / Window | TBD |
| Source Commit / Versions & Builds / Packaging | List exact macOS, iOS, Android, and Windows build artifacts |
| Server Version / Digest / Schema / Rotation / Policies | TBD |
| Devices / OS Versions / Passkey Provider / Audio Route | TBD |
| Network Profile / Participants / Duration / Test Pairs | TBD |
| Summary (Pass / Fail / Blocked / Not Run & Reasons) | Break down by platform, direction, and audio preset |
| Per-Case Evidence (Case ID / Result / SHA-256 Digests) | Attachments must log both source and exported SHA-256 |
| Fault / Revocation / Audio Recovery Timeline | Action time, audio halt time, secure ready time, bidirectional voice time |
| Open Defects | ID, preconditions, repro steps, frequency, recovery, fix target |
| Verdict / Retest Scope / Sign-Off | Never mark unexecuted cases as Pass |

> [!IMPORTANT] Release Gate
> Release requires **100% pass on applicable `P0` checks** with **zero open `S0` or `S1` defects** (if only running the 8-step fast smoke, state "Smoke Only" clearly). Every defect fix requires re-running the failed check, related lifecycle checks, and the 8-step smoke suite.
