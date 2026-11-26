# Chirp V5 End-to-End Encryption Protocol

Chirp V5 (`chirp-mls-authenticated-v5`) specifies unified device identity verification, authorization history freshness, and [OpenMLS](https://openmls.tech/) ([RFC 9420](https://datatracker.ietf.org/doc/html/rfc9420)) room keying across macOS, iOS, Android, and Windows.

All four clients invoke the same **Rust cryptographic core** over FFI/JNI/C-ABI for group key agreement, SAS state machines, and key-age gates, while Go persists device registration events and signs challenge-bound history snapshots. [System Architecture](/en/reference/architecture) · [Encryption & Boundaries](/en/reference/security)

<AuthAndJoinSequence />

## Threat Model & Core Assumptions

V5 rests on **zero trust in transport, bounded trust in authorization history**:

- **Zero content access by servers**: REST APIs, signaling WebSockets, LiveKit SFU, and network links may drop, delay, replay, or tamper with traffic. Bearer tokens and LiveKit JWTs authorize connectivity only—decryption requires client-verified **device cert chains, SAS verification, exact member rosters, and mutual MLS key confirmations**.
- **Bounded trust in revocation history**: Clients refresh challenge-bound snapshots from `/authorization/v5/` every 20 seconds, valid for at most **60 seconds from initiation**. A compromised authorization server can delay propagation of a brand-new revocation within that window, yet **cannot forge device private signatures or derive MLS secrets**, and clients reject any snapshot omitting or regressing locally persisted history checkpoints. Replace the default signing seed for exclusive signing authority. [Signing Keys](/en/reference/authorization-keys)

## Authorization Endpoint Integration

In Go, authorization endpoints share port `18115/TCP` inside the binary while isolating state inside **`authorization.db`** and a dedicated Ed25519 seed. [App Wiring](https://github.com/YouZiFeiLe/Chirp/blob/main/internal/application/application.go) · [Auth Server](https://github.com/YouZiFeiLe/Chirp/blob/main/internal/authorization/server.go)

| Route | Verification & Contract |
| --- | --- |
| `POST /authorization/v5/append` | Verifies device signature, strictly monotonic sequence, and signer's register/revoke scope before appending events. |
| `POST /authorization/v5/snapshot` | Accepts canonical Origin, 32-byte random nonce, and 1–2 account roots; returns Base64 payload + Ed25519 signature bound to request digest. |
| `GET /authorization/healthz` | Checks `authorization.db` availability independently (`HTTP 204`). |
| `GET /healthz` | Verifies both `chirp.db` and `authorization.db` (`HTTP 200`). |

::: warning Zero fallback or credential substitution
Authorization appends reject cookies and login Bearers in place of device signatures. Missing, malformed, or non-`0400`/`0600` signing seeds abort server startup immediately.
:::

## Verification & Admission Invariants

<DeviceTrustTreeDiagram />

1. **Strict isolation until verified**: Whenever any room participant lacks mutual SAS verification, clients exchange only identities, certs, SAS messages, and state—**never MLS `Welcome`, voice frames, chat, or attachment keys**. Opaque client-to-client E2EE signals relay over `/v1/identity/signals` (≤ 64 KiB, Origin-scoped).
2. **Independent out-of-band SAS checks**: Compare all 3 safety code groups in person or via a separately verified channel—**never** confirm over the unverified call itself.
3. **Never substitute nicknames or `ready` flags**: Trust binds `Origin + Account Root Key + Specific Device Key`.
4. **Approve roster before group creation**: Clients approve exact rosters (`entry_id`, device identity, MLS key, fresh auth) locally before Rust calls OpenMLS `Create`/`Join` or accepts `Welcome`.
5. **Mutual confirmation before media**: Roster shifts halt media and retire keys until all members confirm identical `epoch authenticator` digests and obtain fresh media leases.
6. **Shared bundled verification root**: All builds embed `AuthorizationTrust.json` and derive `/authorization/v5/` from `passkey_origin`. Custom signing seeds require rebuilding and redistributing clients. [Trust JSON](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/apple/Shared/Resources/AuthorizationTrust.json)

## Authorization Log Chain, Caps & Freshness

The authorization state machine ([Source](https://github.com/YouZiFeiLe/Chirp/blob/main/internal/authorization/protocol.go)) tracks a strictly incrementing hash chain per account root:

- **Verification sequence**: `prior state → signer authority → event signature → next state` serialized via SQLite Compare-And-Swap (CAS).
- **Idempotency & revocation reservation**: Duplicate retries at identical sequence + digest succeed idempotently. Each account supports up to **128 devices** and **8,192 total log entries**; registration and social events **cap at sequence 4,096**, reserving the upper half exclusively so saturated accounts can always record revocations.

| Parameter | Constraint & Behavior |
| --- | --- |
| **Refresh interval** | New random nonce request every **20 seconds**. |
| **Maximum snapshot lifetime** | **60 seconds** from request initiation on `ContinuousClock` (sleep & RTT included; multi-batch takes earliest). |
| **No-extension rules** | Reused nonces, empty responses, short pages, or regressed checkpoints never extend the 60s window. |
| **Read proof window** | Full personal social payload requests include a signed device proof within **±60 seconds** of server time. |

## Client Forced Re-Keying & Media Gates

<GroupStateMachineDiagram />

<KeyHierarchyAndRotation />

### Key Timers & Hard Bounds

- **Server rotation schedule**: Default **60 seconds** (`CHIRP_GROUP_ROTATION` configurable `30s` to `30m`).
- **Client key-age law**: Clients trigger proactive rebuild at **90 seconds** and **hard-halt at 120 seconds** from initial key creation/decryption—immune to heartbeats, leases, or device sleep.
- **Candidate window**: Candidate prepare + activation allow up to **15 seconds**; old receive slots linger at most **1 second** for in-flight UDP packets without outliving leases or key caps.
- **Effective send/play ceiling**: `min(media lease, login/cert expiry, 60s auth deadline, 120s hard key age)`.

### Frame Decryption & Replay Guards

- **Ordered pause teardown**: On roster change or expired auth, clients revoke permits and clear current/candidate MLS state before pausing audio hardware; tracks stay subscribed until re-keyed and authorized.
- **AES-GCM + 96-bit IV ceiling**: Before Opus decoding, frames pass AES-GCM tag checks and per-(sender, key) seen-IV deduplication (allowing reordering across packets, stopping at **65,536 distinct IVs** per sender/key).
- **Tight enforcement loops**: Apple checks `ContinuousClock` per capture frame alongside a ~20ms watchdog sweep; DataChannel chat re-checks permits immediately prior to queuing; Android and Windows enforce symmetric checks. [Android VoiceKeys](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/android/app/src/main/kotlin/cn/youzifeile/chirp/media/VoiceKeys.kt) · [Windows Media](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/windows/engine/media_windows.go)

> [!NOTE] Physical engineering boundaries
> Because Chirp preserves upstream WebRTC C++ jitter/encoder queues without hard millisecond aborts, trace already-queued frames in OS/driver buffers cannot be recalled, and Rust memory wiping complements rather than replaces OS full-disk encryption.

## Client Implementation & Protocol Test Suites

- **Apple**: [RoomIdentity.swift](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/apple/Shared/RoomIdentity.swift) · [GroupSession.swift](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/apple/Shared/GroupSession.swift)
- **Windows**: [authority_windows.go](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/windows/engine/authority_windows.go) · [room_windows.go](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/windows/engine/room_windows.go)
- **Android**: [AccountIdentity.kt](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/android/app/src/main/kotlin/cn/youzifeile/chirp/data/AccountIdentity.kt) · [SecureGroup.kt](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/android/app/src/main/kotlin/cn/youzifeile/chirp/media/SecureGroup.kt)

| Suite | Command & Verified Scope |
| --- | --- |
| **Go race & vet** | `go test -race ./...` and `go vet ./...` on Linux/macOS covering routing, auth challenges, CAS chains, and fail-closed startup. |
| **Apple SharedFSM** | `swift test --package-path Client/apple --scratch-path .build/swift-core` on macOS. |
| **V5 Authorization** | `python3 scripts/test-v5-authorization.py` exercising live Go + Swift enrollment, read proofs, and revocations. |
| **Key Age & Candidate Stall** | `python3 scripts/test-v5-key-age.py` (`--candidate` tests timeout) proving 90s rebuild and 120s retirement. |
| **Cross-Platform Guides** | [Native Client Builds](/en/development/clients) · [Server Build & Testing](/en/development/building) · [Manual QA Checklist](/en/development/testing) |
