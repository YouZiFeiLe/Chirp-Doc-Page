<script setup lang="ts">
import { computed } from 'vue'
import { useData, withBase } from 'vitepress'
import { ChevronDown } from '@lucide/vue'
import existing from '../../snippets/existing-nginx.env?raw'
import http from '../../snippets/http-01.env?raw'
import dns from '../../snippets/dns-01.env?raw'

const { lang } = useData()
const isEn = computed(() => lang.value.startsWith('en'))

const routes = computed(() => {
  const prefix = isEn.value ? '/en/hosting/' : '/hosting/'
  return isEn.value
    ? [
        {
          slug: 'existing-nginx',
          path: `${prefix}existing-nginx`,
          name: 'Use Existing Nginx & Certificates',
          when: 'Your domain already has a working HTTPS virtual host managed by your existing Nginx.',
          ports: '443/TCP to existing Nginx, 7882/UDP to the Chirp media host. Renewal remains unchanged.',
          env: existing,
        },
        {
          slug: 'http-01',
          path: `${prefix}http-01`,
          name: 'Bundled Nginx · HTTP-01',
          when: 'Your domain points directly to this server and public port 80/TCP is available.',
          ports: '80/TCP for ACME issuance/renewal, 443/TCP for HTTPS, 7882/UDP for voice media.',
          env: http,
        },
        {
          slug: 'dns-01',
          path: `${prefix}dns-01`,
          name: 'Bundled Nginx · DNS-01',
          when: 'Your DNS provider supports API TXT updates (ideal when port 80 cannot be exposed).',
          ports: 'Public 443/TCP and 7882/UDP only. DNS plugin credentials stay on the server.',
          env: dns,
        },
      ]
    : [
        {
          slug: 'existing-nginx',
          path: `${prefix}existing-nginx`,
          name: '使用已有 Nginx 和证书',
          when: '域名已有可用的 HTTPS 站点，由原来的 Nginx 负责续期。',
          ports: '443/TCP 到原 Nginx，7882/UDP 到 Chirp 服务器。证书续期沿用现有端口设置。',
          env: existing,
        },
        {
          slug: 'http-01',
          path: `${prefix}http-01`,
          name: '内置 Nginx · HTTP-01',
          when: '域名直接指向这台服务器，可以开放公网 80 端口。',
          ports: '80/TCP 用于签发和续期，443/TCP 用于 HTTPS，7882/UDP 用于语音。',
          env: http,
        },
        {
          slug: 'dns-01',
          path: `${prefix}dns-01`,
          name: '内置 Nginx · DNS-01',
          when: 'DNS 服务商可以通过 API 写入验证记录，证书通过 DNS 签发。',
          ports: '公网开放 443/TCP 和 7882/UDP。DNS 插件的凭据保存在服务器上。',
          env: dns,
        },
      ]
})
</script>

<template>
  <div class="deployment-picker">
    <details v-for="route in routes" :key="route.slug" name="https-entry">
      <summary>
        <span>{{ route.name }}</span>
        <ChevronDown aria-hidden="true" :size="16" />
      </summary>
      <div class="method-body">
        <p>{{ route.when }}</p>
        <p><strong>{{ isEn ? 'Inbound Ports' : '入站端口' }}</strong>　{{ route.ports }}</p>
        <div class="language-dotenv vp-adaptive-theme">
          <button
            type="button"
            :title="isEn ? 'Copy .env example' : '复制环境变量示例'"
            :aria-label="isEn ? 'Copy .env example' : '复制环境变量示例'"
            class="copy"
          ></button>
          <span class="lang">.env</span>
          <pre><code>{{ route.env.trimEnd() }}</code></pre>
        </div>
        <a :href="withBase(route.path)">
          {{ isEn ? `Open "${route.name}" Setup Guide` : `打开「${route.name}」配置步骤` }}
        </a>
      </div>
    </details>
  </div>
</template>
