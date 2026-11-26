<script setup lang="ts">
import { computed } from 'vue'
import { useData } from 'vitepress'

const { lang } = useData()
const isEn = computed(() => lang.value.startsWith('en'))

const rows = computed(() =>
  isEn.value
    ? [
        { op: 'Change / clear room password', browser: 'Kept', bearer: 'Kept', entry: 'Existing calls kept', media: 'Only blocks new joins without new password' },
        { op: 'Remove participant from room', browser: 'Kept', bearer: 'Kept', entry: 'Current entry revoked', media: 'Kicked via LiveKit RPC; can join other rooms' },
        { op: 'End room call / delete room', browser: 'Kept', bearer: 'Kept', entry: 'All room entries revoked', media: 'Group & SFU closed; other rooms unaffected' },
        { op: 'Revoke login / new device login', browser: 'Independent', bearer: 'Replaced / revoked', entry: 'All entries revoked', media: 'Old client session & media removed' },
        { op: 'Disable / delete account', browser: 'Invalidated', bearer: 'Invalidated', entry: 'Invalidated', media: 'Immediately removed from all rooms' },
        { op: 'Admin revokes last valid device', browser: 'Invalidated', bearer: 'Invalidated', entry: 'Invalidated', media: 'Permanent account & device blacklist (irreversible)' },
      ]
    : [
        { op: '修改或取消房间密码', browser: '保留', bearer: '保留', entry: '保留现有入房', media: '仅要求后续新入房使用新密码，不踢出在房成员' },
        { op: '移出房间参与者', browser: '保留', bearer: '保留', entry: '撤销当次入房', media: '通过 LiveKit RPC 移出当前房间，可进入其他房间' },
        { op: '结束当前通话 / 删除房间', browser: '保留', bearer: '保留', entry: '撤销该房全部入房', media: '关闭该房安全群组与 SFU 连接，他房不受影响' },
        { op: '撤销当前登录 / 新设备接管', browser: '互不影响', bearer: '立即作废或替换', entry: '全部撤销', media: '旧端连接被清理，退出登录' },
        { op: '停用或删除成员账号', browser: '立即失效', bearer: '立即失效', entry: '立即失效', media: '立即移出所有语音房间' },
        { op: '管理员撤销最后一台有效设备', browser: '立即失效', bearer: '立即失效', entry: '立即失效', media: '账号与设备写入永久黑名单（不可逆）' },
      ],
)
</script>

<template>
  <figure class="diagram-card" :aria-label="isEn ? 'Admin Operation Impact Scope' : '管理员与会话操作级联影响对照图'">
    <div class="diagram-header">
      <div class="diagram-title">{{ isEn ? 'Session & Credential Impact Matrix for Administrative Actions' : '管理操作对各类会话与凭据的级联影响范围' }}</div>
    </div>
    <div class="diagram-body">
      <table class="cascade-table">
        <thead>
          <tr>
            <th>{{ isEn ? 'Action' : '管理 / 会话操作' }}</th>
            <th>{{ isEn ? 'Browser Cookie' : '浏览器会话' }}</th>
            <th>{{ isEn ? 'Client Bearer' : '客户端 Bearer' }}</th>
            <th>{{ isEn ? 'Room Entry' : '入房资格' }}</th>
            <th>{{ isEn ? 'Actual Impact' : '实际效果说明' }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in rows" :key="row.op">
            <td><strong>{{ row.op }}</strong></td>
            <td>{{ row.browser }}</td>
            <td>{{ row.bearer }}</td>
            <td>{{ row.entry }}</td>
            <td>{{ row.media }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </figure>
</template>
