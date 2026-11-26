# Audio Settings, Noise Suppression & Profiles

Beyond baseline calls, all four Chirp clients expose fine-grained audio presets, Voice Activity Detection (VAD), per-member gain, and live-synced profile controls.

<AudioPipelineDiagram />

## Audio Processing Presets & RNNoise

Chirp ships **[RNNoise](https://jmvalin.ca/demo/rnnoise/)** neural noise suppression on every platform alongside three tailored processing presets under **Voice Settings**:

| Platform | Available Presets | Under the Hood & When to Switch |
| --- | --- | --- |
| **macOS / iOS** | **Apple System Processing + RNNoise (Default)**<br>Apple System Processing<br>WebRTC AEC + RNNoise | Pairs Apple hardware Echo Cancellation (AEC) / AGC with RNNoise (using [CallKit](https://developer.apple.com/documentation/callkit) on iOS). Switch to **WebRTC AEC + RNNoise** if external audio interfaces conflict with system processing. |
| **Windows** | **System Communication + RNNoise (Default)**<br>System Communication<br>Software AEC (Sonora) + RNNoise | Combines [WASAPI](https://learn.microsoft.com/windows/win32/coreaudio/wasapi), Rust Sonora (WebRTC AEC3 + AGC2), and `Chirp.RNNoise.dll`. Use **Software AEC (Sonora) + RNNoise** if laptop or USB drivers deliver weak hardware echo cancellation. |
| **Android** | **WebRTC AEC + RNNoise (Default)**<br>WebRTC Built-in NS<br>AEC Only | Runs via [Core-Telecom](https://developer.android.com/develop/connectivity/telecom/voip-app/telecom) and Chirp's JNI pipeline. Defaults to WebRTC AEC + RNNoise; switch presets to compare natural voice clarity. |

::: tip Test your preset locally before joining a call
In **Voice Settings**, click **Local Mic Test** and **Stop & Listen** (mutually exclusive with active room calls—entering a room stops the test automatically). Speak for up to 10 seconds, then click **Stop & Listen** to hear the **last 3 seconds processed through your active noise suppression and VAD gate**.
:::

## Voice Activity Detection (VAD) & Gain Controls

- **VAD gate**: Off by default (continuous transmission while unmuted). When enabled, audio transmits only above your threshold:
  - Default threshold: **−45 [dBFS](https://en.wikipedia.org/wiki/DBFS)** (adjustable from **−80 dBFS to −10 dBFS**).
  - **Mute always wins**: Manually muting silences output regardless of room noise. The live input meter displays pre-gate levels so you can dial thresholds precisely.
  - Stored locally on device and preserved across reconnects and preset switches.
- **Mute vs. Deafen**: Muting stops your outgoing mic; **Deafen** stops all incoming remote audio and room join/leave chimes (without replaying missed chimes when un-deafened).
- **Per-member volume**: Adjust any participant locally between **0% and 200%** without affecting anyone else.

## Cross-Platform Window & Background Behavior

- **macOS**: Closing the last window **keeps your call running in the background**; reopen any window to return to the same call, and press `Cmd + Q` to quit cleanly.
- **Windows**: Clicking `×` on the last main window **ends the call immediately and terminates both `Chirp.exe` and `Chirp.Protocol.exe`**, notifying peers right away.
- **iOS / Android**: Calls and scheduled key rotations survive screen lock and backgrounding (Android uses Core-Telecom + foreground service). **Force-swiping Chirp out of Recents** ends the call immediately and clears the memory-only login token.

## Display Name & Avatar

Edit your profile anytime—updates broadcast seamlessly mid-call **without resetting rooms or keys**:

- **Display name**: **1–80 characters** (any language or emoji), leading/trailing whitespace trimmed, invisible control chars blocked. Updating your display name never alters your ASCII login handle.
- **Avatar**: Server accepts static **JPEG** or **PNG** (clients auto-convert HEIC locally), **< 5 MB (5,000,000 bytes)**, max **8,192 px** per side, and **≤ 32 megapixels**.

## Friends vs. Device Trust

Adding someone as a friend does **not** authorize encrypted calls:

| Concept | Scope | Controls Encryption Keys? |
| --- | --- | --- |
| **Friends List** | One-way contact bookmarking for quick social status checks. | **No.** Friend status alone grants zero cryptographic trust. |
| **Device Trust (SAS)** | Binds a friend's **account root identity + specific device public key** once via safety codes. | **Yes.** Every device present in a room must be mutually trusted before OpenMLS distributes media keys. |

In short: **Friends identify people; safety codes authenticate devices.** If a friend buys a new phone, they stay on your Friends list, yet everyone verifies their new device once.

## Language Preference & Diagnostic Logs

- **Interface language**: Choose **简体中文**, **English**, or **Follow System** under Settings. Switching takes effect immediately without dropping calls.
- **Local diagnostic logs (`.chirplog`)**: **Off by default** and configurable both before and after login. When enabled, Chirp logs sanitized timing, status codes, and crypto frame stats locally on a **24-hour rolling window** (never chat plaintext, attachments, server URLs, Passkeys, or secrets). Click **Export Logs** to save a single 24h `.chirplog` archive, or **Clear Logs** anytime. [Client Log Specification](/en/reference/chirplog)
