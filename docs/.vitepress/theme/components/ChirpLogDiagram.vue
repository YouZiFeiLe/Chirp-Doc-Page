<script setup lang="ts">
import { computed } from 'vue'
import { useData } from 'vitepress'

const { lang } = useData()
const isEn = computed(() => lang.value.startsWith('en'))
</script>

<template>
  <figure class="diagram-card" :aria-label="isEn ? '.chirplog Hourly Sharding & 24h Export' : '.chirplog 客户端日志分片与 24 小时导出机制图'">
    <div class="diagram-header">
      <div class="diagram-title">{{ isEn ? '.chirplog UTC Hourly Shards & 24-Hour Single-File Export' : '.chirplog 按小时分片与 24 小时窗口导出' }}</div>
    </div>

    <div class="diagram-body">
      <svg viewBox="0 0 760 210" class="topology-svg" role="img" :aria-label="isEn ? 'Client log sharding and export' : '客户端诊断日志分片与导出'">
        <defs>
          <marker id="log-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 1 L 8 5 L 0 9 z" fill="var(--vp-c-brand-1)" />
          </marker>
        </defs>

        <rect x="20" y="34" width="150" height="84" rx="8" class="diag-node" />
        <text x="95" y="58" text-anchor="middle" class="diag-node-title">{{ isEn ? 'Redacted Events' : '应用内脱敏事件流' }}</text>
        <text x="95" y="77" text-anchor="middle" class="diag-node-sub">{{ isEn ? '12 fixed tables · allowlist' : '12 张固定表 · 白名单字段' }}</text>
        <text x="95" y="94" text-anchor="middle" class="diag-node-sub">{{ isEn ? 'No IDs, chat text, or keys' : '不含账号/聊天/密钥原文' }}</text>
        <text x="95" y="110" text-anchor="middle" class="diag-node-sub">{{ isEn ? 'Off by default · per install' : '默认关闭 · 随装开启保留' }}</text>

        <path d="M 170 76 L 204 76" class="diag-line-brand" marker-end="url(#log-arrow)" />

        <rect x="206" y="24" width="234" height="106" rx="8" class="diag-group" />
        <text x="323" y="45" text-anchor="middle" class="diag-group-title">{{ isEn ? 'UTC Hourly Shards (ClientLogs/)' : '按 UTC 小时分片（ClientLogs/）' }}</text>

        <rect x="220" y="58" width="64" height="58" rx="6" class="diag-warn-box" />
        <text x="252" y="80" text-anchor="middle" class="diag-node-title">H - 25</text>
        <text x="252" y="97" text-anchor="middle" class="diag-node-sub">{{ isEn ? 'Shard deleted' : '整片过期删除' }}</text>

        <rect x="292" y="58" width="66" height="58" rx="6" class="diag-slot-0" />
        <text x="325" y="80" text-anchor="middle" class="diag-node-title">H - 24</text>
        <text x="325" y="97" text-anchor="middle" class="diag-node-sub">{{ isEn ? 'Row-trimmed' : '按行截断清理' }}</text>

        <rect x="366" y="58" width="62" height="58" rx="6" class="diag-node diag-node-accent" />
        <text x="397" y="80" text-anchor="middle" class="diag-node-title">… H</text>
        <text x="397" y="97" text-anchor="middle" class="diag-node-sub">{{ isEn ? 'Batched tx' : '批量事务写入' }}</text>

        <path d="M 440 76 L 474 76" class="diag-line-brand" marker-end="url(#log-arrow)" />

        <rect x="476" y="34" width="264" height="84" rx="8" class="diag-slot-1" />
        <text x="608" y="58" text-anchor="middle" class="diag-node-title">{{ isEn ? 'Single-File Export (ATTACH)' : '导出单文件（ATTACH 合并）' }}</text>
        <text x="608" y="77" text-anchor="middle" class="diag-node-sub">{{ isEn ? 'Snapshot [now - 24h, now]' : '固定快照时刻，拷贝 [now - 24h, now]' }}</text>
        <text x="608" y="94" text-anchor="middle" class="diag-node-sub">{{ isEn ? 'Self-contained SQLite file' : '仅含单份 SQLite 主文件（无需 WAL/SHM）' }}</text>
        <text x="608" y="110" text-anchor="middle" class="diag-node-sub">{{ isEn ? 'Query via sqlite3 -readonly' : '可用 sqlite3 -readonly 直接查询分析' }}</text>

        <rect x="20" y="148" width="720" height="44" rx="6" class="diag-note-box" />
        <text x="380" y="168" text-anchor="middle" class="diag-node-sub">
          PRAGMA application_id = 0x43485250 ("CHRP") · PRAGMA user_version = 1
        </text>
        <text x="380" y="184" text-anchor="middle" class="diag-node-sub">
          {{ isEn ? 'Boundary pruning uses secure_delete=ON; identical schemas let one SQL query analyze exports from all four platforms.' : '边界小时删除使用 SQLite secure_delete=ON，跨端使用完全一致的表结构与事件枚举，同一条 SQL 可分析四端导出文件。' }}
        </text>
      </svg>
    </div>
  </figure>
</template>
