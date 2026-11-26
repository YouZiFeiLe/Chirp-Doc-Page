<script setup lang="ts">
import { computed } from 'vue'
import { useData } from 'vitepress'

const { lang } = useData()
const isEn = computed(() => lang.value.startsWith('en'))
</script>

<template>
  <figure class="diagram-card" :aria-label="isEn ? '.chirpkey v1 Binary Layout' : '.chirpkey v1 离线身份恢复文件二进制结构图'">
    <div class="diagram-header">
      <div class="diagram-title">{{ isEn ? '.chirpkey v1 Binary Layout (Total Length: 71 to 65,606 Bytes)' : '.chirpkey v1 二进制文件布局（总长 71 至 65,606 字节）' }}</div>
    </div>

    <div class="diagram-body">
      <div class="binary-bar" role="img" :aria-label="isEn ? '54-byte header, N-byte ciphertext, 16-byte tag' : '54 字节文件头、N 字节密文与 16 字节认证标签分段'">
        <div class="bin-seg bin-header" style="flex: 5">
          <div class="bin-title">{{ isEn ? 'Header (54 Bytes)' : '文件头（Header · 54 字节）' }}</div>
          <div class="bin-sub">{{ isEn ? 'Big-endian unsigned · Used as AES-GCM AAD' : '大端无符号整数 · 作为 AES-GCM 的 AAD' }}</div>
          <div class="bin-fields">
            <span><code>0..8</code> CHIRPKEY</span>
            <span><code>8..10</code> Ver=1</span>
            <span><code>10..12</code> Suite=1</span>
            <span><code>12..22</code> Argon2id(64MiB, t=3, p=4)</span>
            <span><code>22..38</code> Salt(16B)</span>
            <span><code>38..50</code> Nonce(12B)</span>
            <span><code>50..54</code> N(4B)</span>
          </div>
        </div>
        <div class="bin-seg bin-cipher" style="flex: 3">
          <div class="bin-title">{{ isEn ? 'Ciphertext (N Bytes)' : '密文正文（N 字节）' }}</div>
          <div class="bin-sub">1 ≤ N ≤ 65536</div>
          <div class="bin-sub">{{ isEn ? 'AES-256-GCM encrypted 10-field UTF-8 JSON' : 'AES-256-GCM 加密的 10 字段 UTF-8 JSON' }}</div>
        </div>
        <div class="bin-seg bin-tag" style="flex: 2">
          <div class="bin-title">{{ isEn ? 'Auth Tag (16 Bytes)' : '认证标签（16 字节）' }}</div>
          <div class="bin-sub">offset: 54 + N</div>
          <div class="bin-sub">{{ isEn ? 'GCM Tag (EOF)' : 'GCM Tag（文件末尾）' }}</div>
        </div>
      </div>

      <div class="binary-flow">
        <span>{{ isEn ? 'Password (≥16 scalars) + Salt' : '用户密码（≥16 Unicode 标量） + Salt' }}</span>
        <span class="flow-op">→ Argon2id (0x13) →</span>
        <span>{{ isEn ? '32B Key + 54B Header (AAD) + 12B Nonce' : '32 字节密钥 + 54B Header (AAD) + 12B Nonce' }}</span>
        <span class="flow-op">→ AES-256-GCM →</span>
        <span>{{ isEn ? 'Ciphertext + 16B Tag' : '密文 + 16B Tag' }}</span>
      </div>
    </div>

    <figcaption class="diagram-caption">
      {{ isEn ? 'The entire 54-byte header is authenticated via AES-256-GCM AAD; modifying the version, KDF parameters, or length field invalidates the tag.' : '完整的 54 字节文件头都会纳入 AES-256-GCM 的附加认证数据（AAD），任何对版本、KDF 参数或长度字段的篡改都会导致认证标签校验直接失败。' }}
    </figcaption>
  </figure>
</template>
