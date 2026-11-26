<script setup lang="ts">
import { computed } from 'vue'
import { useData } from 'vitepress'
import { Clock } from '@lucide/vue'

const { theme, page, lang } = useData()

const isEn = computed(() => lang.value.startsWith('en'))
const label = computed(
  () => theme.value.lastUpdated?.text || (isEn.value ? 'Last updated' : '最后更新于'),
)

const isoDatetime = computed(() =>
  page.value.lastUpdated ? new Date(page.value.lastUpdated).toISOString() : '',
)

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

const formattedDatetime = computed(() => {
  if (!page.value.lastUpdated) return ''
  const offsetMs = isEn.value ? 0 : 8 * 60 * 60 * 1000
  const shifted = new Date(page.value.lastUpdated + offsetMs)
  const y = shifted.getUTCFullYear()
  const m = pad(shifted.getUTCMonth() + 1)
  const d = pad(shifted.getUTCDate())
  const hh = pad(shifted.getUTCHours())
  const mm = pad(shifted.getUTCMinutes())
  const tz = isEn.value ? 'UTC' : 'UTC+8'
  return `${y}-${m}-${d} ${hh}:${mm} ${tz}`
})
</script>

<template>
  <p v-if="page.lastUpdated" class="doc-updated-meta">
    <Clock class="meta-icon" :size="14" aria-hidden="true" />
    <span>{{ label }}</span>
    <time :datetime="isoDatetime">{{ formattedDatetime }}</time>
  </p>
</template>
