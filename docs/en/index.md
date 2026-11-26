---
title: Chirp Documentation
titleTemplate: false
aside: false
prev: false
next: false
pageClass: docs-overview
---

<script setup>
import { Info } from '@lucide/vue'
import SourceEdition from '../.vitepress/theme/components/SourceEdition.vue'
import DocumentDirectory from '../.vitepress/theme/components/DocumentDirectory.vue'
</script>

# Chirp Documentation

<SourceEdition />

<div class="reader-note" role="note">
<Info class="note-icon" :size="17" aria-hidden="true" />

**Just here to talk with friends?** Grab your administrator's HTTPS server address and client installer, then head straight to [Your First Call](/en/guide/first-call) to register, sign in, and verify devices. **Hosting your own server?** Start at [Self-Hosting from Scratch](/en/hosting/) to bring up the entire stack with a single Docker Compose command.

</div>

Chirp is a **self-hosted, end-to-end encrypted (E2EE) voice room platform** designed for close friends and small groups. Whether you run macOS, iOS, Android, or Windows, everyone joins the same rooms for low-latency voice calls, ephemeral text chat, and secure file transfers.

Unlike hosted chat apps, a Chirp server only handles account approvals, signaling coordination, and ciphertext relay—**decryption keys for voice, messages, and attachments never leave members' own devices**. Administrators manage accounts and rooms, while cryptographic trust is established directly between members by comparing safety codes on their screens.

To see every piece that powers a single call, start with the [System Architecture](/en/reference/architecture).

## Documentation Directory

<DocumentDirectory />
