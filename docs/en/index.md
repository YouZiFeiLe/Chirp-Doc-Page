---
title: Chirp Documentation
titleTemplate: false
aside: false
prev: false
next: false
pageClass: docs-overview
---

<script setup>
import { ArrowRight, Info, Scale } from '@lucide/vue'
import SourceEdition from '../.vitepress/theme/components/SourceEdition.vue'
import DocumentDirectory from '../.vitepress/theme/components/DocumentDirectory.vue'
</script>

# Chirp Documentation

<SourceEdition />

<div class="compliance-banner" role="region" aria-label="Compliance and Legal Notice">
  <div class="compliance-banner-body">
    <Scale class="compliance-banner-icon" :size="20" aria-hidden="true" />
    <div>
      <p class="compliance-banner-title">Compliance &amp; Legal Notice (COMPLIANCE.md)</p>
      <p class="compliance-banner-desc">Chirp is an open-source project released for technical sharing. The author operates no public servers, provides no ongoing support, and receives no revenue. Read the full compliance notice before using, distributing, or deploying this project.</p>
    </div>
  </div>
  <a class="compliance-banner-cta" href="/en/compliance">
    <span>Read Full Notice</span>
    <ArrowRight :size="16" aria-hidden="true" />
  </a>
</div>

<div class="reader-note" role="note">
<Info class="note-icon" :size="17" aria-hidden="true" />

**Just here to talk with friends?** Grab your administrator's HTTPS server address and client installer, then head straight to [Your First Call](/en/guide/first-call) to register, sign in, and verify devices. **Hosting your own server?** Start at [Self-Hosting from Scratch](/en/hosting/) to bring up the entire stack with a single Docker Compose command.

</div>

Chirp is a **self-hosted, end-to-end encrypted (E2EE) voice room platform** designed for close friends and small groups. Whether you run macOS, iOS, Android, or Windows, everyone joins the same rooms for low-latency voice calls, ephemeral text chat, and secure file transfers.

Unlike hosted chat apps, a Chirp server only handles account approvals, signaling coordination, and ciphertext relay—**decryption keys for voice, messages, and attachments never leave members' own devices**. Administrators manage accounts and rooms, while cryptographic trust is established directly between members by comparing safety codes on their screens.

To see every piece that powers a single call, start with the [System Architecture](/en/reference/architecture).

## Documentation Directory

<DocumentDirectory />
