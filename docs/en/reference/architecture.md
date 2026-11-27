<script setup>
import ArchitectureMap from '../../.vitepress/theme/components/ArchitectureMap.vue'
</script>

# System Architecture

Chirp follows a three-tier architecture built around a **lightweight control plane, a self-hosted [SFU](https://en.wikipedia.org/wiki/Selective_forwarding_unit) media relay, and client-owned end-to-end cryptography**:

- **Chirp Go Server (`app`)**: Serves [Passkey / WebAuthn](https://www.w3.org/TR/webauthn-3/) authentication pages, the web admin console, REST/SSE APIs, the V5 authorization log, temporary attachment chunk storage, and the group key coordinator.
- **LiveKit SFU (`livekit`)**: Forwards already-encrypted audio frames and encrypted reliable DataChannel payloads between room participants.
- **Four Native Clients**: macOS, iOS, Android, and Windows store device private keys locally, compare peer SAS safety codes out-of-band, and derive content keys via [OpenMLS](https://openmls.tech/) ([RFC 9420](https://datatracker.ietf.org/doc/html/rfc9420))—**the server never accesses voice, chat, or attachment decryption keys**.

## Overall Topology & Core Data Flows

Click the interactive flow cards below to trace **Sign-In & Room Entry**, **Encrypted Voice**, and **File Transfers** across network boundaries:

<ArchitectureMap />

<NetworkTopologyDiagram />

Control APIs and WebSocket signaling enter on `443/TCP` through your reverse proxy (bundled SWAG Nginx or external Nginx): `/rtc` routes to LiveKit (`7880/TCP`), while everything else routes to `app` (`18115/TCP`). Encrypted voice media travels directly over `7882/UDP` to LiveKit. `CHIRP_PUBLIC_ORIGIN` anchors WebAuthn RP ID/Origin validation, client discovery URLs, and public signaling endpoints. [Compose Config](https://github.com/YouZiFeiLe/Chirp/blob/main/compose.yaml) · [Config Loader](https://github.com/YouZiFeiLe/Chirp/blob/main/internal/config/config.go) · [Operations Reference](/en/hosting/operations)

## Server Codebase Index

| Module Entry | Core Responsibility |
| --- | --- |
| [CLI Entrypoint](https://github.com/YouZiFeiLe/Chirp/blob/main/cmd/chirp/main.go) → [App Wiring](https://github.com/YouZiFeiLe/Chirp/blob/main/internal/application/application.go) | Initializes SQLite storage, LiveKit admin client, and three background sweeps; mounts all HTTP handlers plus admin CLI commands. |
| [Passkey Auth](https://github.com/YouZiFeiLe/Chirp/blob/main/internal/passkeyhttp/server.go) · [Admin UI](https://github.com/YouZiFeiLe/Chirp/blob/main/internal/adminhttp/server.go) · [Embedded Web](https://github.com/YouZiFeiLe/Chirp/blob/main/internal/webui/assets.go) | Serves registration, login, phone QR `/device` approval, and `/admin/` pages directly from Go `embed` assets. |
| [Core REST API](https://github.com/YouZiFeiLe/Chirp/blob/main/internal/httpapi/server.go) · [SQLite Store](https://github.com/YouZiFeiLe/Chirp/blob/main/internal/store/store.go) | Discovery, profiles, rooms, attachments, and devices. Storage validates login state, device eligibility, and room entries atomically inside SQLite write transactions. |
| [V5 Identity](https://github.com/YouZiFeiLe/Chirp/blob/main/internal/identity/protocol.go) · [Authorization Service](https://github.com/YouZiFeiLe/Chirp/blob/main/internal/authorization/protocol.go) | Certificate chains, signature domains, append-only revocation logs, and nonce-bound signed history snapshots. |
| [Group Coordinator](https://github.com/YouZiFeiLe/Chirp/blob/main/internal/group/hub.go) · [Action Validator](https://github.com/YouZiFeiLe/Chirp/blob/main/internal/group/action.go) | Tracks active room rosters, keying phases, and smooth rotation; relays `KeyPackage`, `Welcome`, confirmations, and issues 3s media leases. |
| [Media Room Service](https://github.com/YouZiFeiLe/Chirp/blob/main/internal/room/service.go) · [Directory](https://github.com/YouZiFeiLe/Chirp/blob/main/internal/room/directory.go) | Mints scoped short-lived LiveKit JWTs, invokes internal Twirp RPC to query/kick participants, and merges live roster occupancy. |

## End-to-End Call Flow: From Discovery to Live Audio

<AuthAndJoinSequence />

### Phase 1: Discovery & Passkey Authentication

1. **Version policy & endpoints**: Clients query `GET /v1/client-config` with `X-Chirp-Platform`, `X-Chirp-Version`, and `X-Chirp-Build`. The server validates platform minimums and returns `passkey_origin`, API endpoints, and update policy. [Discovery Handler](https://github.com/YouZiFeiLe/Chirp/blob/main/internal/httpapi/client_config.go) · [Version Check](https://github.com/YouZiFeiLe/Chirp/blob/main/internal/clienthttp/version.go)
2. **Passkey sign-in & S256 PKCE**: Native clients complete WebAuthn via browser callback (`1m` auth code; Windows also supports an up-to-60s exponential-backoff browser handoff loop at `/api/auth/login/windows-handoff`) or phone QR scan (`3m`), all bound with **S256 [PKCE](https://datatracker.ietf.org/doc/html/rfc7636)**. Exchange yields a **5-minute** Identity Setup Grant.
3. **Device key proof, Bearer & resumption issuance**: First-time accounts generate a root key and export `.chirpkey`; additional devices restore `.chirpkey` or pair via QR. Clients sign a proof-of-possession challenge (`/api/client/identity/challenge` → `/complete`) to obtain a business Bearer (valid up to **20 hours**, capped by device cert expiry) while atomically superseding prior login sessions. Clients sending `X-Chirp-Login-Resumption: 1` also receive a `resume_token` to exchange for a rotated Bearer after process restarts via `/api/client/resume/challenge` → `/complete` (`Chirp login resumption v1` signature) under the exact same deadline. [Passkey Server](https://github.com/YouZiFeiLe/Chirp/blob/main/internal/passkeyhttp/server.go) · [Login Store](https://github.com/YouZiFeiLe/Chirp/blob/main/internal/store/client_login.go) · [Resumption Store](https://github.com/YouZiFeiLe/Chirp/blob/main/internal/store/client_resumption.go)

<PasskeyQrLoginDiagram />

### Phase 2: Room Authorization, Mutual Verification & Media Gating

Chirp enforces **one active login per account, one active room entry per login**. Each room entry creates a unique composite identity `member_id.login_id.entry_id` tying together database access, LiveKit participant identity, and OpenMLS group membership, guarded by monotonic `join_sequence` checks. [Room Store](https://github.com/YouZiFeiLe/Chirp/blob/main/internal/store/rooms.go)

1. **Preflight password check**: Before switching rooms, clients send password + `join_sequence` to `POST /v1/rooms/{room}/preflight` (rate-limited to **5 failed attempts per 30 seconds** per member/room). Valid passwords earn a **30-second** signed Proof; invalid passwords leave any current call untouched. [Preflight Source](https://github.com/YouZiFeiLe/Chirp/blob/main/internal/httpapi/room_preflight.go)
2. **Atomic join & media JWT**: Submitting the Proof to `join` transitions the room entry atomically and returns `entry_id`, `livekit_url`, and a short-lived LiveKit JWT. Entry validity stays at **30 seconds**, renewed via group `join` or 2s `heartbeat` ticks.
3. **Device trust & OpenMLS keying**: Peers inspect each other's device certificate chains, fresh authorization snapshots, and pairwise SAS verification. Only after all members verify identical rosters, exchange confirmations, and acquire a **3-second media send permit** do clients unlock audio capture, chat, and files. [Group Hub](https://github.com/YouZiFeiLe/Chirp/blob/main/internal/group/hub.go) · [Shared Rust Core](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/apple/MLS/native/src/lib.rs)

<GroupStateMachineDiagram />

## Server Route & Auth Matrix

| Caller & Path Prefix | Authentication & Security Rules | Key Source |
| --- | --- | --- |
| Browser (`/`, `/register`, `/device`, `/api/auth/`) | WebAuthn challenges, strict Origin enforcement, `HttpOnly; SameSite=Strict` cookies; native setup APIs live under `/api/client/`. | [Passkey Service](https://github.com/YouZiFeiLe/Chirp/blob/main/internal/passkeyhttp/server.go) |
| Admin (`/admin/`, `/admin/api/`) | Active admin cookie + role check; same-origin checks on mutations; admin roles mutable solely via server CLI. | [Admin Service](https://github.com/YouZiFeiLe/Chirp/blob/main/internal/adminhttp/server.go) |
| Native clients (`/v1/`) | Public `/v1/client-config`; active Bearer required elsewhere; `/v1/identity/signals` relays origin-scoped opaque E2EE signals ≤ 64 KiB; attachments additionally check `entry_id`. | [HTTP API](https://github.com/YouZiFeiLe/Chirp/blob/main/internal/httpapi/server.go) · [Social Relay](https://github.com/YouZiFeiLe/Chirp/blob/main/internal/httpapi/social.go) |
| Group coordinator (`/v1/group/rooms/{room}/`) | `GET config` validates Bearer; `POST action` / `events` require client Ed25519 request signatures and budgets. | [Group Server](https://github.com/YouZiFeiLe/Chirp/blob/main/internal/group/server.go) |
| Authorization log (`/authorization/v5/`) | `POST append` verifies device signatures & auth scope; `POST snapshot` signs nonce-bound history; full social bodies require device read proofs. | [Authorization HTTP](https://github.com/YouZiFeiLe/Chirp/blob/main/internal/authorization/server.go) |
| Health probes (`/livez`, `/healthz`, `/authorization/healthz`) | Process liveness (`200`), dual SQLite read/write (`200`), authorization SQLite readiness (`204`). | [Top Router](https://github.com/YouZiFeiLe/Chirp/blob/main/internal/application/application.go) |

Directory updates stream `server_id` and `revision` over `GET /v1/events` SSE so clients fetch fresh `GET /v1/state` snapshots; group SSE also emits `rotation_revision` pulses for smooth key transitions. [State API](https://github.com/YouZiFeiLe/Chirp/blob/main/internal/httpapi/state.go) · [Apple Sync](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/apple/Shared/ClientStateSync.swift)

## Persistence Layout & Single-Instance Scope

| Storage Path (Container) | Purpose & Policy |
| --- | --- |
| `/data/chirp.db` (`data` volume) | Main SQLite DB (WAL mode, `BEGIN IMMEDIATE`, requires empty DB or exact schema `23`) storing members, Passkeys, logins, resumption records (`client_login_resumptions`), rooms, policies, blacklists, and attachment state. [Schema SQL](https://github.com/YouZiFeiLe/Chirp/blob/main/internal/store/schema.sql) |
| `/data/authorization.db` (`data` volume) | Independent authorization SQLite log signed by `CHIRP_AUTHORIZATION_KEY_FILE`. [Key Loader](https://github.com/YouZiFeiLe/Chirp/blob/main/internal/authorization/key.go) |
| `/data/attachments/` (`data` volume) | Temporary encrypted chunks; ineligible objects and orphans clean up on startup. [Attachments](/en/reference/attachments) |
| `/var/lib/chirp-media/keys.json` (`media-keys` volume) | Auto-generated on first boot by `app` and mounted read-only into `livekit`. [Key Gen](https://github.com/YouZiFeiLe/Chirp/blob/main/internal/config/livekit_keys.go) |
| `/app/log/` (`logs` volume) | Rolling daily JSON Lines logs (7-day retention), or async streaming to VictoriaLogs. [Logging](https://github.com/YouZiFeiLe/Chirp/blob/main/internal/logging/logging.go) |

::: note Why `app` must run as a single instance
In-memory group state machines, active SSE connections, preflight HMAC secrets, and attachment recipient presence live inside the single `app` process, and SQLite WAL/SHM locking relies on local POSIX locks. Never horizontally scale multiple `app` containers against shared storage.
:::

## Cross-Platform Client Engineering

Explore each client's implementation, E2EE hooks, design system, and shared crates: [Unified Design & Shared Core](/en/clients/shared-and-design) · [Apple (macOS / iOS)](/en/clients/apple) · [Android](/en/clients/android) · [Windows](/en/clients/windows).

## Further Reading

- **Build & Verification**: [Server Build & Testing](/en/development/building) · [Native Client Builds](/en/development/clients) · [Manual QA Checklist](/en/development/testing)
- **Protocols & Cryptography**: [Encryption & Boundaries](/en/reference/security) · [V5 E2EE Protocol](/en/reference/e2ee-v5) · [Authorization Signing Keys](/en/reference/authorization-keys) · [Attachment Transport](/en/reference/attachments) · [`.chirpkey` Recovery Format](/en/reference/chirpkey) · [Client Log Format](/en/reference/chirplog)
