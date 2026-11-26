---
description: 根据客户端弹窗显示的错误码、简体中文或英文提示快速检索原因与处理建议。
---

<script setup>
import ErrorCodeFilter from '../.vitepress/theme/components/ErrorCodeFilter.vue'
import upstream from '../../upstream.json'
const clientErrorSwift = `https://github.com/${upstream.repository}/blob/${upstream.revision}/Client/apple/Shared/ClientError.swift`
const zhErrors = `https://github.com/${upstream.repository}/blob/${upstream.revision}/Client/apple/Shared/Resources/zh-Hans.lproj/Errors.strings`
</script>

# 客户端错误码检索

客户端弹窗中出现异常提示时，可以在下方搜索框输入完整的英文错误码（例如 `REGISTRATION_PENDING`），或者输入提示语中的任意关键词进行检索。

下表收录了客户端本地生成的错误码以及前端能够直接识别的服务端错误码（四个原生客户端共享同一套错误码映射与双语文案）。

::: tip 高频错误速览
- **`REGISTRATION_PENDING`**：你的注册申请已提交成功，正在等待管理员在管理台核对申请编号并批准。
- **`NETWORK_TIME_REQUIRED`**：设备本地系统时间与网络时间偏差过大，请开启设备「自动设置日期与时间」后再试。
- **`CLIENT_UPDATE_REQUIRED`**：管理员已在管理台提高了当前平台的最低支持版本，请向管理员获取新版安装包升级。
- **`DEVICE_IDENTITY_REQUIRED`**：检测到新设备尚未完成授权。请使用[旧设备扫码授权或 `.chirpkey` 恢复](/guide/devices)。
:::

## 错误码速查表

<ErrorCodeFilter>

<!--@include: ../.vitepress/data/apple-errors.inc.md-->

</ErrorCodeFilter>

::: info 错误码规范与隐私约束
客户端在解析 HTTP 响应时只解码规范的 `error.code` 和结构化 `client_policy`，绝不直接向用户界面回显未经校验的服务端原始 `error.message`，也不在错误对象中保留令牌、密钥或聊天原文。未识别的未知码会统一归类为 `CLIENT_UNKNOWN_SERVER_ERROR` 并附带原始码供排查。

若需要核对 Swift 枚举定义与双语本地化资源，可查阅源码中的 <a :href="clientErrorSwift"><code>ClientError.swift</code></a> 与 <a :href="zhErrors"><code>Errors.strings</code></a>，并结合[故障排查](/hosting/troubleshooting)进一步定位。
:::
