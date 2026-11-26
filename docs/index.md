---
title: Chirp 知识库
titleTemplate: false
aside: false
prev: false
next: false
pageClass: docs-overview
---

<script setup>
import { Info } from '@lucide/vue'
import SourceEdition from './.vitepress/theme/components/SourceEdition.vue'
import DocumentDirectory from './.vitepress/theme/components/DocumentDirectory.vue'
</script>

# Chirp 知识库

<SourceEdition />

<div class="reader-note" role="note">
<Info class="note-icon" :size="17" aria-hidden="true" />

> **合规与法律声明**
>
> 本项目以技术分享为目的，作者不运营任何公开通信服务、不提供持续技术支持、不获取收入或对价。使用本项目前，请阅读 [`COMPLIANCE.md`](https://github.com/YouZiFeiLe/Chirp/blob/main/COMPLIANCE.md)，其中包含项目定位、密码学出口管制、GDPR 对接说明及中国法下的使用边界。使用、复制、分发或部署本项目，即表示你已阅读并理解该文件全部内容。

**只是来和朋友语音？** 拿到管理员给的服务器 HTTPS 地址和安装包后，直接看[第一次通话](/guide/first-call)即可完成注册、登录和设备核验。**打算自己搭一台？** 从[从零部署](/hosting/)开始，一条 Compose 命令即可拉起整套服务。

</div>

Chirp 是一套专为朋友与小团队设计的**自托管端到端加密（E2EE）语音房间**。无论你使用的是 macOS、iOS、Android 还是 Windows，都可以加入同一个房间，一起低延迟语音通话、发送临时文字消息或安全传输文件。

与传统语音软件不同，Chirp 的服务器只负责账号审批、信令协调与密文转发，**所有语音、聊天与文件的解密密钥始终只留在成员自己的设备上**。管理员负责审批新成员与维护房间，而真正的加密信任由成员在自己的设备上核对安全码建立。

想直观了解一次通话背后经历了哪些环节，可以从[系统架构](/reference/architecture)开始。

## 文档目录

<DocumentDirectory />
