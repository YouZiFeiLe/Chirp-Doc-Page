<script setup lang="ts">
import { computed, ref } from 'vue'
import { useData } from 'vitepress'
import { ChevronRight } from '@lucide/vue'

const { lang } = useData()
const isEn = computed(() => lang.value.startsWith('en'))

const flows = computed(() =>
  isEn.value
    ? [
        {
          name: 'Sign-In & Room Entry',
          stops: ['Browser / Client', 'Nginx', 'Chirp Go Service', 'SQLite'],
          detail:
            'HTTPS requests pass through the reverse proxy. The Go service verifies account and device eligibility, reading and writing member and room admission records.',
        },
        {
          name: 'Real-Time Voice',
          stops: ['Sender', 'LiveKit SFU', 'Receiver'],
          detail:
            'Signaling travels over Nginx (/rtc), while encrypted Opus media frames travel directly over UDP 7882 to LiveKit and decrypt only on verified recipient devices.',
        },
        {
          name: 'File Transfer',
          stops: ['Sender', 'Nginx', 'Chirp Service', 'Temp Ciphertext'],
          detail:
            'Files are encrypted and chunked on the sender device. The server tracks delivery state for online recipients, who fetch ciphertext over HTTPS and decrypt locally.',
        },
      ]
    : [
        {
          name: '登录与入房',
          stops: ['浏览器或客户端', 'Nginx', 'Chirp 服务', 'SQLite'],
          detail: 'HTTPS 请求经过反向代理。Go 服务核对账号和设备资格，读写成员与房间记录。',
        },
        {
          name: '实时语音',
          stops: ['发送端', 'LiveKit SFU', '接收端'],
          detail:
            '信令经过 Nginx 的 /rtc 路径。媒体经 UDP 7882 直达 LiveKit，转发到已加入房间的设备，由接收端解密。',
        },
        {
          name: '文件传输',
          stops: ['发送端', 'Nginx', 'Chirp 服务', '临时密文文件'],
          detail:
            '客户端加密并分块上传。服务端记录在线接收者的投递状态，符合资格的设备通过 HTTPS 获取密文并在本机解密。',
        },
      ],
)

const selected = ref(0)
</script>

<template>
  <figure class="architecture-map">
    <fieldset class="flow-controls">
      <legend class="visually-hidden">{{ isEn ? 'Select data flow to inspect' : '选择要查看的数据流' }}</legend>
      <label v-for="(flow, index) in flows" :key="flow.name">
        <input v-model="selected" type="radio" name="chirp-data-flow" :value="index" />
        <span>{{ flow.name }}</span>
      </label>
    </fieldset>
    <div class="flow-body" aria-live="polite">
      <ol class="flow-stops">
        <li v-for="(stop, index) in flows[selected].stops" :key="stop">
          <ChevronRight v-if="index" aria-hidden="true" :size="15" />
          <span>{{ stop }}</span>
        </li>
      </ol>
      <p>{{ flows[selected].detail }}</p>
    </div>
  </figure>
</template>
