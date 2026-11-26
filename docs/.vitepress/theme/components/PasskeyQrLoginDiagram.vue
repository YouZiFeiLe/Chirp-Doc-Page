<script setup lang="ts">
import { computed, ref } from 'vue'
import { useData } from 'vitepress'

const { lang } = useData()
const isEn = computed(() => lang.value.startsWith('en'))
const mode = ref<'browser' | 'qr'>('browser')
</script>

<template>
  <figure class="diagram-card" :aria-label="isEn ? 'Passkey and QR Login Flow' : 'Passkey 回调与手机扫码登录流程'">
    <div class="diagram-header">
      <div class="diagram-title">{{ isEn ? 'Native Client Authentication: Browser PKCE vs. Mobile QR' : '原生客户端认证双路径：浏览器回调 vs. 手机扫码' }}</div>
      <div class="diagram-tabs" role="tablist">
        <button type="button" role="tab" :aria-selected="mode === 'browser'" :class="['diagram-tab', { active: mode === 'browser' }]" @click="mode = 'browser'">
          {{ isEn ? 'Local Browser (PKCE)' : '本机浏览器回调（PKCE）' }}
        </button>
        <button type="button" role="tab" :aria-selected="mode === 'qr'" :class="['diagram-tab', { active: mode === 'qr' }]" @click="mode = 'qr'">
          {{ isEn ? 'Cross-Device QR (/device)' : '手机扫码批准（/device）' }}
        </button>
      </div>
    </div>

    <div class="diagram-body">
      <div v-if="mode === 'browser'" class="verify-grid">
        <div class="verify-step">
          <span class="verify-badge">1</span>
          <h4>{{ isEn ? 'S256 PKCE Challenge' : '生成 S256 PKCE 挑战' }}</h4>
          <p>{{ isEn ? 'Client generates code_verifier and state, opens system browser at passkey_origin.' : '客户端生成随机 code_verifier 与 state，拉起系统浏览器打开同源登录页。' }}</p>
        </div>
        <div class="verify-step">
          <span class="verify-badge">2</span>
          <h4>{{ isEn ? 'WebAuthn Verification' : 'Passkey 系统验证' }}</h4>
          <p>{{ isEn ? 'User authenticates via Face ID / Touch ID / Windows Hello; server issues a 1-min code.' : '用户完成指纹/面容确认，服务端校验后颁发 1 分钟一次性授权码。' }}</p>
        </div>
        <div class="verify-step">
          <span class="verify-badge">3</span>
          <h4>{{ isEn ? 'Platform Callback & Handoff' : '固定协议回调与轮询' }}</h4>
          <p>{{ isEn ? 'Redirects to cn.youzifeile.chirp*://auth/callback (Windows polls /windows-handoff up to 60s).' : '跳转回平台固定协议回调（Windows 额外提供 60s 指数退避确认兜底）。' }}</p>
        </div>
        <div class="verify-step">
          <span class="verify-badge">4</span>
          <h4>{{ isEn ? '5-Min Setup Auth → 20h Bearer' : '5 分钟设置授权 → 20h 登录' }}</h4>
          <p>{{ isEn ? 'Client exchanges code + verifier at /api/client/exchange, then proves device key possession.' : '客户端以 verifier 兑换 5 分钟设置授权，完成设备私钥挑战后拿到 20h Bearer。' }}</p>
        </div>
      </div>

      <div v-else class="verify-grid">
        <div class="verify-step">
          <span class="verify-badge">1</span>
          <h4>{{ isEn ? 'Start QR Request (3 Min)' : '发起扫码请求（3 分钟有效）' }}</h4>
          <p>{{ isEn ? 'Client calls POST /api/client/device/start with S256 PKCE and renders a QR code for /device.' : '客户端提交 PKCE 调用 /api/client/device/start，展示指向 /device 的二维码。' }}</p>
        </div>
        <div class="verify-step">
          <span class="verify-badge">2</span>
          <h4>{{ isEn ? 'Phone Approves via Passkey' : '手机扫描并确认 Passkey' }}</h4>
          <p>{{ isEn ? 'Phone holding the account Passkey opens /device and approves the single-use login request.' : '存有该账号 Passkey 的手机扫码打开 /device，通过系统验证批准本次登录。' }}</p>
        </div>
        <div class="verify-step">
          <span class="verify-badge">3</span>
          <h4>{{ isEn ? 'Client Polls with Verifier' : '发起端凭私有 Verifier 轮询' }}</h4>
          <p>{{ isEn ? 'Desktop/Android polls /api/client/device/poll; old session stays active during the 5-min setup.' : '发起端轮询领取 5 分钟设置授权；此时已登录的旧设备会话仍保持在线。' }}</p>
        </div>
        <div class="verify-step">
          <span class="verify-badge">4</span>
          <h4>{{ isEn ? 'Device Proof Replaces Session' : '设备激活成功后踢掉旧端' }}</h4>
          <p>{{ isEn ? 'Only after device certificate & challenge complete does the new login atomically replace the old one.' : '直到新设备完成证书校验与持钥证明，新会话才正式生效并替换旧设备。' }}</p>
        </div>
      </div>
    </div>
  </figure>
</template>
