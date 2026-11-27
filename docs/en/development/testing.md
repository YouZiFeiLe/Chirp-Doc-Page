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
8. Verify admin kick, new-device takeover, room re-entry, and force-quit/close relaunch (room chat wiped; explicit sign-out or missing resumption requires Passkey, while valid resumption triggers local biometric/Hello unlock).
