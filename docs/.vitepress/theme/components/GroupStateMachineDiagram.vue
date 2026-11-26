<script setup lang="ts">
import { computed } from 'vue'
import { useData } from 'vitepress'

const { lang } = useData()
const isEn = computed(() => lang.value.startsWith('en'))
</script>

<template>
  <figure class="diagram-card" :aria-label="isEn ? 'OpenMLS Group Coordinator Four-Phase State Machine' : 'OpenMLS 群组协调四阶段状态机与安全暂停恢复机制'">
    <div class="diagram-header">
      <div class="diagram-title">{{ isEn ? 'Group Key Establishment State Machine & Verification Hold' : '群组配钥四阶段状态机与未互认锁死机制' }}</div>
    </div>

    <div class="diagram-body">
      <svg viewBox="0 0 760 250" class="topology-svg" role="img" :aria-label="isEn ? 'Group state machine' : '群组四阶段状态机'">
        <defs>
          <marker id="grp-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 1 L 8 5 L 0 9 z" fill="var(--vp-c-brand-1)" />
          </marker>
          <marker id="grp-warn" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 1 L 8 5 L 0 9 z" fill="#c94a4a" />
          </marker>
        </defs>

        <!-- Hold gate -->
        <rect x="20" y="22" width="720" height="44" rx="7" class="diag-warn-box" />
        <text x="380" y="41" text-anchor="middle" class="diag-node-title">
          {{ isEn ? 'Pre-Gate: Unverified Device Present → Control-Only Session (No Transition Timeout)' : '前置门控：房内存在未完成 SAS 互认的设备 → 维持「仅控制会话」（锁死内容，不触发 12s 超时）' }}
        </text>
        <text x="380" y="57" text-anchor="middle" class="diag-node-sub">
          {{ isEn ? 'Only after all peers mutually verify SAS & fresh snapshots do clients submit KeyPackages to start the 12s timer.' : '全员完成三组安全码比对后，各端才提交有效期 120s 的 KeyPackage，此时起算 12 秒配钥转换保护。' }}
        </text>

        <!-- 4 Phases -->
        <rect x="20" y="92" width="154" height="70" rx="8" class="diag-node" />
        <text x="97" y="116" text-anchor="middle" class="diag-node-title">1. collecting</text>
        <text x="97" y="134" text-anchor="middle" class="diag-node-sub">{{ isEn ? 'Collect signed bindings' : '收集入房绑定签名' }}</text>
        <text x="97" y="150" text-anchor="middle" class="diag-node-sub">{{ isEn ? '& 120s KeyPackages' : '与各端 KeyPackage' }}</text>

        <path d="M 174 127 L 204 127" class="diag-line-brand" marker-end="url(#grp-arrow)" />

        <rect x="206" y="92" width="154" height="70" rx="8" class="diag-node diag-node-accent" />
        <text x="283" y="116" text-anchor="middle" class="diag-node-title">2. welcoming</text>
        <text x="283" y="134" text-anchor="middle" class="diag-node-sub">{{ isEn ? 'Leader batches Add' : 'Leader 打包 Add' }}</text>
        <text x="283" y="150" text-anchor="middle" class="diag-node-sub">{{ isEn ? '& publishes Welcome' : '并广播加密 Welcome' }}</text>

        <path d="M 360 127 L 390 127" class="diag-line-brand" marker-end="url(#grp-arrow)" />

        <rect x="392" y="92" width="154" height="70" rx="8" class="diag-node diag-node-accent" />
        <text x="469" y="116" text-anchor="middle" class="diag-node-title">3. confirming</text>
        <text x="469" y="134" text-anchor="middle" class="diag-node-sub">{{ isEn ? 'Verify roster & install' : '校对全员名单与套件' }}</text>
        <text x="469" y="150" text-anchor="middle" class="diag-node-sub">{{ isEn ? '32B sender keys first' : '预装加密器后签确认值' }}</text>

        <path d="M 546 127 L 576 127" class="diag-line-brand" marker-end="url(#grp-arrow)" />

        <rect x="578" y="92" width="162" height="70" rx="8" class="diag-slot-1" />
        <text x="659" y="116" text-anchor="middle" class="diag-node-title">4. ready</text>
        <text x="659" y="134" text-anchor="middle" class="diag-node-sub">{{ isEn ? '3s media leases active' : '发放最长 3s 媒体许可' }}</text>
        <text x="659" y="150" text-anchor="middle" class="diag-node-sub">{{ isEn ? '2s heartbeat · 60s rotate' : '2s 心跳保活 · 60s 轮换' }}</text>

        <!-- Rebuild loop -->
        <path d="M 659 162 L 659 194 L 97 194 L 97 164" fill="none" stroke="#c94a4a" stroke-width="1.4" stroke-dasharray="5 3" marker-end="url(#grp-warn)" />
        <rect x="172" y="180" width="416" height="28" rx="5" class="diag-note-box" />
        <text x="380" y="198" text-anchor="middle" class="diag-time-warn">
          {{ isEn ? 'Peer join/leave · 6s heartbeat loss · 12s timeout → Retire keys & advance generation' : '成员增减 · 6s 心跳超时 · 12s 转换超时 → 立刻退役旧钥并推进 Generation 重建' }}
        </text>
      </svg>
    </div>
  </figure>
</template>
