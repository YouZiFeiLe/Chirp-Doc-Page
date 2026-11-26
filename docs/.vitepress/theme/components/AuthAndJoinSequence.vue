<script setup lang="ts">
import { computed, ref } from 'vue'
import { useData } from 'vitepress'
import { ChevronRight } from '@lucide/vue'

const { lang } = useData()
const isEn = computed(() => lang.value.startsWith('en'))

const stages = computed(() =>
  isEn.value
    ? [
        {
          step: '01',
          name: 'Discovery',
          actor: 'Client → app',
          route: 'GET /v1/client-config',
          credential: 'Platform, version & build headers',
          detail:
            'The client fetches passkey_origin, service endpoints, and platform version policies. Clients below the minimum version are blocked with an update prompt.',
        },
        {
          step: '02',
          name: 'Passkey Auth',
          actor: 'Browser / QR → app',
          route: '/register · / · /device → /api/client/exchange',
          credential: 'S256 PKCE · 1-min auth code → 5-min setup auth',
          detail:
            'New members register a 3–15 letter username and Passkey, then wait for approval. Approved members authenticate via Passkey or mobile QR and exchange for a 5-minute identity setup token.',
        },
        {
          step: '03',
          name: 'Device Binding',
          actor: 'Local Vault + app / Auth Service',
          route: '/api/client/identity/challenge · complete · pairing',
          credential: 'Ed25519 Root + Device Cert → 20h Bearer',
          detail:
            'First devices generate an Ed25519 root key and export .chirpkey; new devices import .chirpkey or pair via an existing device. After proving key possession, the server issues a 20h Bearer and replaces the old session.',
        },
        {
          step: '04',
          name: 'Preflight & Join',
          actor: 'Client → app → LiveKit',
          route: 'POST /v1/rooms/{room}/preflight → join',
          credential: '30s Proof → entry_id + 5-min LiveKit JWT',
          detail:
            'Clients verify any room password via preflight (30s proof, preserving active calls on wrong passwords) before calling join to obtain a unique member_id.login_id.entry_id and LiveKit JWT.',
        },
        {
          step: '05',
          name: 'SAS & MLS Keys',
          actor: 'Client ↔ Client (via Group Hub)',
          route: 'POST /v1/group/rooms/{room}/action · events',
          credential: '3 SAS codes → OpenMLS group keys → 3s media lease',
          detail:
            'Peers mutually compare 3 SAS code groups, then submit KeyPackages to establish an OpenMLS group and export 32-byte sender keys. Content opens only after obtaining a 3-second media lease.',
        },
      ]
    : [
        {
          step: '01',
          name: '服务发现',
          actor: '客户端 → app',
          route: 'GET /v1/client-config',
          credential: '无（附带平台、版本号、构建号请求头）',
          detail:
            '客户端请求配置发现接口，获取 passkey_origin、各服务端点以及当前平台的最低/最新版本策略。如果客户端版本低于最低要求，将被拦截并提示升级。',
        },
        {
          step: '02',
          name: 'Passkey 认证',
          actor: '浏览器 / 手机扫码 → app',
          route: '/register · / · /device → /api/client/exchange',
          credential: 'S256 PKCE 绑定 · 1 分钟一次性授权码 → 5 分钟设置授权',
          detail:
            '新成员先在浏览器登记用户名（3–15 位英文字母）与 Passkey，等待管理员批准。已获批成员通过系统 Passkey 登录或手机扫码批准，兑换出仅限 5 分钟的「身份设置授权」。',
        },
        {
          step: '03',
          name: '设备绑定',
          actor: '本机密钥库 + app / 授权服务',
          route: '/api/client/identity/challenge · complete · pairing',
          credential: 'Ed25519 账号根 + 设备证书 → 20 小时业务 Bearer',
          detail:
            '首次登录在本机生成账号根密钥，导出加密的 .chirpkey 后完成绑定；换机则导入 .chirpkey 或由旧设备扫码签发新设备证书。完成持钥证明后，服务端颁发 20 小时业务 Bearer 并替换旧设备会话。',
        },
        {
          step: '04',
          name: '预校验与入房',
          actor: '客户端 → app → LiveKit',
          route: 'POST /v1/rooms/{room}/preflight → join',
          credential: '30 秒入房 Proof → entry_id + 5 分钟 LiveKit JWT',
          detail:
            '客户端先做密码预校验，拿到与当前登录、房间和密码版本绑定的 Proof；随后正式入房，服务端生成唯一的 member_id.login_id.entry_id 标识和 LiveKit JWT（错密时原通话不受影响）。',
        },
        {
          step: '05',
          name: '互认与配钥',
          actor: '客户端 ↔ 客户端（经群组协调器转发）',
          route: 'POST /v1/group/rooms/{room}/action · events',
          credential: '3 组 SAS 安全码 → OpenMLS 群组密钥 → 3 秒媒体许可',
          detail:
            '入房后先核对房间内未互认设备的 3 组安全码，全部确认后各自提交 KeyPackage 完成 OpenMLS 建组并导出 32 字节发送者密钥。取得有效期 3 秒的媒体许可后，才开放语音、文字与附件。',
        },
      ],
)

const current = ref(0)
</script>

<template>
  <figure class="diagram-card" :aria-label="isEn ? 'Chirp 5-Step Security Flow' : 'Chirp 从服务发现到安全通话的全链路流程图'">
    <div class="diagram-header">
      <div class="diagram-title">{{ isEn ? 'From Discovery to Voice: Five-Stage Security Chain' : '从发现到通话：五步安全链路' }}</div>
    </div>

    <div class="stage-strip" role="tablist" :aria-label="isEn ? 'Select stage' : '选择链路阶段'">
      <template v-for="(stage, idx) in stages" :key="stage.step">
        <button type="button" role="tab" :aria-selected="current === idx" :class="['stage-pill', { active: current === idx }]" @click="current = idx">
          <span class="stage-num">{{ stage.step }}</span>
          <span class="stage-name">{{ stage.name }}</span>
        </button>
        <ChevronRight v-if="idx < stages.length - 1" class="stage-arrow" :size="14" aria-hidden="true" />
      </template>
    </div>

    <div class="stage-detail" role="tabpanel">
      <div class="stage-meta-grid">
        <div>
          <span class="meta-label">{{ isEn ? 'Participants' : '参与方' }}</span>
          <code>{{ stages[current].actor }}</code>
        </div>
        <div>
          <span class="meta-label">{{ isEn ? 'Key Endpoints' : '核心接口' }}</span>
          <code>{{ stages[current].route }}</code>
        </div>
        <div>
          <span class="meta-label">{{ isEn ? 'Credentials & TTL' : '关键凭据与时限' }}</span>
          <span class="meta-text">{{ stages[current].credential }}</span>
        </div>
      </div>
      <p class="stage-desc">{{ stages[current].detail }}</p>
    </div>
  </figure>
</template>
