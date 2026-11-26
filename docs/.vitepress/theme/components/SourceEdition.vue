<script setup lang="ts">
import { computed } from 'vue'
import { useData } from 'vitepress'
import upstream from '../../../../upstream.json'

const { lang } = useData()
const isEn = computed(() => lang.value.startsWith('en'))
const snapshot = `https://github.com/${upstream.repository}/commit/${upstream.revision}`
</script>

<template>
  <p class="source-edition">
    <template v-if="isEn">
      Verified against <a :href="snapshot">Chirp source snapshot</a>
    </template>
    <template v-else>
      依据 <a :href="snapshot">Chirp 源码快照</a>
    </template>
    <span aria-hidden="true">·</span>
    <time :datetime="upstream.date">{{ upstream.date }}</time>
  </p>
</template>
