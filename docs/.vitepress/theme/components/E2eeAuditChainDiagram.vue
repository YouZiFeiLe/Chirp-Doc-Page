<script setup lang="ts">
import { computed } from 'vue'
import { useData } from 'vitepress'

const { lang } = useData()
const isEn = computed(() => lang.value.startsWith('en'))
</script>

<template>
  <figure class="diagram-card" :aria-label="isEn ? 'Chirp E2EE Security Boundary Overview' : 'Chirp 端到端加密链路防御边界评估全景图'">
    <div class="diagram-header">
      <div class="diagram-title">{{ isEn ? 'Six-Layer E2EE Verification & Threat Mitigation Overview' : 'E2EE 加密链路逐层验证与威胁阻断全景' }}</div>
    </div>

    <div class="diagram-body">
      <svg viewBox="0 0 760 280" class="topology-svg" role="img" :aria-label="isEn ? 'E2EE security chain' : 'Chirp 加密链路与防御点全景'">
        <rect x="18" y="24" width="228" height="106" rx="8" class="diag-node" />
        <text x="132" y="47" text-anchor="middle" class="diag-node-title">{{ isEn ? '1. Transport & Web Edge' : '第 1 道：传输与 Web 边界' }}</text>
        <text x="132" y="66" text-anchor="middle" class="diag-node-sub">{{ isEn ? '✓ Strict HTTPS/WSS (no redirects)' : '✓ 强制 HTTPS/WSS（禁重定向上下文）' }}</text>
        <text x="132" y="83" text-anchor="middle" class="diag-node-sub">{{ isEn ? '✓ HttpOnly + SameSite=Strict' : '✓ HttpOnly + SameSite=Strict Cookie' }}</text>
        <text x="132" y="100" text-anchor="middle" class="diag-node-sub">{{ isEn ? '✓ Strict CSP + CrossOrigin' : '✓ 严格 CSP + CrossOriginProtection' }}</text>
        <text x="132" y="117" text-anchor="middle" class="diag-node-sub">{{ isEn ? '✓ /twirp & /internal blocked' : '✓ 屏蔽公网 /twirp 与 /internal' }}</text>

        <rect x="266" y="24" width="228" height="106" rx="8" class="diag-node diag-node-accent" />
        <text x="380" y="47" text-anchor="middle" class="diag-node-title">{{ isEn ? '2. Auth & Device Chain' : '第 2 道：账号与设备授权链' }}</text>
        <text x="380" y="66" text-anchor="middle" class="diag-node-sub">{{ isEn ? '✓ WebAuthn + S256 PKCE' : '✓ WebAuthn + S256 PKCE 兑换' }}</text>
        <text x="380" y="83" text-anchor="middle" class="diag-node-sub">{{ isEn ? '✓ 8-level Ed25519 cert checks' : '✓ 客户端验证 8 层 Ed25519 证书链' }}</text>
        <text x="380" y="100" text-anchor="middle" class="diag-node-sub">{{ isEn ? '✓ 60s snapshot + sleep clock' : '✓ 60s 挑战签名快照 + 单调时钟截止' }}</text>
        <text x="380" y="117" text-anchor="middle" class="diag-node-sub">{{ isEn ? '✓ Checkpoint blocks rollback' : '✓ 本地检查点阻止历史回滚' }}</text>

        <rect x="514" y="24" width="228" height="106" rx="8" class="diag-node diag-node-accent" />
        <text x="628" y="47" text-anchor="middle" class="diag-node-title">{{ isEn ? '3. Peer Trust & Group' : '第 3 道：成员互认与建组' }}</text>
        <text x="628" y="66" text-anchor="middle" class="diag-node-sub">{{ isEn ? '✓ vodozemac 3-group SAS' : '✓ vodozemac SAS 三组安全码互认' }}</text>
        <text x="628" y="83" text-anchor="middle" class="diag-node-sub">{{ isEn ? '✓ 3-strike pairing cutoff' : '✓ 配对请求携带承诺 + 3 次错码熔断' }}</text>
        <text x="628" y="100" text-anchor="middle" class="diag-node-sub">{{ isEn ? '✓ Exact roster & authenticator' : '✓ 精确比对名单与 epoch authenticator' }}</text>
        <text x="628" y="117" text-anchor="middle" class="diag-node-sub">{{ isEn ? '✓ Unverified locks entire room' : '✓ 未互认即全房锁死内容传输' }}</text>

        <rect x="18" y="150" width="228" height="106" rx="8" class="diag-slot-1" />
        <text x="132" y="173" text-anchor="middle" class="diag-node-title">{{ isEn ? '4. Media & Chat Gating' : '第 4 道：实时媒体与聊天门控' }}</text>
        <text x="132" y="192" text-anchor="middle" class="diag-node-sub">{{ isEn ? '✓ 3s lease + 120s hard key cap' : '✓ 3s 短期媒体许可 + 120s 密钥硬上限' }}</text>
        <text x="132" y="209" text-anchor="middle" class="diag-node-sub">{{ isEn ? '✓ No SIF bypass / external ICE' : '✓ 禁用 SIF 明文绕过与外部 ICE' }}</text>
        <text x="132" y="226" text-anchor="middle" class="diag-node-sub">{{ isEn ? '✓ AES-GCM + 96b IV replay cap' : '✓ AES-GCM + 96位 IV 防重放（≤65536）' }}</text>
        <text x="132" y="243" text-anchor="middle" class="diag-node-sub">{{ isEn ? '✓ Blocks remote unmute' : '✓ 拦截远端信令强制开麦指令' }}</text>

        <rect x="266" y="150" width="228" height="106" rx="8" class="diag-node" />
        <text x="380" y="173" text-anchor="middle" class="diag-node-title">{{ isEn ? '5. Backup & Attachments' : '第 5 道：离线数据与附件密文' }}</text>
        <text x="380" y="192" text-anchor="middle" class="diag-node-sub">{{ isEn ? '✓ .chirpkey: Argon2id + GCM' : '✓ .chirpkey：Argon2id 64MiB + GCM' }}</text>
        <text x="380" y="209" text-anchor="middle" class="diag-node-sub">{{ isEn ? '✓ Random 32B per-file key' : '✓ 附件：每文件独立随机 32B 密钥' }}</text>
        <text x="380" y="226" text-anchor="middle" class="diag-node-sub">{{ isEn ? '✓ 256 KiB slice AAD binding' : '✓ 256 KiB 分片 AAD 绑定房间与序号' }}</text>
        <text x="380" y="243" text-anchor="middle" class="diag-node-sub">{{ isEn ? '✓ 64 KiB download auth check' : '✓ 下载每 64 KiB 重验入房与在线状态' }}</text>

        <rect x="514" y="150" width="228" height="106" rx="8" class="diag-storage" />
        <text x="628" y="173" text-anchor="middle" class="diag-node-title">{{ isEn ? '6. Endpoint & Host Hardening' : '第 6 道：端侧托管与主机隔离' }}</text>
        <text x="628" y="192" text-anchor="middle" class="diag-node-sub">{{ isEn ? '✓ Keychain / Keystore / DPAPI' : '✓ Keychain / Keystore / DPAPI 保护' }}</text>
        <text x="628" y="209" text-anchor="middle" class="diag-node-sub">{{ isEn ? '✓ scratch RO container + drop ALL' : '✓ scratch 只读容器 + cap_drop ALL' }}</text>
        <text x="628" y="226" text-anchor="middle" class="diag-node-sub">{{ isEn ? '✓ Immutable SQLite blacklist' : '✓ SQLite 不可删改黑名单触发器' }}</text>
        <text x="628" y="243" text-anchor="middle" class="diag-node-sub">{{ isEn ? '✓ .chirplog allowlist redaction' : '✓ 诊断日志 .chirplog 白名单脱敏' }}</text>
      </svg>
    </div>
  </figure>
</template>
