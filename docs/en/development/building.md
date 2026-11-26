# Server Build & Automated Testing

Run all commands below from the root of the **Chirp source repository**. For mobile and desktop builds, see [Native Client Builds](/en/development/clients). [Source Repository](https://github.com/YouZiFeiLe/Chirp/tree/main) · [System Architecture](/en/reference/architecture)

## Toolchains & Key Files

| Area | Toolchain & Key Entry Points |
| --- | --- |
| **Go Server, Admin & Passkey Web UI** | [Go](https://go.dev/) 1.27.4 (`cgo` enabled) + [Node.js](https://nodejs.org/) (frontend unit tests). Single module holds backend, groups, and test fixtures. [go.mod](https://github.com/YouZiFeiLe/Chirp/blob/main/go.mod) · [SQLite Test Script](https://github.com/YouZiFeiLe/Chirp/blob/main/scripts/test-sqlite.sh) |
| **Shared Rust Crypto Library** | [Rust](https://www.rust-lang.org/) 1.100.0 + [OpenMLS](https://openmls.tech/) 0.9.2. Apple/Android targets declared in root toolchain; Windows uses MSVC. Keep lockfiles and third-party notices synced on upgrades. [rust-toolchain.toml](https://github.com/YouZiFeiLe/Chirp/blob/main/rust-toolchain.toml) · [Cargo.toml](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/apple/MLS/native/Cargo.toml) · [Cargo.lock](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/apple/MLS/native/Cargo.lock) |
| **Docker Build & Releases** | `linux/amd64` Docker Engine + Compose 2.26+. Prebuilt server comes from `deploy/Dockerfile` target `public`. [Dockerfile](https://github.com/YouZiFeiLe/Chirp/blob/main/deploy/Dockerfile) · [Public Compose](https://github.com/YouZiFeiLe/Chirp/blob/main/compose.yaml) |
| **Native Clients** | macOS / iOS (Xcode 27 / Swift 6.4), Android (JDK 27 / NDK 30 / CMake 4.1), Windows (.NET 11 / WinUI 3 / MSVC). [Native Client Builds](/en/development/clients) |

## Starting an Isolated Local Dev Server

Spin up a disposable Go server on `127.0.0.1:18115` using temporary SQLite databases and an ephemeral signing seed:

```sh
mkdir -p .build
sh scripts/go.sh build -o .build/chirp ./cmd/chirp
chirp_bin="$PWD/.build/chirp"
chirp_run="$(mktemp -d "${TMPDIR:-/tmp}/chirp-dev.XXXXXXXX")"
"$chirp_bin" authorization -generate-key -key-file "$chirp_run/authorization-key"
(
  cd "$chirp_run" || exit 1
  exec env -i PATH="$PATH" \
    CHIRP_DATABASE_PATH=chirp.db CHIRP_PUBLIC_ORIGIN=http://localhost:18115 \
    LIVEKIT_HTTP_URL=http://127.0.0.1:7880 LIVEKIT_API_KEY=chirp \
    CHIRP_LIVEKIT_KEYS_FILE="$PWD/livekit-keys.json" "$chirp_bin" serve
)
```

> [!TIP] Connecting native clients to localhost
> Because `-generate-key` emits a brand-new signing key, rebuild clients against the exported `AuthorizationTrust.json` (or swap in `deploy/authorization-key.default`) and run a local LiveKit Server for audio tests. [Authorization Signing Keys](/en/reference/authorization-keys)

Probe health and discovery endpoints in a second terminal (`X-Chirp-*` headers must satisfy policy): [Discovery Handler](https://github.com/YouZiFeiLe/Chirp/blob/main/internal/httpapi/client_config.go) · [Windows Version Constants](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/windows/engine/network_windows.go)

```sh
curl --fail http://localhost:18115/healthz
curl --fail --include http://localhost:18115/authorization/healthz
curl --fail -H 'X-Chirp-Platform: windows' -H 'X-Chirp-Version: 2026.11.24' \
  -H 'X-Chirp-Build: 1' http://localhost:18115/v1/client-config
```

## Server & Web UI Automated Tests

Run race detection, Go tests, `go vet`, and frontend unit tests on Linux/macOS: [SQLite Test Script](https://github.com/YouZiFeiLe/Chirp/blob/main/scripts/test-sqlite.sh) · [Go Wrapper](https://github.com/YouZiFeiLe/Chirp/blob/main/scripts/go.sh)

```sh
sh scripts/test-sqlite.sh local
node --test internal/webui/i18n_test.mjs internal/webui/client-version_test.mjs internal/passkeyhttp/native-login_test.mjs
```

On native **Windows**, run router, store, and frontend tests directly (POSIX `0400`/`0600` seed permission tests run inside Docker via `sh scripts/test-sqlite.sh docker`): [Key Permission Check](https://github.com/YouZiFeiLe/Chirp/blob/main/internal/authorization/key.go)

```powershell
go run ./cmd/chirp version
go test ./internal/httpapi ./internal/passkeyhttp ./internal/adminhttp ./internal/group ./internal/store
go vet ./...
node --test internal/webui/i18n_test.mjs internal/webui/client-version_test.mjs internal/passkeyhttp/native-login_test.mjs
```

## Shared Rust & Cross-Language Vector Tests

Run locked Rust unit and shared vector checks whenever editing certificates, SAS flows, `.chirpkey`, or OpenMLS boundaries: [Shared Test Vectors](https://github.com/YouZiFeiLe/Chirp/tree/main/internal/identity/testdata) · [Rust Core](https://github.com/YouZiFeiLe/Chirp/tree/main/Client/apple/MLS/native/src)

```sh
cargo test --locked --manifest-path Client/apple/MLS/native/Cargo.toml
```

## End-to-End Integration & Docker Image Smoke Tests

### Python Integration Suites (macOS)

Run sequentially from repo root once Swift and native artifacts are built (they share build folders—do not run concurrently):

| Test Focus | Script & Coverage |
| --- | --- |
| **Room admission & group FSM** | [test-client-admission.py](https://github.com/YouZiFeiLe/Chirp/blob/main/scripts/test-client-admission.py) covers password preflight, room switching, and old `entry_id` isolation; [test-group.py](https://github.com/YouZiFeiLe/Chirp/blob/main/scripts/test-group.py) tests Go + Swift + Rust rosters, reconnects, smooth rotation, and leases. |
| **Authorization & key age** | [test-v5-authorization.py](https://github.com/YouZiFeiLe/Chirp/blob/main/scripts/test-v5-authorization.py) covers snapshot signatures, multi-root read proofs, and revocations; [test-v5-key-age.py](https://github.com/YouZiFeiLe/Chirp/blob/main/scripts/test-v5-key-age.py) tests 90s rebuild & 120s expiry (`--candidate` tests rotation timeout). |
| **Attachments & real LiveKit audio** | [test-attachments.py](https://github.com/YouZiFeiLe/Chirp/blob/main/scripts/test-attachments.py) verifies encrypted chunks, resume, receipts, and GC; [test-chat.py](https://github.com/YouZiFeiLe/Chirp/blob/main/scripts/test-chat.py) launches real LiveKit (`--ios-simulator UDID` supported). |

### Local Open-Source Docker Image Verification

Simulate CI by building the `public` target, verifying embedded trust offline, and running HTTP-01 + DNS-01 Compose smoke tests: [Dockerfile](https://github.com/YouZiFeiLe/Chirp/blob/main/deploy/Dockerfile) · [Compose Verification Script](https://github.com/YouZiFeiLe/Chirp/blob/main/scripts/test-open-source-compose.sh)

```sh
docker build --platform linux/amd64 --target public -f deploy/Dockerfile -t chirp-server:local-check .
docker run --rm -i --network none --read-only chirp-server:local-check authorization \
  -key-file /usr/share/chirp/authorization-key.default -verify-trust /dev/stdin \
  < Client/apple/Shared/Resources/AuthorizationTrust.json
sh scripts/test-open-source-compose.sh chirp-server:local-check
```

::: note Legacy test scripts in repo
`scripts/test-ci.py` and `scripts/test-v5-docker.py` target the older `deploy/compose.yaml` build stack. `smoke-server.py` and `test-logging.py` shell out to `date` inside the container, which fails on the stripped `scratch` release image—always validate release images with `test-open-source-compose.sh`.
:::

## Offline UI & Web Previews

Preview Sign-In, Registration, Admin Console, and macOS views without running SQLite or LiveKit:

- **Web previews**: Run `python3 Client/Branding/design-system/preview-web.py` (Python 3.9+), then browse `http://127.0.0.1:18761/` (`?appearance=dark`, `/register?state=receipt`) and `http://127.0.0.1:18762/admin/`. [Preview Script](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/Branding/design-system/preview-web.py) · [Design Tokens](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/Branding/design-system/design-tokens.json)
- **macOS offline previews**: Run `./scripts/build_and_run.sh --design-preview`, or append `--identity-setup-preview`, `--attachment-transfer-preview`, `--room-information-preview`, or `--device-verification-preview`. [Icon Export Script](https://github.com/YouZiFeiLe/Chirp/blob/main/scripts/export-apple-icons.py)

## Localization & Error Code Sync

- **Web localization**: Lives in [`internal/webui`](https://github.com/YouZiFeiLe/Chirp/tree/main/internal/webui); always run `node --test` above to validate bilingual parity and placeholders.
- **Client error codes**: When updating [`ClientError.swift`](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/apple/Shared/ClientError.swift), update both `Errors.strings` files, run `python3 -X utf8 Client/apple/Scripts/check-localizations.py`, and update [Client Error Codes](/en/reference/error-codes).
