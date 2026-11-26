<script setup lang="ts">
import { computed } from 'vue'
import { useData } from 'vitepress'

const { lang } = useData()
const isEn = computed(() => lang.value.startsWith('en'))
</script>

<template>
  <figure class="diagram-card" :aria-label="isEn ? 'Client Audio Capture, Noise Suppression, VAD & Encryption Pipeline' : 'Chirp 客户端音频采集、降噪、VAD 门控与端到端加密流水线'">
    <div class="diagram-header">
      <div class="diagram-title">{{ isEn ? 'Client Voice Capture, Processing & E2EE Transmission Pipeline' : '客户端语音采集、处理与加密发送流水线' }}</div>
    </div>

    <div class="diagram-body">
      <svg viewBox="0 0 760 196" class="topology-svg" role="img" :aria-label="isEn ? 'Audio pipeline' : '音频处理流水线'">
        <defs>
          <marker id="aud-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 1 L 8 5 L 0 9 z" fill="var(--vp-c-brand-1)" />
          </marker>
        </defs>

        <rect x="16" y="34" width="112" height="90" rx="8" class="diag-node" />
        <text x="72" y="60" text-anchor="middle" class="diag-node-title">{{ isEn ? '1. Mic Capture' : '1. 麦克风采集' }}</text>
        <text x="72" y="80" text-anchor="middle" class="diag-node-sub">{{ isEn ? 'Manual unmute only' : '需用户手动开麦' }}</text>
        <text x="72" y="98" text-anchor="middle" class="diag-node-sub">Apple / WASAPI</text>
        <text x="72" y="113" text-anchor="middle" class="diag-node-sub">Android Core-Telecom</text>

        <path d="M 128 79 L 146 79" class="diag-line-brand" marker-end="url(#aud-arrow)" />

        <rect x="148" y="34" width="142" height="90" rx="8" class="diag-node diag-node-accent" />
        <text x="219" y="60" text-anchor="middle" class="diag-node-title">{{ isEn ? '2. AEC & RNNoise' : '2. AEC 与 RNNoise' }}</text>
        <text x="219" y="80" text-anchor="middle" class="diag-node-sub">{{ isEn ? 'Echo cancel + AGC' : '回声消除 + 自动增益' }}</text>
        <text x="219" y="98" text-anchor="middle" class="diag-node-sub">{{ isEn ? '3 selectable presets' : '支持 3 种音频预设切换' }}</text>
        <text x="219" y="113" text-anchor="middle" class="diag-node-sub">{{ isEn ? 'RNNoise on by default' : '默认开启 RNNoise 降噪' }}</text>

        <path d="M 290 79 L 308 79" class="diag-line-brand" marker-end="url(#aud-arrow)" />

        <rect x="310" y="34" width="132" height="90" rx="8" class="diag-node" />
        <text x="376" y="60" text-anchor="middle" class="diag-node-title">{{ isEn ? '3. VAD Gate' : '3. VAD 语音门控' }}</text>
        <text x="376" y="80" text-anchor="middle" class="diag-node-sub">{{ isEn ? 'Optional (off by default)' : '可选开关（默认关闭）' }}</text>
        <text x="376" y="98" text-anchor="middle" class="diag-node-sub">{{ isEn ? 'Default −45 dBFS' : '默认阈值 −45 dBFS' }}</text>
        <text x="376" y="113" text-anchor="middle" class="diag-node-sub">{{ isEn ? 'Range −80 to −10 dBFS' : '范围 −80 至 −10 dBFS' }}</text>

        <path d="M 442 79 L 460 79" class="diag-line-brand" marker-end="url(#aud-arrow)" />

        <rect x="462" y="34" width="136" height="90" rx="8" class="diag-node diag-node-accent" />
        <text x="530" y="60" text-anchor="middle" class="diag-node-title">{{ isEn ? '4. Opus + E2EE' : '4. Opus + 帧加密' }}</text>
        <text x="530" y="80" text-anchor="middle" class="diag-node-sub">{{ isEn ? 'Verify 3s media lease' : '检查 3s 媒体许可有效' }}</text>
        <text x="530" y="98" text-anchor="middle" class="diag-node-sub">{{ isEn ? 'AES-GCM 96-bit IV' : 'AES-GCM 96 位 IV' }}</text>
        <text x="530" y="113" text-anchor="middle" class="diag-node-sub">{{ isEn ? 'Active slot sender key' : '当前发送槽位密钥密封' }}</text>

        <path d="M 598 79 L 616 79" class="diag-line-brand" marker-end="url(#aud-arrow)" />

        <rect x="618" y="34" width="126" height="90" rx="8" class="diag-slot-1" />
        <text x="681" y="60" text-anchor="middle" class="diag-node-title">{{ isEn ? '5. LiveKit SFU' : '5. LiveKit 转发' }}</text>
        <text x="681" y="80" text-anchor="middle" class="diag-node-sub">{{ isEn ? 'UDP 7882 direct' : 'UDP 7882 直达 SFU' }}</text>
        <text x="681" y="98" text-anchor="middle" class="diag-node-sub">{{ isEn ? 'Verify tag & IV first' : '接收端先验标签与 IV' }}</text>
        <text x="681" y="113" text-anchor="middle" class="diag-node-sub">{{ isEn ? 'Then Opus decode' : '再进入 Opus 解码播放' }}</text>

        <rect x="16" y="144" width="728" height="36" rx="6" class="diag-note-box" />
        <text x="380" y="166" text-anchor="middle" class="diag-node-sub">
          {{ isEn ? 'Mute always takes highest priority; unverified peers, expired leases, or preset errors immediately halt transmission without plaintext fallback.' : '静音开关优先级高于一切；若房间未互认、授权过期或切换音频预设失败，系统会立即停止采集或阻断发送，绝不退回明文传输。' }}
        </text>
      </svg>
    </div>
  </figure>
</template>
