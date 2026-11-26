<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useData } from 'vitepress'
import { Search } from '@lucide/vue'

const { lang } = useData()
const isEn = computed(() => lang.value.startsWith('en'))

const table = ref<HTMLElement>()
const query = ref('')
const total = ref(0)
const matches = ref(0)
let entries: { row: HTMLTableRowElement; text: string }[] = []

function filterRows() {
  const term = query.value.trim().toLowerCase()
  let count = 0
  for (const { row, text } of entries) {
    const visible = text.includes(term)
    row.hidden = !visible
    if (visible) count++
  }
  matches.value = count
}

onMounted(() => {
  const rows = table.value?.querySelectorAll<HTMLTableRowElement>('tbody tr') ?? []
  entries = Array.from(rows, (row) => ({ row, text: (row.textContent ?? '').toLowerCase() }))
  total.value = entries.length
  filterRows()
})
watch(query, filterRows)
</script>

<template>
  <div class="error-finder">
    <div class="filter-tools">
      <label class="filter-field">
        <Search aria-hidden="true" :size="17" />
        <span class="visually-hidden">{{ isEn ? 'Filter error code or message' : '筛选错误码或提示文字' }}</span>
        <input v-model="query" type="search" :placeholder="isEn ? 'Enter error code or keywords' : '输入错误码或提示文字'" />
      </label>
      <span v-if="total" role="status" class="filter-count">
        <template v-if="isEn">
          {{ query.trim() ? `${matches} / ${total} matched` : `${total} codes` }}
        </template>
        <template v-else>
          {{ query.trim() ? `匹配 ${matches} / ${total} 项` : `共 ${total} 项` }}
        </template>
      </span>
    </div>
    <p v-if="query.trim() && !matches" class="filter-empty">
      {{ isEn ? 'No matching error codes found. Try shorter keywords or paste the exact code.' : '没有匹配的错误码。可缩短关键词，或粘贴完整错误码。' }}
    </p>
    <div v-show="!query.trim() || matches > 0" ref="table" class="error-table"><slot /></div>
  </div>
</template>
