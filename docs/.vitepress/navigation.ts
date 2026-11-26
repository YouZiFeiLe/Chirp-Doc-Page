import type { DefaultTheme } from 'vitepress'

export const zhSidebar: DefaultTheme.SidebarItem[] = [
  { text: '文档首页', link: '/' },
  {
    text: '成员指南',
    collapsed: false,
    items: [
      { text: '第一次通话', link: '/guide/first-call' },
      { text: '客户端安装', link: '/guide/clients' },
      { text: '设备与恢复', link: '/guide/devices' },
      { text: '聊天与文件', link: '/guide/chat' },
      { text: '音频与个人资料', link: '/guide/audio-and-profile' },
    ],
  },
  {
    text: '部署与运维',
    collapsed: false,
    items: [
      { text: '从零部署', link: '/hosting/' },
      { text: '已有 Nginx 和证书', link: '/hosting/existing-nginx' },
      { text: '内置 Nginx · HTTP-01', link: '/hosting/http-01' },
      { text: '内置 Nginx · DNS-01', link: '/hosting/dns-01' },
      { text: '验收与首位管理员', link: '/hosting/verification' },
      { text: '管理台与管理员指南', link: '/hosting/admin-console' },
      { text: '升级与备份', link: '/hosting/maintenance' },
      { text: '配置与运维参考', link: '/hosting/operations' },
      { text: '故障排查', link: '/hosting/troubleshooting' },
    ],
  },
  {
    text: '客户端实现与设计',
    collapsed: false,
    items: [
      { text: '统一设计与跨端共享', link: '/clients/shared-and-design' },
      { text: 'Apple（macOS / iOS）', link: '/clients/apple' },
      { text: 'Android 客户端', link: '/clients/android' },
      { text: 'Windows 客户端', link: '/clients/windows' },
    ],
  },
  {
    text: '架构、协议与安全',
    collapsed: true,
    items: [
      { text: '系统架构', link: '/reference/architecture' },
      { text: '加密与安全边界', link: '/reference/security' },
      { text: '安全扫描与加密链路评估', link: '/reference/security-audit' },
      { text: '端到端加密协议', link: '/reference/e2ee-v5' },
      { text: '授权签名密钥', link: '/reference/authorization-keys' },
      { text: '附件传输', link: '/reference/attachments' },
      { text: '身份恢复文件', link: '/reference/chirpkey' },
      { text: '客户端日志格式', link: '/reference/chirplog' },
      { text: '客户端错误码', link: '/reference/error-codes' },
    ],
  },
  {
    text: '参与开发',
    collapsed: true,
    items: [
      { text: '本地构建与服务端开发', link: '/development/building' },
      { text: '各平台客户端构建', link: '/development/clients' },
      { text: '人工测试与验收', link: '/development/testing' },
    ],
  },
]

export const enSidebar: DefaultTheme.SidebarItem[] = [
  { text: 'Overview', link: '/en/' },
  {
    text: 'Member Guide',
    collapsed: false,
    items: [
      { text: 'First Call', link: '/en/guide/first-call' },
      { text: 'Installing Clients', link: '/en/guide/clients' },
      { text: 'Devices & Recovery', link: '/en/guide/devices' },
      { text: 'Chat & Files', link: '/en/guide/chat' },
      { text: 'Audio & Profile', link: '/en/guide/audio-and-profile' },
    ],
  },
  {
    text: 'Self-Hosting & Ops',
    collapsed: false,
    items: [
      { text: 'Getting Started', link: '/en/hosting/' },
      { text: 'Existing Nginx & Certs', link: '/en/hosting/existing-nginx' },
      { text: 'Bundled Nginx · HTTP-01', link: '/en/hosting/http-01' },
      { text: 'Bundled Nginx · DNS-01', link: '/en/hosting/dns-01' },
      { text: 'Verification & First Admin', link: '/en/hosting/verification' },
      { text: 'Admin Console Guide', link: '/en/hosting/admin-console' },
      { text: 'Upgrades & Backups', link: '/en/hosting/maintenance' },
      { text: 'Configuration Reference', link: '/en/hosting/operations' },
      { text: 'Troubleshooting', link: '/en/hosting/troubleshooting' },
    ],
  },
  {
    text: 'Client Architecture',
    collapsed: false,
    items: [
      { text: 'Unified Design & Shared Core', link: '/en/clients/shared-and-design' },
      { text: 'Apple (macOS / iOS)', link: '/en/clients/apple' },
      { text: 'Android Client', link: '/en/clients/android' },
      { text: 'Windows Client', link: '/en/clients/windows' },
    ],
  },
  {
    text: 'Architecture & Security',
    collapsed: true,
    items: [
      { text: 'System Architecture', link: '/en/reference/architecture' },
      { text: 'Encryption & Boundaries', link: '/en/reference/security' },
      { text: 'Security Audit & E2EE Review', link: '/en/reference/security-audit' },
      { text: 'V5 E2EE Protocol', link: '/en/reference/e2ee-v5' },
      { text: 'Authorization Signing Keys', link: '/en/reference/authorization-keys' },
      { text: 'Attachment Transport', link: '/en/reference/attachments' },
      { text: '.chirpkey Recovery Format', link: '/en/reference/chirpkey' },
      { text: 'Client Log Format', link: '/en/reference/chirplog' },
      { text: 'Client Error Codes', link: '/en/reference/error-codes' },
    ],
  },
  {
    text: 'Development',
    collapsed: true,
    items: [
      { text: 'Server Build & Testing', link: '/en/development/building' },
      { text: 'Native Client Builds', link: '/en/development/clients' },
      { text: 'Manual QA Checklist', link: '/en/development/testing' },
    ],
  },
]
