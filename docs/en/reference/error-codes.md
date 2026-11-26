---
description: Search client-generated and server-recognized error codes alongside bilingual copy and recommended actions.
---

<script setup>
import ErrorCodeFilter from '../../.vitepress/theme/components/ErrorCodeFilter.vue'
import upstream from '../../../upstream.json'
const clientErrorSwift = `https://github.com/${upstream.repository}/blob/${upstream.revision}/Client/apple/Shared/ClientError.swift`
const enErrors = `https://github.com/${upstream.repository}/blob/${upstream.revision}/Client/apple/Shared/Resources/en.lproj/Errors.strings`
</script>

# Client Error Code Reference

When Chirp displays an alert dialog, enter the exact error code (such as `REGISTRATION_PENDING`) or any English/Chinese phrase in the search box below to locate the cause and next step.

This table indexes client-side error codes as well as server codes mapped consistently across macOS, iOS, Android, and Windows.

::: tip Most Frequent Codes
- **`REGISTRATION_PENDING`**: Your request succeeded and awaits administrator approval by Request ID.
- **`NETWORK_TIME_REQUIRED`**: Device clock drift exceeded tolerance—enable automatic system time and retry.
- **`CLIENT_UPDATE_REQUIRED`**: Your admin raised the platform's minimum version policy—install a newer release.
- **`DEVICE_IDENTITY_REQUIRED`**: New hardware lacks authorization—use [QR pairing or `.chirpkey` recovery](/en/guide/devices).
:::

## Searchable Error Table

<ErrorCodeFilter>

<!--@include: ../../.vitepress/data/apple-errors.inc.md-->

</ErrorCodeFilter>

::: info Localization & Privacy Rules
Clients parse canonical `error.code` and structured `client_policy` fields only—never displaying unvalidated raw server `error.message` strings or storing tokens, keys, or plaintext chat inside errors. Unrecognized server codes fold into `CLIENT_UNKNOWN_SERVER_ERROR`.

Verify definitions directly in <a :href="clientErrorSwift"><code>ClientError.swift</code></a> and <a :href="enErrors"><code>en.lproj/Errors.strings</code></a>, or consult [Troubleshooting](/en/hosting/troubleshooting).
:::
