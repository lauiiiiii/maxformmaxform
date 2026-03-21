<template>
  <div class="user-page">
    <h1>用户管理</h1>
    <section class="toolbar">
      <input v-model="q.keyword" placeholder="搜索用户名/邮箱/昵称" />
      <select v-model="q.role">
        <option value="">全部角色</option>
        <option value="admin">管理员</option>
        <option value="user">成员</option>
      </select>
      <select v-model="q.isActive">
        <option value="">全部状态</option>
        <option value="1">启用</option>
        <option value="0">禁用</option>
      </select>
      <button @click="load()">查询</button>
  <button @click="showDialog = true">新建用户</button>
  <button @click="doExport">导出CSV</button>
  <input type="file" @change="onImport" />
      <button :disabled="!selected.size" @click="bulk('enable')">批量启用</button>
      <button :disabled="!selected.size" @click="bulk('disable')">批量禁用</button>
      <button :disabled="!selected.size" @click="bulk('delete')">批量删除</button>
    </section>
    <table v-if="users.length" class="users">
      <thead>
        <tr>
          <th><input type="checkbox" :checked="allChecked" @change="toggleAll($event)" /></th>
          <th>ID</th>
          <th>用户名</th>
          <th>昵称</th>
          <th>角色</th>
          <th>状态</th>
          <th>创建时间</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="u in users" :key="u.username">
          <td><input type="checkbox" :checked="selected.has(u.username)" @change="toggleOne(u.username, $event)" /></td>
          <td>{{ u.id }}</td>
          <td>{{ u.username }}</td>
          <td>{{ u.nickname || '-' }}</td>
          <td>
            <select v-model="u.role" @change="apiUpdate(u.username,{ role: u.role }).then(load)">
              <option value="user">成员</option>
              <option value="admin">管理员</option>
            </select>
          </td>
          <td>
            <span :class="u.isActive?'ok':'ban'">{{ u.isActive ? '启用' : '禁用' }}</span>
          </td>
          <td>{{ u.createdAt?.slice(0,19).replace('T',' ') }}</td>
          <td>
            <button @click="edit(u)">编辑</button>
            <button v-if="u.isActive" @click="disable(u.username)">禁用</button>
            <button v-else @click="enable(u.username)">启用</button>
            <button @click="resetPwd(u.username)">重置密码</button>
            <button v-if="u.lockUntil" @click="unlock(u.username)">解锁</button>
            <button @click="assign(u, 'dept')">设部门</button>
            <button @click="assign(u, 'position')">设岗位</button>
            <button @click="remove(u.username)">删除</button>
          </td>
        </tr>
      </tbody>
    </table>
    <p v-else class="empty">暂无用户</p>
    <div class="pager" v-if="total>pageSize">
      <button :disabled="page===1" @click="page--; load()">上一页</button>
      <span>{{ page }}/{{ Math.ceil(total/pageSize) }}（共 {{ total }} 条）</span>
      <button :disabled="page*pageSize>=total" @click="page++; load()">下一页</button>
    </div>
    <div v-if="showDialog" class="dialog">
      <h3>{{ editing ? '编辑用户' : '新建用户' }}</h3>
      <label>用户名：<input v-model="form.username" /></label>
      <label>密码：<input v-model="form.password" type="password" /></label>
      <label>昵称：<input v-model="form.nickname" /></label>
      <label>角色：
        <select v-model="form.role">
          <option value="user">成员</option>
          <option value="admin">管理员</option>
        </select>
      </label>
      <button @click="save">保存</button>
      <button @click="close">取消</button>
    </div>
  </div>
</template>
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { fetchUsers, createUser as apiCreate, updateUser as apiUpdate, deleteUser as apiDelete, enableUser, disableUser, updatePassword, bulkUsers, unlockUser, exportUsersCsv, importUsers, assignDept, assignPosition } from '@/api/userAdmin'
import { listDepts } from '@/api/depts'
import { listPositions } from '@/api/positions'
const users = ref<any[]>([])
const showDialog = ref(false)
const editing = ref(false)
const form = ref<any>({ username: '', password: '', nickname: '', role: 'user' })
const editName = ref<string>('')
const page = ref(1)
const pageSize = ref(10)
const total = ref(0)
const q = ref<any>({ keyword: '', role: '', isActive: '' })
const selected = ref<Set<string>>(new Set())
const allChecked = ref(false)
const depts = ref<any[]>([])
const positions = ref<any[]>([])

async function load() {
  const { data, total: t } = await fetchUsers({ page: page.value, pageSize: pageSize.value, keyword: q.value.keyword, role: q.value.role, isActive: q.value.isActive })
  users.value = data
  total.value = t
  selected.value.clear()
  allChecked.value = false
}
function edit(u: any) {
  editing.value = true
  showDialog.value = true
  form.value = { username: u.username, password: '', nickname: u.nickname, role: u.role }
  editName.value = u.username
}
function close() {
  showDialog.value = false
  editing.value = false
  form.value = { username: '', password: '', nickname: '', role: 'user' }
  editName.value = ''
}
async function save() {
  if (editing.value) {
    const payload: any = { nickname: form.value.nickname, role: form.value.role }
    await apiUpdate(editName.value, payload)
  } else {
    await apiCreate(form.value)
  }
  close()
  await load()
}
async function remove(username: string) {
  await apiDelete(username)
  await load()
}
async function enable(username: string) { await enableUser(username); await load() }
async function disable(username: string) { await disableUser(username); await load() }
async function resetPwd(username: string) {
  const pwd = prompt(`为用户 ${username} 设置新密码（至少6位）`)
  if (!pwd) return
  await updatePassword(username, pwd)
  alert('已重置密码')
}
async function unlock(username: string) { await unlockUser(username); await load() }
function toggleOne(username: string, e: any) {
  if (e.target.checked) selected.value.add(username)
  else selected.value.delete(username)
  allChecked.value = users.value.length>0 && users.value.every(u => selected.value.has(u.username))
}
function toggleAll(e: any) {
  allChecked.value = e.target.checked
  selected.value.clear()
  if (allChecked.value) users.value.forEach(u => selected.value.add(u.username))
}
async function bulk(action: 'enable'|'disable'|'delete') {
  if (!selected.value.size) return
  await bulkUsers(action, Array.from(selected.value))
  await load()
}
async function doExport() {
  const blob = await exportUsersCsv()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'users.csv'
  a.click()
  URL.revokeObjectURL(url)
}
async function onImport(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  const text = await file.text()
  // 简易 CSV 解析：按行切分，第一行为表头
  const lines = text.split(/\r?\n/).filter(Boolean)
  if (!lines.length) return
  const headers = lines[0].split(',').map(s=>s.replace(/^\"|\"$/g,'').trim())
  const list:any[] = []
  for (let i=1;i<lines.length;i++) {
    const cols = lines[i].match(/\"([^\"]*(?:\"\"[^\"]*)*)\"|[^,]+/g) || []
    const values = cols.map(c => c.replace(/^\"|\"$/g,'').replace(/\"\"/g,'"'))
    const obj:any = {}
    headers.forEach((h,idx)=> obj[h] = values[idx] ?? '')
    if (obj.username) list.push(obj)
  }
  await importUsers(list)
  alert(`导入完成，共 ${list.length} 条`)
  await load()
  input.value = ''
}
async function assign(u:any, type:'dept'|'position') {
  if (type==='dept') {
    if (!depts.value.length) depts.value = await listDepts()
    const s = prompt(`输入部门ID（可选: ${depts.value.map((d:any)=>`${d.id}:${d.name}`).join(' , ')}），留空清除`)
    if (s===null) return
    const v = s.trim() ? Number(s.trim()) : null
    await assignDept(u.username, isNaN(v as any) ? null : v)
  } else {
    if (!positions.value.length) positions.value = await listPositions()
    const s = prompt(`输入岗位ID（可选: ${positions.value.map((p:any)=>`${p.id}:${p.name}`).join(' , ')}），留空清除`)
    if (s===null) return
    const v = s.trim() ? Number(s.trim()) : null
    await assignPosition(u.username, isNaN(v as any) ? null : v)
  }
  await load()
}
onMounted(load)
</script>
<style scoped>
.user-page { padding: 16px; }
.toolbar { margin-bottom: 12px; display: flex; gap: 8px; align-items: center; }
.users { width: 100%; border-collapse: collapse; }
.users th, .users td { border: 1px solid #ddd; padding: 6px 8px; }
.users th { background: #fafafa; }
.empty { color: #888; }
.dialog { position: fixed; top: 30%; left: 50%; transform: translate(-50%, -30%); background: #fff; border: 1px solid #ccc; padding: 24px; z-index: 1000; }
.pager { margin-top: 10px; display: flex; gap: 12px; align-items: center; }
.ok { color: #0a0; }
.ban { color: #a00; }
</style>
