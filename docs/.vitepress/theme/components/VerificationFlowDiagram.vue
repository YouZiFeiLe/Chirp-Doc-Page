<script setup lang="ts">
import { computed, ref } from 'vue'
import { useData } from 'vitepress'

const { lang } = useData()
const isEn = computed(() => lang.value.startsWith('en'))
const tab = ref<'room' | 'pairing'>('room')
</script>

<template>
  <figure class="diagram-card" :aria-label="isEn ? 'Mutual Verification & New Device Pairing Flow' : '安全码核验与新设备扫码配对流程图'">
    <div class="diagram-header">
      <div class="diagram-title">{{ isEn ? 'Two-Way Safety Verification Flows' : '双向安全核验流程' }}</div>
      <div class="diagram-tabs" role="tablist">
        <button type="button" role="tab" :aria-selected="tab === 'room'" :class="['diagram-tab', { active: tab === 'room' }]" @click="tab = 'room'">
          {{ isEn ? 'Room Peer Verification' : '房间内好友设备互认' }}
        </button>
        <button type="button" role="tab" :aria-selected="tab === 'pairing'" :class="['diagram-tab', { active: tab === 'pairing' }]" @click="tab = 'pairing'">
          {{ isEn ? 'Old-Device QR Pairing' : '旧设备扫码授权新设备' }}
        </button>
      </div>
    </div>

    <div class="diagram-body">
      <div v-if="tab === 'room'" class="verify-grid">
        <div class="verify-step">
          <span class="verify-badge">1</span>
          <h4>{{ isEn ? 'Join the Same Room' : '加入同一房间' }}</h4>
          <p>{{ isEn ? 'While unverified devices are present, voice, chat, and files remain locked; only public identities exchange.' : '若房内存在未互认设备，通话、聊天与附件暂时锁定，只交换公开身份信息。' }}</p>
        </div>
        <div class="verify-step">
          <span class="verify-badge">2</span>
          <h4>{{ isEn ? 'Initiate & Accept' : '发起并接受互认' }}</h4>
          <p>{{ isEn ? 'Tap your friend’s avatar to start; once accepted, both sides independently derive matching numbers via X25519/HKDF.' : '点击对方头像发起互认；对方接受后，双方各自通过 X25519/HKDF 独立算出一组数字。' }}</p>
        </div>
        <div class="verify-step">
          <span class="verify-badge">3</span>
          <h4>{{ isEn ? 'Compare Out-of-Band' : '线下/可信渠道核对' }}</h4>
          <p v-if="isEn">Compare <strong>all 3 groups of safety digits</strong> in person or via a previously trusted channel.</p>
          <p v-else>当面看屏幕或通过已验证的其他聊天软件，按顺序逐位核对<strong>全部 3 组安全码</strong>。</p>
        </div>
        <div class="verify-step">
          <span class="verify-badge">4</span>
          <h4>{{ isEn ? 'Confirm & Key Room' : '双端确认并建钥' }}</h4>
          <p>{{ isEn ? 'After both confirm and verify MACs, each saves device trust and OpenMLS keys the room for voice.' : '两边均确认一致并完成密钥确认后，各自保存设备信任，房间随即完成配钥并开放通话。' }}</p>
        </div>
      </div>

      <div v-else class="verify-grid">
        <div class="verify-step">
          <span class="verify-badge">1</span>
          <h4>{{ isEn ? 'New Device Generates QR' : '新设备生成请求码' }}</h4>
          <p>{{ isEn ? 'After Passkey sign-in, select existing-device approval to show a signed request QR (valid 5 min).' : '新设备用 Passkey 登录后，选择「使用已有设备授权」，生成带签名和承诺的二维码（5 分钟有效）。' }}</p>
        </div>
        <div class="verify-step">
          <span class="verify-badge">2</span>
          <h4>{{ isEn ? 'Old Device Scans or Imports' : '旧设备扫码或导图' }}</h4>
          <p>{{ isEn ? 'On the old device, open "Authorize New Device" and scan with the camera or import the exported PNG.' : '旧设备打开「授权新设备」，用摄像头扫描二维码，或直接导入新设备导出的 PNG 图片。' }}</p>
        </div>
        <div class="verify-step">
          <span class="verify-badge">3</span>
          <h4>{{ isEn ? 'Verify Codes & Unlock' : '比对安全码与鉴权' }}</h4>
          <p>{{ isEn ? 'Verify all 3 safety groups (image import requires typing the digits from the new device) and pass OS auth.' : '双方核对 3 组安全码（导图时需在旧设备手动输入新设备屏幕的数字），并通过系统指纹/面容确认。' }}</p>
        </div>
        <div class="verify-step">
          <span class="verify-badge">4</span>
          <h4>{{ isEn ? 'Issue Cert & Take Over' : '签发证书并接管' }}</h4>
          <p>{{ isEn ? 'Old device signs the new device cert; once the new device activates, the old session signs out.' : '旧设备签发新设备证书后，新设备完成登录激活；成功后旧设备会话自动退出。' }}</p>
        </div>
      </div>
    </div>
  </figure>
</template>
