<script setup lang="ts">
import { computed } from 'vue'
import { useData } from 'vitepress'

const { lang } = useData()
const isEn = computed(() => lang.value.startsWith('en'))
</script>

<template>
  <figure class="diagram-card" :aria-label="isEn ? 'Cross-Platform Client Architecture & Shared Core' : 'Chirp 四端客户端统一架构与共享资源联动图'">
    <div class="diagram-header">
      <div class="diagram-title">{{ isEn ? 'Cross-Platform Client Architecture & Shared Cryptographic Core' : '四端客户端架构分工与跨端共享内核' }}</div>
    </div>

    <div class="diagram-body">
      <svg viewBox="0 0 760 330" class="topology-svg" role="img" :aria-label="isEn ? 'Cross-platform client architecture' : '跨平台客户端架构与共享资源'">
        <text x="24" y="24" class="diag-section-label">
          {{ isEn ? '1. Native UI, Platform Key Vault & Audio Layer (Platform-Specific, Unified UX)' : '1. 原生界面、本地密钥库与系统音频层（各端独立实现，体验对齐）' }}
        </text>

        <rect x="20" y="38" width="228" height="98" rx="8" class="diag-node diag-node-accent" />
        <text x="134" y="60" text-anchor="middle" class="diag-node-title">Apple (macOS / iOS)</text>
        <text x="134" y="78" text-anchor="middle" class="diag-node-sub">SwiftUI + ApplicationSession</text>
        <text x="134" y="95" text-anchor="middle" class="diag-node-sub">Data Protection Keychain</text>
        <text x="134" y="112" text-anchor="middle" class="diag-node-sub">Apple AudioUnit / LiveKit Swift</text>
        <text x="134" y="128" text-anchor="middle" class="diag-node-sub">{{ isEn ? 'ChirpVoiceReceiver.mm frame auth' : 'ChirpVoiceReceiver.mm 帧验签' }}</text>

        <rect x="266" y="38" width="228" height="98" rx="8" class="diag-node diag-node-accent" />
        <text x="380" y="60" text-anchor="middle" class="diag-node-title">Android (API 35+)</text>
        <text x="380" y="78" text-anchor="middle" class="diag-node-sub">Jetpack Compose + Material 3</text>
        <text x="380" y="95" text-anchor="middle" class="diag-node-sub">Android Keystore AES-GCM</text>
        <text x="380" y="112" text-anchor="middle" class="diag-node-sub">Core-Telecom + LiveKit Android</text>
        <text x="380" y="128" text-anchor="middle" class="diag-node-sub">voice_receiver.cpp + VoiceKeys.kt</text>

        <rect x="512" y="38" width="228" height="98" rx="8" class="diag-node diag-node-accent" />
        <text x="626" y="60" text-anchor="middle" class="diag-node-title">Windows (Win11 x64)</text>
        <text x="626" y="78" text-anchor="middle" class="diag-node-sub">WinUI 3 + WASAPI / Opus</text>
        <text x="626" y="95" text-anchor="middle" class="diag-node-sub">DPAPI (identities.v5)</text>
        <text x="626" y="112" text-anchor="middle" class="diag-node-sub">{{ isEn ? 'Go Child Process (stdin/stdout)' : 'Go 子进程（stdin/stdout 管道）' }}</text>
        <text x="626" y="128" text-anchor="middle" class="diag-node-sub">Sonora AEC3 + LiveKit/Pion Go</text>

        <path d="M 134 136 L 134 166" class="diag-line-brand" />
        <path d="M 380 136 L 380 166" class="diag-line-brand" />
        <path d="M 626 136 L 626 166" class="diag-line-brand" />

        <rect x="20" y="166" width="720" height="86" rx="8" class="diag-group" />
        <text x="380" y="187" text-anchor="middle" class="diag-group-title">
          {{ isEn ? '2. Shared Cryptographic Core & Single-Source-of-Truth Assets' : '2. 跨端共享密码内核与统一资源（Single Source of Truth）' }}
        </text>

        <rect x="34" y="198" width="166" height="42" rx="6" class="diag-slot-1" />
        <text x="117" y="216" text-anchor="middle" class="diag-node-title">{{ isEn ? 'Rust Core (OpenMLS)' : 'Rust 核心（OpenMLS）' }}</text>
        <text x="117" y="231" text-anchor="middle" class="diag-node-sub">MLS · SAS · .chirpkey v1</text>

        <rect x="210" y="198" width="166" height="42" rx="6" class="diag-node" />
        <text x="293" y="216" text-anchor="middle" class="diag-node-title">{{ isEn ? 'RNNoise & SDK Patches' : 'RNNoise 与 SDK 补丁' }}</text>
        <text x="293" y="231" text-anchor="middle" class="diag-node-sub">{{ isEn ? 'Denoise · No external ICE' : '降噪 · 禁外部 ICE · 防重放' }}</text>

        <rect x="386" y="198" width="166" height="42" rx="6" class="diag-node" />
        <text x="469" y="216" text-anchor="middle" class="diag-node-title">{{ isEn ? 'Tokens & Shared Copy' : '设计令牌与共享文案' }}</text>
        <text x="469" y="231" text-anchor="middle" class="diag-node-sub">{{ isEn ? 'design-tokens · Strings · Audio' : 'design-tokens · Strings · 提示音' }}</text>

        <rect x="562" y="198" width="164" height="42" rx="6" class="diag-badge-box" />
        <text x="644" y="216" text-anchor="middle" class="diag-badge-title">AuthorizationTrust.json</text>
        <text x="644" y="231" text-anchor="middle" class="diag-node-sub">{{ isEn ? 'Unified Ed25519 trust key' : '四端一致授权验签公钥' }}</text>

        <path d="M 380 252 L 380 274" class="diag-line-muted" />
        <rect x="20" y="274" width="720" height="42" rx="7" class="diag-storage" />
        <text x="380" y="299" text-anchor="middle" class="diag-node-sub">
          {{ isEn ? 'Unified Chirp Go & LiveKit SFU linkage: /v1/client-config · Passkey / QR · Cross-OS room trust & .chirpkey' : '统一联动 Chirp Go 服务端与 LiveKit SFU：/v1/client-config 发现 · Passkey / 扫码互认 · 跨平台房间互认与 .chirpkey 互通' }}
        </text>
      </svg>
    </div>
  </figure>
</template>
