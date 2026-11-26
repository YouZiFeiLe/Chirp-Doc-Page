# Authorization Signing Keys

Chirp uses a dedicated **[Ed25519](https://datatracker.ietf.org/doc/html/rfc8032) signing seed** to sign device authorization history snapshots at `/authorization/v5/snapshot`, while macOS, iOS, Android, and Windows clients embed the corresponding **public key** at build time.

This forms an independent verification anchor: rogue servers lacking the matching seed fail snapshot signature verification on clients during login.

::: warning Open-Source Default Seed vs. Private Deployment Keys
Official Docker Hub images bundle a **public example seed** matching the public key checked into source—convenient for turnkey setup, yet meaning all default-image servers share one verification identity. For **exclusive signing authority**, generate a private seed and rebuild your clients with the exported public key. [Getting Started](/en/hosting/) · [Encryption & Boundaries](/en/reference/security)
:::

## Key Files & Platform Paths

| File / Setting | Purpose |
| --- | --- |
| `deploy/authorization-key.default` | Public default Ed25519 seed in repo (44-byte canonical Base64, no trailing newline). |
| `Client/apple/Shared/Resources/AuthorizationTrust.json` | Single build input shared by all 4 clients (`{"public_key": "..."}`). |
| `/usr/share/chirp/authorization-key.default` | Default seed inside the release Docker image (`65532:65532`, mode `0400`). |
| `CHIRP_AUTHORIZATION_KEY_FILE` | Runtime env var pointing to the active seed file (recommended mount: `/run/secrets/authorization-key`). |

Where each client packages the public key:
- **macOS / iOS**: `Bundle.main` resource inside the app bundle.
- **Android**: Validated by Gradle and packed into APK `assets/AuthorizationTrust.json`.
- **Windows**: Copied alongside `Chirp.Protocol.exe` (or MSIX root).

> [!NOTE] Scope relative to other keys
> This key certifies **only** device registration/revocation snapshots. Account root seeds, device private keys, Passkeys, MLS content keys, and LiveKit API keys (`keys.json`) are generated independently. [Public Compose](https://github.com/YouZiFeiLe/Chirp/blob/main/compose.yaml)

## Generating & Mounting a Private Signing Seed

Run offline from repo root on trusted Linux, macOS, or WSL (`go.mod` Go version required; creates files with `0600` and never overwrites existing seeds): [Auth CLI](https://github.com/YouZiFeiLe/Chirp/blob/main/cmd/chirp/authorization.go) · [Config Loader](https://github.com/YouZiFeiLe/Chirp/blob/main/internal/config/authorization.go)

```sh
mkdir -p .build/authorization
go run ./cmd/chirp authorization -generate-key \
  -key-file .build/authorization/new-key
go run ./cmd/chirp authorization -export-trust \
  -key-file .build/authorization/new-key \
  > .build/authorization/AuthorizationTrust.json
cp .build/authorization/AuthorizationTrust.json \
  Client/apple/Shared/Resources/AuthorizationTrust.json
go run ./cmd/chirp authorization -verify-trust \
  Client/apple/Shared/Resources/AuthorizationTrust.json \
  -key-file .build/authorization/new-key
```

> [!TIP]
> `-verify-trust` exits silently with code `0` on match. When `-key-file` is omitted, CLI checks `CHIRP_AUTHORIZATION_KEY_FILE`, then `/run/secrets/authorization-key` (or `authorization-key` next to the DB when run bare-metal).

Copy `new-key` onto your server and install it readable solely by UID `65532` (must be `0400` or `0600`):

```sh
cd ~/chirp
sudo install -d -m 0700 secrets
sudo install -o 65532 -g 65532 -m 0400 /path/to/new-key secrets/authorization-key
```

Add `compose.override.yaml` next to `compose.yaml`:

```yaml
services:
  app:
    environment:
      CHIRP_AUTHORIZATION_KEY_FILE: /run/secrets/authorization-key
    volumes:
      - type: bind
        source: ./secrets/authorization-key
        target: /run/secrets/authorization-key
        read_only: true
        bind:
          create_host_path: false
```

Rebuild and redistribute all clients using the updated `AuthorizationTrust.json`, then recreate `app` with `sudo docker compose up -d --force-recreate --wait app`. **Back up your private seed and public JSON safely offline**—old clients cannot log in once swapped.

## Multi-Server Switching & Origin Isolation

Clients derive `/authorization/v5/snapshot` from the discovered `passkey_origin` (including custom ports). Account roots, device trust, and log checkpoints remain strictly keyed by canonical Origin (lowercase host + explicit port, e.g., `https://chirp.first.test:443`)—history from one domain **cannot** replay onto another even if both servers use the default seed. [Origin Normalization](https://github.com/YouZiFeiLe/Chirp/blob/main/internal/identity/activation.go) · [Snapshot Signing](https://github.com/YouZiFeiLe/Chirp/blob/main/internal/authorization/server.go)

## Verifying Packaged Client Public Keys

Before distributing custom builds, verify the embedded JSON matches byte-for-byte:

- **macOS / iOS** (`cmp` exits silently with `0`):
  ```sh
  cmp Client/apple/Shared/Resources/AuthorizationTrust.json \
    Client/apple/dist/macos/Chirp.app/Contents/Resources/AuthorizationTrust.json
  cmp Client/apple/Shared/Resources/AuthorizationTrust.json \
    .build/DerivedData-ios-device/Build/Products/Release-iphoneos/Chirp.app/AuthorizationTrust.json
  ```
- **Android APK / Windows MSIX**:
  ```sh
  python3 -c "
  import sys
  from pathlib import Path
  from zipfile import ZipFile

  package = Path(sys.argv[1])
  entries = {'.apk': 'assets/AuthorizationTrust.json', '.msix': 'AuthorizationTrust.json'}
  entry = entries[package.suffix.lower()]
  expected = Path('Client/apple/Shared/Resources/AuthorizationTrust.json').read_bytes()
  with ZipFile(package) as archive:
      if archive.namelist().count(entry) != 1 or archive.read(entry) != expected:
          raise SystemExit('Public key missing, duplicated, or mismatched inside package')
  print('Embedded public key matches canonical source')
  " Client/android/app/build/outputs/apk/release/app-release.apk
  ```

For complete server environment variables and container secret mount details, see [Operations Reference](/en/hosting/operations).
