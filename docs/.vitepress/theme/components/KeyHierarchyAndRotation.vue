<script setup lang="ts">
import { computed } from 'vue'
import { useData } from 'vitepress'

const { lang } = useData()
const isEn = computed(() => lang.value.startsWith('en'))
</script>

<template>
  <figure class="diagram-card" :aria-label="isEn ? 'Chirp V5 Key Hierarchy & Dual-Slot Rotation' : 'Chirp V5 密钥分层与双槽平滑轮换示意图'">
    <div class="diagram-header">
      <div class="diagram-title">{{ isEn ? 'V5 Key Trust Hierarchy & Dual-Slot Smooth Rotation' : 'V5 密钥信任层级与双槽平滑轮换' }}</div>
    </div>

    <div class="diagram-body">
      <svg viewBox="0 0 760 360" class="topology-svg" role="img" :aria-label="isEn ? 'Key hierarchy and rotation' : 'V5 密钥分层与轮换机制'">
        <text x="24" y="28" class="diag-section-label">
          {{ isEn ? '1. Identity & Content Key Hierarchy (Private Keys Stay on Client Devices)' : '1. 身份与内容密钥分层（私钥始终留在客户端）' }}
        </text>

        <rect x="20" y="42" width="150" height="66" rx="8" class="diag-node diag-node-accent" />
        <text x="95" y="65" text-anchor="middle" class="diag-node-title">{{ isEn ? 'Ed25519 Account Root' : '账号 Ed25519 根密钥' }}</text>
        <text x="95" y="83" text-anchor="middle" class="diag-node-sub">{{ isEn ? 'Only inside .chirpkey' : '仅存在于 .chirpkey' }}</text>
        <text x="95" y="98" text-anchor="middle" class="diag-node-sub">{{ isEn ? 'Never kept in daily vault' : '初始化后不驻留日常密钥库' }}</text>

        <path d="M 170 75 L 204 75" class="diag-line-brand" />
        <polygon points="200,71 208,75 200,79" fill="var(--vp-c-brand-1)" />

        <rect x="208" y="42" width="160" height="66" rx="8" class="diag-node" />
        <text x="288" y="65" text-anchor="middle" class="diag-node-title">{{ isEn ? 'Device Cert Chain (≤8)' : '设备证书链（≤ 8 层）' }}</text>
        <text x="288" y="83" text-anchor="middle" class="diag-node-sub">{{ isEn ? 'Per-device Ed25519 key' : '每台设备独立 Ed25519 私钥' }}</text>
        <text x="288" y="98" text-anchor="middle" class="diag-node-sub">{{ isEn ? 'Max 5 yrs · Revocable' : '有效期 ≤ 5 年 · 可单台撤销' }}</text>

        <path d="M 368 75 L 402 75" class="diag-line-brand" />
        <polygon points="398,71 406,75 398,79" fill="var(--vp-c-brand-1)" />

        <rect x="406" y="42" width="156" height="66" rx="8" class="diag-node" />
        <text x="484" y="65" text-anchor="middle" class="diag-node-title">OpenMLS Group (V5)</text>
        <text x="484" y="83" text-anchor="middle" class="diag-node-sub">{{ isEn ? 'Binds entry_id & roster' : '绑定 entry_id 与全员确认值' }}</text>
        <text x="484" y="98" text-anchor="middle" class="diag-node-sub">AES-128-GCM / X25519</text>

        <path d="M 562 75 L 596 75" class="diag-line-brand" />
        <polygon points="592,71 600,75 592,79" fill="var(--vp-c-brand-1)" />

        <rect x="600" y="42" width="140" height="66" rx="8" class="diag-node diag-node-accent" />
        <text x="670" y="65" text-anchor="middle" class="diag-node-title">{{ isEn ? '32B Sender Key' : '32B 发送者密钥' }}</text>
        <text x="670" y="83" text-anchor="middle" class="diag-node-sub">{{ isEn ? 'MLS Exporter derived' : 'MLS Exporter 独立导出' }}</text>
        <text x="670" y="98" text-anchor="middle" class="diag-node-sub">{{ isEn ? 'Encrypts Opus & chat' : '加密 Opus 语音帧与聊天' }}</text>

        <line x1="20" y1="132" x2="740" y2="132" stroke="var(--vp-c-divider)" stroke-dasharray="4 4" />

        <text x="24" y="158" class="diag-section-label">
          {{ isEn ? '2. Smooth Rotation Timeline (Default 60s Cycle, Zero-Interruption Dual-Slot Switch)' : '2. 例行平滑换钥时间线（默认 60 秒轮换，双槽交替不中断通话）' }}
        </text>

        <line x1="36" y1="226" x2="724" y2="226" stroke="var(--vp-c-text-3)" stroke-width="2" />

        <circle cx="60" cy="226" r="5" fill="var(--vp-c-brand-1)" />
        <text x="60" y="210" text-anchor="middle" class="diag-time">t = 0s</text>
        <rect x="30" y="242" width="120" height="46" rx="6" class="diag-slot-0" />
        <text x="90" y="262" text-anchor="middle" class="diag-node-title">{{ isEn ? 'Slot 0 Active' : '槽位 0 生效' }}</text>
        <text x="90" y="279" text-anchor="middle" class="diag-node-sub">{{ isEn ? 'Send/recv + 3s lease' : '正常收发与 3s 续租' }}</text>

        <circle cx="240" cy="226" r="5" fill="var(--vp-c-brand-1)" />
        <text x="240" y="210" text-anchor="middle" class="diag-time">{{ isEn ? 't = 48s (-12s lead)' : 't = 48s（提前 12s）' }}</text>
        <rect x="172" y="242" width="146" height="46" rx="6" class="diag-slot-1" />
        <text x="245" y="262" text-anchor="middle" class="diag-node-title">{{ isEn ? 'Pre-stage Slot 1' : '候选轮预装到槽位 1' }}</text>
        <text x="245" y="279" text-anchor="middle" class="diag-node-sub">{{ isEn ? 'Slot 0 stays live' : '仍用槽位 0 发送，通话不断' }}</text>

        <circle cx="420" cy="226" r="5" fill="var(--vp-c-brand-1)" />
        <text x="420" y="210" text-anchor="middle" class="diag-time">{{ isEn ? 't = 60s (Switch)' : 't = 60s（轮换点）' }}</text>
        <rect x="342" y="242" width="156" height="46" rx="6" class="diag-slot-1" />
        <text x="420" y="262" text-anchor="middle" class="diag-node-title">{{ isEn ? 'Switch Send to Slot 1' : '切换发送至槽位 1' }}</text>
        <text x="420" y="279" text-anchor="middle" class="diag-node-sub">{{ isEn ? 'Report activation · live' : '提交 activation · 不断麦' }}</text>

        <circle cx="570" cy="226" r="5" fill="var(--vp-c-text-2)" />
        <text x="570" y="210" text-anchor="middle" class="diag-time">{{ isEn ? 't = 61s (+1s grace)' : 't = 61s（+1s 后）' }}</text>
        <rect x="516" y="242" width="112" height="46" rx="6" class="diag-storage" />
        <text x="572" y="262" text-anchor="middle" class="diag-node-title">{{ isEn ? 'Wipe Slot 0' : '销毁槽位 0' }}</text>
        <text x="572" y="279" text-anchor="middle" class="diag-node-sub">{{ isEn ? 'Random overwrite' : '容忍在途帧后擦除' }}</text>

        <circle cx="696" cy="226" r="5" fill="#c94a4a" />
        <text x="696" y="210" text-anchor="middle" class="diag-time-warn">{{ isEn ? '90s / 120s Cap' : '90s / 120s 兜底' }}</text>
        <rect x="642" y="242" width="100" height="46" rx="6" class="diag-warn-box" />
        <text x="692" y="262" text-anchor="middle" class="diag-node-title">{{ isEn ? 'Hard Cutoff' : '客户端熔断' }}</text>
        <text x="692" y="279" text-anchor="middle" class="diag-node-sub">{{ isEn ? '90s rebuild / 120s' : '90s 重建 / 120s 停发' }}</text>

        <rect x="20" y="306" width="720" height="38" rx="6" class="diag-note-box" />
        <text x="380" y="329" text-anchor="middle" class="diag-node-sub">
          {{ isEn ? 'Any membership change, disconnect, or candidate timeout aborts the candidate round and forces a paused rebuild; old candidate keys never apply to new rosters.' : '若成员发生增减、连接中断或候选轮超时，系统立即作废候选密钥并触发「暂停重建」，绝不把旧名单的候选密钥用于新成员集合。' }}
        </text>
      </svg>
    </div>

    <figcaption class="diagram-caption">
      {{ isEn ? 'Media providers use 2 slots per sender with auto-ratchet and SIF plaintext bypass disabled: switching slots avoids recreating RTP encryptors or interrupting speech.' : '媒体加密采用每发送者双槽（Slot 0 / Slot 1）机制并关闭自动棘轮与明文绕过：切换新槽无需重建 RTP 加密器，也无需短暂闭麦。' }}
    </figcaption>
  </figure>
</template>
