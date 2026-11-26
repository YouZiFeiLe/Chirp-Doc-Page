# Your First Encrypted Call

Before you start, ask your server administrator for two things: the **server's full HTTPS address** (for example `https://voice.example.com`) and the **Chirp installer for your platform**. Grab a friend with a separate approved account on any combination of macOS, iOS, Android, or Windows, and follow the three steps below.

::: info Why register in the browser AND verify safety codes in the room?
Chirp separates identity into two layers: an account **[Passkey (WebAuthn)](https://www.w3.org/TR/webauthn-3/)** plus a **local device cryptographic identity**. The browser proves to the server who you are, while actual end-to-end encryption keys are generated strictly on your own device. Friends establish mutual trust by comparing a [Short Authentication String (SAS)](https://en.wikipedia.org/wiki/Short_authentication_string) over an independent channel before voice or messages flow.
:::

## Step 1: Request Access in Your Browser

1. Open the server address from your administrator in a browser on your phone or computer and click **Request Access** (`/register`).
2. Pick a username made of **3 to 15 ASCII letters** (case-insensitive; no numbers, spaces, or punctuation) and follow your browser prompt to create a Passkey stored with biometrics or a password manager.
3. Submit the form to receive a request code starting with `CHIRP-`. Click **Copy Request ID**, send the full string to your administrator for approval, and feel free to close the tab.

> [!TIP] Forgot to copy your request ID or hit the pending queue limit?
> For privacy, request IDs cannot be retrieved once you close the confirmation page, and the server retains at most **100 pending registrations** at a time. If you lose your code, ask your administrator to delete the old entry in the admin console so you can register again.

<figure class="product-figure">
  <a href="/images/web-register.png" aria-label="Open full-size registration page screenshot"><img src="/images/web-register.png" width="1440" height="1000" loading="lazy" alt="Chirp registration page showing username input and Create Passkey & Apply button" /></a>
  <figcaption>The browser registration page. After Passkey creation, the full request ID appears for one-click copying.</figcaption>
</figure>

## Step 2: Sign In on a Native Client & Back Up Your Identity

Once your administrator approves your request:

1. Launch your installed Chirp client, enter the exact HTTPS server URL (include non-default ports such as `https://voice.example.com:8443`), and confirm. [Installing Clients](/en/guide/clients)
2. Click **Sign In with Passkey**. Your system browser opens for Passkey authentication and redirects back into Chirp (macOS, Windows, and Android also support displaying a login QR code you can scan from a phone that holds your Passkey).
3. **Create and save your offline recovery file**: On your very first sign-in, Chirp generates a local root key on your device, asks you to set a recovery passphrase of **at least 16 characters**, and prompts you to save an encrypted `.chirpkey` backup somewhere durable (cloud drive, USB stick, or backup folder). Return to the confirmation screen, wait out the short countdown after reading the warning, and confirm.

::: warning Guard your `.chirpkey` file and passphrase
Your account root private key **never leaves your devices**. Administrators cannot reset or recover it for you. If you later switch phones or wipe a computer without an old authorized device on hand, your `.chirpkey` file and exact passphrase are the only way to restore your identity. [Devices & Recovery](/en/guide/devices)
:::

## Step 3: Enter a Room & Verify Peer Devices

<VerificationFlowDiagram />

1. Pick a room from the room list (fresh servers come with a default **Public Lobby**; password-protected rooms prompt for an 8–128 character room password).
2. **Verify peer safety codes (SAS)**: In the room roster, tap or click a friend's avatar or **Verification Required** badge to start device verification. Once both sides accept, each screen displays **three 4-digit security codes**.
3. **Compare codes out-of-band**: Look at each other's screens in person or read all **three code groups in order** over an already trusted channel (such as a phone call or existing encrypted chat). Tap **Confirm** only when every digit matches on both screens. Cancel immediately if even a single digit differs.
4. **Key readiness & manual unmute**: As soon as every device in the room is mutually verified and OpenMLS finishes keying, the room switches to **Secure Connection Ready**. Everyone joins **muted by default**—click unmute, grant microphone permission, say hello, and enjoy your first encrypted call!

::: tip When a third friend joins the room
Device trust is **pairwise**. Even if you and Alex already trust each other, when Sam walks into the room with their device, both you and Alex must compare safety codes with Sam once. While any device remains unverified, voice, text chat, and file transfers automatically pause across the room until full keying completes.
:::

## Quick Troubleshooting

| What you see | Likely cause & fix |
| --- | --- |
| Room stays stuck on **Waiting for Verification** | At least one member is unverified or switched to a new device. Click any member marked **Verification Required** to complete SAS pairing—switching hardware requires verifying the new device once. |
| Room is ready, but only one side hears audio | Have the speaker check mute state, VAD threshold, and OS mic permissions; have the listener verify **Deafen** is off, output device selection is right, and per-member volume is not turned down. [Audio & Profile](/en/guide/audio-and-profile) |
| Both sides unmuted with working mics, zero audio | Note both client platforms, room name, and approximate time, then ask your administrator to verify `CHIRP_RTC_NODE_IP` and inbound firewall rules for `7882/UDP`. [Troubleshooting](/en/hosting/troubleshooting) |
