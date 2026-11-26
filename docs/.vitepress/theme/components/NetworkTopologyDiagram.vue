<script setup lang="ts">
import { computed, ref } from 'vue'
import { useData } from 'vitepress'

const { lang } = useData()
const isEn = computed(() => lang.value.startsWith('en'))
const mode = ref<'builtin' | 'existing'>('builtin')
</script>

<template>
  <figure class="diagram-card" :aria-label="isEn ? 'Chirp Server Network & Component Topology' : 'Chirp 服务端网络与组件拓扑图'">
    <div class="diagram-header">
      <div class="diagram-title">{{ isEn ? 'Service Network & Component Topology' : '服务网络与组件拓扑' }}</div>
      <div class="diagram-tabs" role="tablist" :aria-label="isEn ? 'Deployment topology mode' : '部署拓扑模式'">
        <button type="button" role="tab" :aria-selected="mode === 'builtin'" :class="['diagram-tab', { active: mode === 'builtin' }]" @click="mode = 'builtin'">
          {{ isEn ? 'Bundled Nginx (HTTP-01 / DNS-01)' : '内置 Nginx（HTTP-01 / DNS-01）' }}
        </button>
        <button type="button" role="tab" :aria-selected="mode === 'existing'" :class="['diagram-tab', { active: mode === 'existing' }]" @click="mode = 'existing'">
          {{ isEn ? 'Existing Nginx' : '接入已有 Nginx' }}
        </button>
      </div>
    </div>

    <div class="diagram-body">
      <svg viewBox="0 0 760 340" class="topology-svg" role="img" :aria-label="isEn ? 'Network topology' : '网络与服务架构拓扑'">
        <defs>
          <marker id="arrow-brand" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 1 L 8 5 L 0 9 z" fill="var(--vp-c-brand-1)" />
          </marker>
          <marker id="arrow-muted" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 1 L 8 5 L 0 9 z" fill="var(--vp-c-text-2)" />
          </marker>
        </defs>

        <rect x="20" y="34" width="166" height="272" rx="10" class="diag-group" />
        <text x="103" y="58" text-anchor="middle" class="diag-group-title">{{ isEn ? 'Clients & Browsers' : '用户终端与浏览器' }}</text>

        <rect x="36" y="76" width="134" height="58" rx="7" class="diag-node" />
        <text x="103" y="100" text-anchor="middle" class="diag-node-title">{{ isEn ? 'Browser' : '浏览器' }}</text>
        <text x="103" y="119" text-anchor="middle" class="diag-node-sub">{{ isEn ? 'Register · Passkey · Admin' : '注册 · Passkey · 管理台' }}</text>

        <rect x="36" y="152" width="134" height="72" rx="7" class="diag-node diag-node-accent" />
        <text x="103" y="176" text-anchor="middle" class="diag-node-title">{{ isEn ? 'Native Clients' : '原生客户端' }}</text>
        <text x="103" y="194" text-anchor="middle" class="diag-node-sub">macOS · iOS · Android</text>
        <text x="103" y="210" text-anchor="middle" class="diag-node-sub">{{ isEn ? 'Windows · Local MLS' : 'Windows · 本地 MLS 密钥' }}</text>

        <rect x="36" y="238" width="134" height="52" rx="7" class="diag-badge-box" />
        <text x="103" y="260" text-anchor="middle" class="diag-badge-title">{{ isEn ? 'E2EE Boundary' : '端到端加密边界' }}</text>
        <text x="103" y="277" text-anchor="middle" class="diag-node-sub">{{ isEn ? 'Voice / Chat / Files' : '语音 / 文字 / 文件密文' }}</text>

        <rect x="236" y="34" width="166" height="176" rx="10" class="diag-group" />
        <text x="319" y="58" text-anchor="middle" class="diag-group-title">
          {{ mode === 'builtin' ? (isEn ? 'Bundled SWAG / Nginx' : '内置 SWAG / Nginx') : (isEn ? 'Existing Nginx' : '已有 Nginx / 代理') }}
        </text>

        <rect x="252" y="76" width="134" height="66" rx="7" class="diag-node" />
        <text x="319" y="99" text-anchor="middle" class="diag-node-title">{{ isEn ? 'TLS Termination' : 'TLS 终止与反代' }}</text>
        <text x="319" y="117" text-anchor="middle" class="diag-node-sub">443/TCP HTTPS &amp; WSS</text>
        <text x="319" y="133" text-anchor="middle" class="diag-node-sub">
          {{ mode === 'builtin' ? (isEn ? '80/TCP (HTTP-01 opt.)' : '80/TCP（HTTP-01 可选）') : (isEn ? 'Existing certs/renewal' : '沿用已有证书与续期') }}
        </text>

        <rect x="252" y="154" width="134" height="42" rx="6" class="diag-note-box" />
        <text x="319" y="172" text-anchor="middle" class="diag-node-sub">{{ isEn ? 'Block /twirp & /internal' : '屏蔽 /twirp 与 /internal' }}</text>
        <text x="319" y="187" text-anchor="middle" class="diag-node-sub">{{ isEn ? 'Rate-limit /authorization' : '限制 /authorization 速率' }}</text>

        <rect x="454" y="20" width="286" height="300" rx="10" class="diag-group" />
        <text x="597" y="44" text-anchor="middle" class="diag-group-title">{{ isEn ? 'Backend Services & Storage' : '后端服务与持久化存储' }}</text>

        <rect x="472" y="60" width="250" height="86" rx="7" class="diag-node diag-node-accent" />
        <text x="597" y="83" text-anchor="middle" class="diag-node-title">{{ isEn ? 'Chirp Go (app :18115/TCP)' : 'Chirp Go 服务（app :18115/TCP）' }}</text>
        <text x="597" y="102" text-anchor="middle" class="diag-node-sub">Passkey · /admin/ · /v1/ API · SSE</text>
        <text x="597" y="119" text-anchor="middle" class="diag-node-sub">{{ isEn ? 'Auth /authorization/v5/ · Group Hub' : '授权日志 /authorization/v5/ · 群组协调' }}</text>
        <text x="597" y="136" text-anchor="middle" class="diag-node-sub">{{ isEn ? 'Encrypted Attachments · Admissions' : '附件密文暂存 · 成员与入房管理' }}</text>

        <rect x="472" y="166" width="250" height="72" rx="7" class="diag-node" />
        <text x="597" y="189" text-anchor="middle" class="diag-node-title">{{ isEn ? 'LiveKit SFU (:7880/TCP)' : 'LiveKit SFU（livekit :7880/TCP）' }}</text>
        <text x="597" y="207" text-anchor="middle" class="diag-node-sub">{{ isEn ? 'WSS Signaling (/rtc) · 7882/UDP Media' : 'WebSocket 信令（/rtc）· 7882/UDP 媒体转发' }}</text>
        <text x="597" y="224" text-anchor="middle" class="diag-node-sub">{{ isEn ? 'TURN, TCP fallback & ext IP disabled' : '禁用 TURN / TCP 回退 / 公网 IP 探测' }}</text>

        <rect x="472" y="254" width="120" height="52" rx="6" class="diag-storage" />
        <text x="532" y="275" text-anchor="middle" class="diag-storage-title">chirp_data</text>
        <text x="532" y="293" text-anchor="middle" class="diag-node-sub">{{ isEn ? 'chirp.db · auth.db · files' : 'chirp.db · auth.db · 附件' }}</text>

        <rect x="602" y="254" width="120" height="52" rx="6" class="diag-storage" />
        <text x="662" y="275" text-anchor="middle" class="diag-storage-title">media-keys &amp; logs</text>
        <text x="662" y="293" text-anchor="middle" class="diag-node-sub">{{ isEn ? 'keys.json · 7d logs' : 'keys.json · 7 天日志' }}</text>

        <path d="M 170 105 L 250 105" class="diag-line-brand" marker-end="url(#arrow-brand)" />
        <text x="210" y="96" text-anchor="middle" class="diag-edge-label">443/TCP</text>

        <path d="M 170 180 L 220 180 L 220 120 L 250 120" class="diag-line-brand" marker-end="url(#arrow-brand)" />
        <text x="208" y="168" text-anchor="middle" class="diag-edge-label">HTTPS/WSS</text>

        <path d="M 386 100 L 470 100" class="diag-line-brand" marker-end="url(#arrow-brand)" />
        <text x="428" y="91" text-anchor="middle" class="diag-edge-label">{{ isEn ? 'except /rtc' : '除 /rtc 外' }}</text>

        <path d="M 386 122 L 428 122 L 428 188 L 470 188" class="diag-line-muted" marker-end="url(#arrow-muted)" />
        <text x="428" y="162" text-anchor="middle" class="diag-edge-label">/rtc/*</text>

        <path d="M 678 146 L 678 164" class="diag-line-muted" marker-end="url(#arrow-muted)" />
        <text x="706" y="159" text-anchor="middle" class="diag-edge-label">{{ isEn ? 'RPC' : '内网 RPC' }}</text>

        <path d="M 170 212 L 438 212 L 470 212" class="diag-line-brand diag-line-dashed" marker-end="url(#arrow-brand)" />
        <text x="319" y="229" text-anchor="middle" class="diag-edge-label-strong">
          {{ isEn ? '7882/UDP direct media (bypasses Nginx, E2EE encrypted frames)' : '7882/UDP 媒体直连（不经过 Nginx，端到端加密帧）' }}
        </text>

        <path d="M 532 146 L 532 252" class="diag-line-muted" />
        <path d="M 632 238 L 632 252" class="diag-line-muted" />
      </svg>
    </div>

    <figcaption class="diagram-caption">
      <template v-if="isEn">
        <span v-if="mode === 'builtin'">
          <strong>Bundled Nginx route:</strong> Compose runs <code>app</code>, <code>livekit</code>, and <code>nginx</code> (SWAG), automatically issuing and renewing TLS certificates via Certbot. Ports <code>18115</code> and <code>7880</code> communicate internally.
        </span>
        <span v-else>
          <strong>Existing Nginx route:</strong> Compose runs only <code>app</code> and <code>livekit</code>; your existing Nginx handles TLS and proxies traffic over loopback (<code>127.0.0.1</code>), private LAN, or a shared Docker network.
        </span>
      </template>
      <template v-else>
        <span v-if="mode === 'builtin'">
          <strong>内置 Nginx 路线：</strong>Compose 同时启动 <code>app</code>、<code>livekit</code> 与 <code>nginx</code>（SWAG），由内置 Certbot 自动申请并续期证书。<code>18115</code> 和 <code>7880</code> 仅在容器网络内部通信。
        </span>
        <span v-else>
          <strong>已有 Nginx 路线：</strong>Compose 只运行 <code>app</code> 与 <code>livekit</code>，原 Nginx 保留在宿主机或独立容器中，通过回环地址（<code>127.0.0.1</code>）、内网或共享 Docker 网络代理至后端。
        </span>
      </template>
    </figcaption>
  </figure>
</template>
