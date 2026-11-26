<script setup lang="ts">
import { computed } from 'vue'
import { AudioLines, Laptop, Network, Server, ShieldCheck, SquareTerminal, Wrench } from '@lucide/vue'
import { useData, withBase } from 'vitepress'

const { lang } = useData()
const isEn = computed(() => lang.value.startsWith('en'))

const entries = computed(() => {
  const prefix = isEn.value ? '/en' : ''
  return isEn.value
    ? [
        {
          href: `${prefix}/guide/first-call`,
          title: 'Member Guide',
          detail: 'Register a passkey, verify 3-group safety codes, tune audio, and start your first call',
          icon: AudioLines,
        },
        {
          href: `${prefix}/hosting/`,
          title: 'Self-Hosting & Operations',
          detail: 'Deploy with Docker Compose & HTTPS, manage members via Admin Console, backup & upgrade',
          icon: Server,
        },
        {
          href: `${prefix}/clients/shared-and-design`,
          title: 'Client Architecture & Design',
          detail: 'Deep dive into Apple, Android, Windows implementations, shared Rust core & design tokens',
          icon: Laptop,
        },
        {
          href: `${prefix}/reference/architecture`,
          title: 'Architecture & Protocols',
          detail: 'Illustrated breakdown of V5 E2EE, dual-slot smooth rotation, attachments & .chirpkey',
          icon: Network,
        },
        {
          href: `${prefix}/reference/security-audit`,
          title: 'Security Scan & E2EE Audit',
          detail: 'Source-based static analysis, 6-layer encryption chain review & residual risk boundaries',
          icon: ShieldCheck,
        },
        {
          href: `${prefix}/hosting/troubleshooting`,
          title: 'Troubleshooting & Error Codes',
          detail: 'Diagnose TLS, login, and UDP media issues, and search client error codes',
          icon: Wrench,
        },
        {
          href: `${prefix}/development/building`,
          title: 'Development & QA',
          detail: 'Build Go server & native clients, run protocol integration suites & QA checklists',
          icon: SquareTerminal,
        },
      ]
    : [
        {
          href: '/guide/first-call',
          title: '成员使用指南',
          detail: '注册通行密钥、完成安全码核验与音频调校，开启第一次通话',
          icon: AudioLines,
        },
        {
          href: '/hosting/',
          title: '部署与运维',
          detail: '选择 HTTPS 入口部署服务，使用管理台审批成员、维护与备份数据',
          icon: Server,
        },
        {
          href: '/clients/shared-and-design',
          title: '客户端架构与统一设计',
          detail: '深入 Apple、Android、Windows 实现细节、设计规范、共享内核与跨端联动',
          icon: Laptop,
        },
        {
          href: '/reference/architecture',
          title: '系统架构与协议',
          detail: '图文拆解 V5 端到端加密、双槽平滑换钥、附件与恢复文件规范',
          icon: Network,
        },
        {
          href: '/reference/security-audit',
          title: '安全扫描与加密链路评估',
          detail: '基于源码的静态安全检查、6 道 E2EE 防线审计与残余风险评估报告',
          icon: ShieldCheck,
        },
        {
          href: '/hosting/troubleshooting',
          title: '故障排查与错误码',
          detail: '按证书、登录、媒体连通性快速定位故障，检索客户端错误码',
          icon: Wrench,
        },
        {
          href: '/development/building',
          title: '参与开发与构建',
          detail: '构建 Go 服务端与四大原生客户端，运行协议回归与人工验收',
          icon: SquareTerminal,
        },
      ]
})
</script>

<template>
  <ul class="document-directory">
    <li v-for="entry in entries" :key="entry.href">
      <a :href="withBase(entry.href)">
        <component :is="entry.icon" :size="19" :stroke-width="1.65" aria-hidden="true" />
        <span class="entry-title">{{ entry.title }}</span>
        <span class="entry-detail">{{ entry.detail }}</span>
      </a>
    </li>
  </ul>
</template>
