# Devices, Backups & Account Recovery

Chirp enforces **single-session login + device-held keys**: only one native client per account may hold an active login at a time, and the **account root private key** that certifies new devices **remains exclusively with you—never uploaded to the server**. Understanding backups and device authorization saves you from losing access during hardware upgrades.

| Your Situation | Recommended Path |
| --- | --- |
| **Brand-new approved account** | Generate your root key on the first device, choose a strong passphrase, and export a `.chirpkey` file. |
| **Upgrading hardware with old device handy** | Sign in on the new device with Passkey, then let the **old device scan the new device's pairing QR code**, verify safety codes, and approve. |
| **Old device lost or wiped, `.chirpkey` kept** | Sign in on the new device with Passkey, choose **Restore with Recovery File**, pick your `.chirpkey`, and enter the exact passphrase. |
| **Old device gone AND no `.chirpkey` / forgotten passphrase** | The cryptographic identity **cannot be recovered** (even by administrators). Ask your admin to disable/delete the account so you can re-register cleanly. |

::: tip Before wiping or selling an old device
Make sure your **[Passkey](https://fidoalliance.org/passkeys/)** is already synced to your replacement hardware (via iCloud Keychain, Google Password Manager, or a hardware security key) and complete one real Chirp sign-in and recovery test before factory-resetting the old device.
:::

<DeviceTrustTreeDiagram />

## First Device: Creating & Protecting `.chirpkey`

Your first approved login creates an [Ed25519](https://datatracker.ietf.org/doc/html/rfc8032) account root identity and walks you through saving an offline `.chirpkey` backup:

1. **Choose a strong passphrase**: Enter and confirm a passphrase of at least **16 Unicode scalar values** (up to 1024 UTF-8 bytes). Chirp **preserves letter casing as well as leading/trailing spaces verbatim**, so password managers paste reliably.
2. **Export somewhere durable**: Save the `.chirpkey` file (suggested name `<username>_<YYYY-MM-DD>_<platform>.chirpkey`) to reliable off-device storage. **Store the passphrase and the `.chirpkey` file separately** (passphrase in a password manager; file in backup storage).
3. **Confirm after the countdown**: Return to Chirp, read the safety notice during the 5-second countdown, and confirm. Only then does the client register the root public key with the server.

> [!NOTE] What lives inside `.chirpkey`?
> Only your **account root keypair and metadata for that server origin**, sealed with [Argon2id](https://datatracker.ietf.org/doc/html/rfc9106) and [AES-256-GCM](https://csrc.nist.gov/pubs/sp/800/38/d/final). It contains **no** Passkeys, old device keys, chat history, or attachments. A single `.chirpkey` works cross-platform—for instance, exporting on iOS and restoring on Windows. See [`.chirpkey` Format Specification](/en/reference/chirpkey).

## Option 1: Pair a New Device Using an Existing Device

<VerificationFlowDiagram />

If you still have a previously authorized device that has not been revoked (even if its login session was superseded earlier, its device key remains eligible to certify peers):

1. **Start on the new device**: Sign in with Passkey and select **Authorize with Existing Device**. Keep the signed QR code on screen (valid for **5 minutes**).
2. **Approve from the old device**: Open **Settings → Authorize New Device** on the old device:
   - Point the camera directly at the new device's QR code; or
   - Export the QR PNG on the new device, send it to your old device, and choose **Import QR Image** (supports standard images ≤ 8 MiB and ≤ 4096 px per side).
3. **Verify all 3 safety codes & authenticate locally**:
   - With live camera scan, both screens display three 4-digit codes—verify all three match before confirming on both sides.
   - **When importing a QR image**, the old device hides its computed codes and asks you to **type all 3 code groups displayed on the new device** (3 consecutive wrong attempts abort pairing immediately).
   - Confirm local device biometrics/PIN on the old device to sign the certificate.
4. **Zero-gap handoff**: The new device downloads its signed certificate and activates automatically. **Your old login session stays online until the new device finishes activation**, preventing network drops from logging out both devices at once.

## Option 2: Restore Using a `.chirpkey` File

1. Sign in on the new device with your Passkey on the same server URL, then select **Restore with Recovery File**.
2. Select your `.chirpkey` file, confirm the filename, and enter your exact recovery passphrase (preserving case and spaces).
3. Chirp decrypts the root seed purely in local memory, verifies it matches your server account, generates a fresh hardware-backed keypair for the new device, and activates.

## Friend Re-Verification & Revoking Lost Devices

- **Friends must verify your new device once**: Earlier SAS checks bound trust to your old device key. When your new device meets a friend in a room for the first time, compare the 3 safety codes once to establish trust for the new hardware.
- **Revoke lost or retired devices promptly**: Open **Settings → Devices**, verify the device name, platform, and fingerprint, and tap **Revoke Device**.
  - To prevent accidental self-lockout, clients block revoking the **currently active device** and require keeping at least one valid device.
  - Revocation writes an immutable tombstone into the authorization log—a revoked device can **never** be revived, even with its certificate or `.chirpkey` (though `.chirpkey` can still onboard a brand-new device for the account).
  - Permanently banning an account or forcibly revoking its last valid device requires an administrator in the web console. [Admin Console Guide](/en/hosting/admin-console)

## Resetting Local App Data

From the client sign-in screen (even before logging in or if an account is disabled), you can click **Clear Local Data**. This wipes locally stored device keys, certificates, friend/trust checkpoints, cached blacklists, diagnostic logs, and saved server settings—restoring a clean install state. It **never deletes** externally saved `.chirpkey` backups or server-side records.
