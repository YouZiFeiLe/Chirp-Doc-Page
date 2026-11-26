<script setup lang="ts">
import { computed } from 'vue'
import { useData } from 'vitepress'

const { lang } = useData()
const isEn = computed(() => lang.value.startsWith('en'))
</script>

<template>
  <figure class="diagram-card" :aria-label="isEn ? 'Ed25519 Certificate Chain & Independent Revocation' : 'Ed25519 设备证书链与独立撤销机制'">
    <div class="diagram-header">
      <div class="diagram-title">{{ isEn ? 'Device Certificate Chain (≤ 8 Levels) & Revocation Isolation' : '设备证书链（≤ 8 层）与独立撤销 / 8192 事件槽位保留' }}</div>
    </div>

    <div class="diagram-body">
      <svg viewBox="0 0 760 286" class="topology-svg" role="img" :aria-label="isEn ? 'Certificate chain and revocation logic' : '设备证书链与独立撤销图示'">
        <!-- Account Root -->
        <rect x="20" y="24" width="160" height="78" rx="8" class="diag-node diag-node-accent" />
        <text x="100" y="48" text-anchor="middle" class="diag-node-title">{{ isEn ? 'Account Ed25519 Root' : '账号 Ed25519 根身份' }}</text>
        <text x="100" y="67" text-anchor="middle" class="diag-node-sub">{{ isEn ? 'Stored in .chirpkey only' : '仅存于 .chirpkey 备份' }}</text>
        <text x="100" y="84" text-anchor="middle" class="diag-node-sub">{{ isEn ? 'Signs Device #1 (≤ 5 yrs)' : '签发首台设备（≤ 5 年）' }}</text>

        <path d="M 180 63 L 214 63" class="diag-line-brand" />

        <!-- Device 1 (Revoked ancestor) -->
        <rect x="214" y="24" width="164" height="78" rx="8" class="diag-warn-box" />
        <text x="296" y="48" text-anchor="middle" class="diag-node-title">{{ isEn ? 'Device #1 (Revoked Later)' : '设备 A（随后被撤销）' }}</text>
        <text x="296" y="67" text-anchor="middle" class="diag-node-sub">{{ isEn ? 'CanEnroll = true (Depth 1)' : 'CanEnroll = true（第 1 层）' }}</text>
        <text x="296" y="84" text-anchor="middle" class="diag-time-warn">{{ isEn ? 'Cannot enroll new devices' : '永久墓碑 · 禁止再签新设备' }}</text>

        <path d="M 378 63 L 412 63" class="diag-line-brand" />

        <!-- Device 2 (Child enrolled before revocation) -->
        <rect x="412" y="24" width="164" height="78" rx="8" class="diag-slot-1" />
        <text x="494" y="48" text-anchor="middle" class="diag-node-title">{{ isEn ? 'Device #2 (Still Valid!)' : '设备 B（继续有效！）' }}</text>
        <text x="494" y="67" text-anchor="middle" class="diag-node-sub">{{ isEn ? 'Enrolled before A revoked' : '在 A 被撤销前合法签出' }}</text>
        <text x="494" y="84" text-anchor="middle" class="diag-node-sub">{{ isEn ? 'Independent revocation state' : '每台设备独立检查撤销' }}</text>

        <path d="M 576 63 L 610 63" class="diag-line-muted" />

        <!-- Depth limit -->
        <rect x="610" y="24" width="130" height="78" rx="8" class="diag-storage" />
        <text x="675" y="48" text-anchor="middle" class="diag-node-title">{{ isEn ? 'Up to 8 Levels' : '最多嵌套 8 层' }}</text>
        <text x="675" y="67" text-anchor="middle" class="diag-node-sub">{{ isEn ? 'Max 128 devices/acct' : '单账号最多 128 台设备' }}</text>
        <text x="675" y="84" text-anchor="middle" class="diag-node-sub">{{ isEn ? 'Last device = Ban' : '撤最后设备 = 永久封号' }}</text>

        <!-- Divider -->
        <line x1="20" y1="126" x2="740" y2="126" stroke="var(--vp-c-divider)" stroke-dasharray="4 4" />

        <!-- Authorization Log 8192 Capacity Reservation -->
        <text x="24" y="152" class="diag-section-label">
          {{ isEn ? 'Authorization Log Capacity Reservation (authorization.db · CAS Version Chain)' : '授权日志容量预留设计（authorization.db · CAS 严格递增版本链，总上限 8192 条）' }}
        </text>

        <rect x="20" y="170" width="356" height="58" rx="7" class="diag-node" />
        <text x="198" y="194" text-anchor="middle" class="diag-node-title">{{ isEn ? 'Versions 1 – 4096: Enrollments & Social Events' : '版本 1 – 4096：设备登记与社交事件区' }}</text>
        <text x="198" y="213" text-anchor="middle" class="diag-node-sub">{{ isEn ? 'Normal device additions and friend/trust updates capped here' : '普通登记与好友/信任操作最多只能占用前 4096 个版本' }}</text>

        <rect x="384" y="170" width="356" height="58" rx="7" class="diag-badge-box" />
        <text x="562" y="194" text-anchor="middle" class="diag-badge-title">{{ isEn ? 'Versions 4097 – 8192: Reserved Strictly for Revocations' : '版本 4097 – 8192：强制保留给撤销操作' }}</text>
        <text x="562" y="213" text-anchor="middle" class="diag-node-sub">{{ isEn ? 'Guarantees an account can never be locked out of revoking devices' : '即使正常事件刷满配额，账号依然永远拥有撤销失窃设备的能力' }}</text>

        <rect x="20" y="242" width="720" height="32" rx="6" class="diag-note-box" />
        <text x="380" y="262" text-anchor="middle" class="diag-node-sub">
          {{ isEn ? 'SQLite triggers prevent DELETE/UPDATE on identity_blacklist; clients reject any snapshot rolling back their local checkpoint.' : 'SQLite 触发器禁止删除或修改 identity_blacklist；客户端本地持久化检查点，拒绝任何版本倒退的快照响应。' }}
        </text>
      </svg>
    </div>
  </figure>
</template>
