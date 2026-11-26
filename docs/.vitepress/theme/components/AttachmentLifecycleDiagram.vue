<script setup lang="ts">
import { computed } from 'vue'
import { useData } from 'vitepress'

const { lang } = useData()
const isEn = computed(() => lang.value.startsWith('en'))
</script>

<template>
  <figure class="diagram-card" :aria-label="isEn ? 'Attachment Lifecycle & Dual-Layer Chunking' : '附件状态流转与加密分块示意图'">
    <div class="diagram-header">
      <div class="diagram-title">{{ isEn ? 'Attachment Lifecycle State Machine & Dual-Layer Chunking' : '附件生命周期状态机与双层分块机制' }}</div>
    </div>

    <div class="diagram-body">
      <svg viewBox="0 0 760 320" class="topology-svg" role="img" :aria-label="isEn ? 'Attachment state machine and crypto chunks' : '附件状态机与加密分块'">
        <defs>
          <marker id="att-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 1 L 8 5 L 0 9 z" fill="var(--vp-c-brand-1)" />
          </marker>
          <marker id="att-arrow-muted" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 1 L 8 5 L 0 9 z" fill="var(--vp-c-text-2)" />
          </marker>
        </defs>

        <text x="24" y="28" class="diag-section-label">
          {{ isEn ? '1. Server Object State Machine (Upload ≤ 15m · Distribution ≤ 15m)' : '1. 服务端对象状态机（上传窗口 ≤ 15 分钟 · 分发窗口 ≤ 15 分钟）' }}
        </text>

        <rect x="24" y="48" width="110" height="44" rx="7" class="diag-node" />
        <text x="79" y="68" text-anchor="middle" class="diag-node-title">reserved</text>
        <text x="79" y="83" text-anchor="middle" class="diag-node-sub">{{ isEn ? 'Roster locked' : '已预留，锁定名单' }}</text>

        <path d="M 134 70 L 172 70" class="diag-line-brand" marker-end="url(#att-arrow)" />

        <rect x="174" y="48" width="116" height="44" rx="7" class="diag-node diag-node-accent" />
        <text x="232" y="68" text-anchor="middle" class="diag-node-title">uploading</text>
        <text x="232" y="83" text-anchor="middle" class="diag-node-sub">{{ isEn ? '1 MiB chunks' : '按序上传 1 MiB 块' }}</text>

        <path d="M 232 92 L 232 118" class="diag-line-muted" marker-end="url(#att-arrow-muted)" />
        <rect x="174" y="120" width="116" height="42" rx="7" class="diag-storage" />
        <text x="232" y="139" text-anchor="middle" class="diag-node-title">paused</text>
        <text x="232" y="153" text-anchor="middle" class="diag-node-sub">{{ isEn ? 'Manual or 30s idle' : '手动暂停或 30s 无传' }}</text>

        <path d="M 290 70 L 340 70" class="diag-line-brand" marker-end="url(#att-arrow)" />

        <rect x="342" y="48" width="128" height="44" rx="7" class="diag-node diag-node-accent" />
        <text x="406" y="68" text-anchor="middle" class="diag-node-title">completed</text>
        <text x="406" y="83" text-anchor="middle" class="diag-node-sub">{{ isEn ? 'Verified, ready' : '校验通过，开放下载' }}</text>

        <path d="M 470 70 L 520 70" class="diag-line-brand" marker-end="url(#att-arrow)" />

        <rect x="522" y="48" width="184" height="44" rx="7" class="diag-slot-1" />
        <text x="614" y="68" text-anchor="middle" class="diag-node-title">{{ isEn ? 'delivered (Terminal)' : 'delivered（终态）' }}</text>
        <text x="614" y="83" text-anchor="middle" class="diag-node-sub">{{ isEn ? 'All done, ciphertext deleted' : '全员确认或退出，立即删密文' }}</text>

        <rect x="342" y="120" width="166" height="42" rx="7" class="diag-warn-box" />
        <text x="425" y="139" text-anchor="middle" class="diag-node-title">cancelled / expired</text>
        <text x="425" y="153" text-anchor="middle" class="diag-node-sub">{{ isEn ? 'Cancelled, left, or timed out' : '取消、发送者离房或超时回收' }}</text>

        <path d="M 290 141 L 340 141" class="diag-line-muted" marker-end="url(#att-arrow-muted)" />
        <path d="M 406 92 L 406 118" class="diag-line-muted" marker-end="url(#att-arrow-muted)" />

        <line x1="20" y1="184" x2="740" y2="184" stroke="var(--vp-c-divider)" stroke-dasharray="4 4" />

        <text x="24" y="208" class="diag-section-label">
          {{ isEn ? '2. Encryption Layer vs. Transport Layer (Server Never Sees File Keys or Names)' : '2. 加密层与传输层分离（服务端只见密文，不接触文件密钥与原文件名）' }}
        </text>

        <rect x="24" y="224" width="144" height="72" rx="7" class="diag-node" />
        <text x="96" y="248" text-anchor="middle" class="diag-node-title">{{ isEn ? 'Raw File (≤100 MiB)' : '原始文件（≤100 MiB）' }}</text>
        <text x="96" y="266" text-anchor="middle" class="diag-node-sub">{{ isEn ? '256 KiB plaintext slice' : '按 256 KiB 明文切片' }}</text>
        <text x="96" y="282" text-anchor="middle" class="diag-node-sub">{{ isEn ? 'Random 32B file key' : '随机 32B 独立文件密钥' }}</text>

        <path d="M 168 260 L 198 260" class="diag-line-brand" marker-end="url(#att-arrow)" />

        <rect x="200" y="224" width="194" height="72" rx="7" class="diag-node diag-node-accent" />
        <text x="297" y="246" text-anchor="middle" class="diag-node-title">{{ isEn ? 'AES-256-GCM Records' : 'AES-256-GCM 密文记录' }}</text>
        <text x="297" y="264" text-anchor="middle" class="diag-node-sub">{{ isEn ? '[Rec 0: ≤256KiB+16B Tag]…' : '[记录0: ≤256KiB+16B Tag] [记录1]…' }}</text>
        <text x="297" y="281" text-anchor="middle" class="diag-node-sub">{{ isEn ? 'AAD binds room, sender, index' : 'AAD 绑定房间、发送者、序号与总长' }}</text>

        <path d="M 394 260 L 424 260" class="diag-line-brand" marker-end="url(#att-arrow)" />

        <rect x="426" y="224" width="150" height="72" rx="7" class="diag-node" />
        <text x="501" y="246" text-anchor="middle" class="diag-node-title">{{ isEn ? '1 MiB HTTPS Chunks' : '1 MiB HTTPS 分块' }}</text>
        <text x="501" y="264" text-anchor="middle" class="diag-node-sub">{{ isEn ? 'Sequential PUT / resume' : '顺序 PUT / 断点续传' }}</text>
        <text x="501" y="281" text-anchor="middle" class="diag-node-sub">{{ isEn ? 'Auth check every 64 KiB' : '下载每 64 KiB 重查资格' }}</text>

        <path d="M 576 260 L 606 260" class="diag-line-brand" marker-end="url(#att-arrow)" />

        <rect x="608" y="224" width="132" height="72" rx="7" class="diag-slot-1" />
        <text x="674" y="246" text-anchor="middle" class="diag-node-title">{{ isEn ? 'Verified Disk Write' : '接收端落盘校验' }}</text>
        <text x="674" y="264" text-anchor="middle" class="diag-node-sub">{{ isEn ? 'Verify SHA-256 & GCM' : '核对 SHA-256 与标签' }}</text>
        <text x="674" y="281" text-anchor="middle" class="diag-node-sub">{{ isEn ? 'Then POST received' : '成功后才发送 received' }}</text>
      </svg>
    </div>

    <figcaption class="diagram-caption">
      <template v-if="isEn">
        File keys travel solely inside encrypted chat descriptors to online recipients. Disconnecting from the attachment SSE for over 6 seconds marks pending deliveries permanently as <code>skipped</code>.
      </template>
      <template v-else>
        文件密钥仅随加密聊天描述发往在线原接收者；下载时若接收者离房或 SSE 断线超过 6 秒宽限，其状态将永久变为 <code>skipped</code>。
      </template>
    </figcaption>
  </figure>
</template>
