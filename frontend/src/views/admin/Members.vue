<template>
  <div>
    <h3>成员与权限管理</h3>
    <!-- 工具栏（优化布局）：筛选 + 高级筛选 + 操作分组 -->
    <div class="toolbar">
      <div class="filters">
        <el-space wrap>
          <el-input v-model="q.keyword" placeholder="搜索账号/邮箱/昵称" style="width:220px" />
          <el-select v-model="q.role" placeholder="角色" style="width:140px">
            <el-option label="全部角色" value="" />
            <el-option label="成员" value="user" />
            <el-option label="管理员" value="admin" />
          </el-select>
          <el-select v-model="q.isActive" placeholder="状态" style="width:140px">
            <el-option label="全部状态" value="" />
            <el-option label="启用" value="1" />
            <el-option label="禁用" value="0" />
          </el-select>
          <el-button type="primary" @click="doSearch">查询</el-button>
          <el-button text @click="toggleAdvanced">{{ showAdvancedFilters ? '收起筛选' : '更多筛选' }}</el-button>
        </el-space>
        <div class="advanced" v-show="showAdvancedFilters">
          <el-space wrap>
            <el-select v-model="q.deptId" placeholder="部门" filterable style="width:180px" @visible-change="onDeptVisible">
              <el-option label="全部部门" :value="''" />
              <el-option v-for="d in depts" :key="d.id" :label="d.name" :value="String(d.id)" />
            </el-select>
            <el-select v-model="q.positionId" placeholder="岗位" filterable style="width:180px" @visible-change="onPosVisible">
              <el-option label="全部岗位" :value="''" />
              <el-option v-for="p in positions" :key="p.id" :label="p.name" :value="String(p.id)" />
            </el-select>
          </el-space>
        </div>
      </div>
      <div class="actions">
        <el-space wrap>
          <el-button @click="showInvite=true">邀请成员</el-button>
          <router-link :to="{ name: 'AdminDepts' }"><el-button>部门管理</el-button></router-link>
          <el-dropdown>
            <el-button>导出</el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item @click="doExport">导出CSV(当前筛选/选中)</el-dropdown-item>
                <el-dropdown-item @click="doExportXlsx">导出XLSX</el-dropdown-item>
                <el-dropdown-item @click="doExportXlsxPage">导出当前页XLSX</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
          <el-dropdown>
            <el-button>导入</el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item @click="triggerCsv">导入CSV</el-dropdown-item>
                <el-dropdown-item @click="triggerXlsx">导入Excel</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
          <input ref="csvInputRef" type="file" accept=".csv" @change="onImportCsv" style="display:none" />
          <input ref="xlsxInputRef" type="file" accept=".xlsx,.xls" @change="onImportXlsx" style="display:none" />
          <el-dropdown :disabled="!selected.length">
            <el-button :disabled="!selected.length">批量操作</el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item @click="bulk('enable')">批量启用</el-dropdown-item>
                <el-dropdown-item @click="bulk('disable')">批量禁用</el-dropdown-item>
                <el-dropdown-item divided @click="bulk('delete')">批量删除</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </el-space>
      </div>
    </div>

    <!-- 成员列表、角色分配、邀请成员等 -->
    <div class="table-wrap">
      <el-table :data="members" @selection-change="onSelChange" style="width:100%" size="small" :fit="false">
        <el-table-column type="selection" width="48" />
  <el-table-column prop="username" label="成员账号" width="140" class-name="col-uname" show-overflow-tooltip />
  <el-table-column prop="role" label="角色" width="100" align="center" />
  <el-table-column label="部门" width="120" show-overflow-tooltip>
          <template #default="{ row }">{{ deptName(row) }}</template>
        </el-table-column>
  <el-table-column label="岗位" width="120" show-overflow-tooltip>
          <template #default="{ row }">{{ posName(row) }}</template>
        </el-table-column>
        <el-table-column label="注册时间" width="160">
          <template #default="{ row }">{{ fmtTime(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column label="设计份数" width="100" align="center">
          <template #default="{ row }">{{ fmtNum(row.surveyCount || 0) }}</template>
        </el-table-column>
        <el-table-column label="收集条数" width="100" align="center">
          <template #default="{ row }">{{ fmtNum(row.submissionCount || 0) }}</template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="90" align="center" />
  <el-table-column label="操作" width="220">
          <template #default="scope">
            <el-button text size="small" @click="onEdit(scope.row)">编辑</el-button>
            <el-button v-if="scope.row.isActive" text size="small" type="danger" @click="onDisable(scope.row)">禁用</el-button>
            <el-button v-else text size="small" type="success" @click="onEnable(scope.row)">启用</el-button>
            <el-dropdown>
              <el-button text size="small">更多</el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item @click="onResetPwd(scope.row)">重置密码</el-dropdown-item>
                  <el-dropdown-item v-if="scope.row.lockUntil" @click="onUnlock(scope.row)">解锁</el-dropdown-item>
                  <el-dropdown-item @click="openAssignDialog(scope.row,'dept')">设部门</el-dropdown-item>
                  <el-dropdown-item @click="openAssignDialog(scope.row,'position')">设岗位</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <div class="pager">
      <el-pagination
        background
        layout="prev, pager, next, total"
        :current-page="page"
        :page-size="pageSize"
        :total="total"
        @current-change="onPageChange"
      />
    </div>

    <!-- 编辑成员弹窗 -->
    <el-dialog v-model="showEdit" title="编辑成员" width="420px">
      <el-form label-width="90px">
        <el-form-item label="账号">
          <el-input v-model="editForm.username" disabled />
        </el-form-item>
        <el-form-item label="昵称">
          <el-input v-model="editForm.nickname" />
        </el-form-item>
        <el-form-item label="角色">
          <el-select v-model="editForm.role" style="width:100%">
            <el-option label="成员" value="user" />
            <el-option label="管理员" value="admin" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-switch v-model="editActive" active-text="启用" inactive-text="禁用" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showEdit=false">取消</el-button>
        <el-button type="primary" @click="saveEdit">保存</el-button>
      </template>
    </el-dialog>

    <!-- 分配部门/岗位 -->
    <el-dialog v-model="showAssign" :title="assignType==='dept' ? '分配部门' : '分配岗位'" width="420px">
      <div v-if="assignType==='dept'">
        <el-select v-model="assignValue" placeholder="选择部门" filterable style="width:100%">
          <el-option :value="''" label="清除" />
          <el-option v-for="d in depts" :key="d.id" :value="String(d.id)" :label="d.name" />
        </el-select>
      </div>
      <div v-else>
        <el-select v-model="assignValue" placeholder="选择岗位" filterable style="width:100%">
          <el-option :value="''" label="清除" />
          <el-option v-for="p in positions" :key="p.id" :value="String(p.id)" :label="p.name" />
        </el-select>
      </div>
      <template #footer>
        <el-button @click="showAssign=false">取消</el-button>
        <el-button type="primary" @click="doAssign">保存</el-button>
      </template>
    </el-dialog>

    <!-- 邀请成员弹窗 -->
    <el-dialog v-model="showInvite" title="邀请成员" width="420px">
      <el-form label-width="90px">
        <el-form-item label="账号">
          <el-input v-model="inviteForm.username" placeholder="必填，唯一" />
        </el-form-item>
        <el-form-item label="邮箱">
          <el-input v-model="inviteForm.email" placeholder="可选" />
        </el-form-item>
        <el-form-item label="昵称">
          <el-input v-model="inviteForm.nickname" placeholder="可选" />
        </el-form-item>
        <el-form-item label="角色">
          <el-select v-model="inviteForm.role" style="width:100%">
            <el-option label="成员" value="user" />
            <el-option label="管理员" value="admin" />
          </el-select>
        </el-form-item>
        <el-form-item label="初始密码">
          <el-input v-model="inviteForm.password" placeholder="默认 123456" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showInvite=false">取消</el-button>
        <el-button type="primary" @click="doInvite">发送邀请</el-button>
      </template>
    </el-dialog>

    
  </div>
</template>
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { fetchUsers, createUser, updateUser, enableUser, disableUser, updatePassword, unlockUser, bulkUsers, assignDept, assignPosition, exportUsersCsv, importUsers, importUsersXlsx, exportUsersXlsx } from '@/api/userAdmin'
import { listDepts } from '@/api/depts'
import { listPositions } from '@/api/positions'

interface MemberItem { username:string; role:string; isActive:boolean; nickname?:string; status?:string; lockUntil?: string|null; createdAt?: string; surveyCount?: number; submissionCount?: number }
const members = ref<MemberItem[]>([])
const showEdit = ref(false)
const editForm = ref<MemberItem>({ username:'', role:'user', isActive:true, nickname:'' })
const editActive = ref(true)

const showInvite = ref(false)
const inviteForm = ref<any>({ username:'', email:'', role:'user', nickname:'', password:'' })

const q = ref<any>({ keyword:'', role:'', isActive:'', deptId:'', positionId:'' })
const showAdvancedFilters = ref(false)
const csvInputRef = ref<HTMLInputElement|null>(null)
const xlsxInputRef = ref<HTMLInputElement|null>(null)
const page = ref(1)
const pageSize = ref(10)
const total = ref(0)
const selected = ref<string[]>([])
const depts = ref<any[]>([])
const positions = ref<any[]>([])
const showAssign = ref(false)
const assignType = ref<'dept'|'position'>('dept')
const assignUser = ref<string>('')
const assignValue = ref<string>('')

// 注：部门管理采用内联路由跳转（router-link），无需额外方法

const load = async () => {
  const { data, total: t } = await fetchUsers({ page: page.value, pageSize: pageSize.value, keyword: q.value.keyword, role: q.value.role, isActive: q.value.isActive, deptId: q.value.deptId, positionId: q.value.positionId })
  members.value = data.map((u:any) => ({ username: u.username, role: u.role, isActive: u.isActive, nickname: u.nickname, status: u.isActive ? '正常' : '禁用', lockUntil: u.lockUntil, createdAt: u.createdAt, surveyCount: u.surveyCount ?? 0, submissionCount: u.submissionCount ?? 0 }))
  total.value = t
}

function onEdit(row: MemberItem) {
  showEdit.value = true
  editForm.value = { ...row }
  editActive.value = !!row.isActive
}
async function saveEdit() {
  await updateUser(editForm.value.username, { role: editForm.value.role, nickname: editForm.value.nickname })
  // 同步状态开关
  if (editActive.value !== editForm.value.isActive) {
    if (editActive.value) await enableUser(editForm.value.username)
    else await disableUser(editForm.value.username)
  }
  showEdit.value = false
  await load()
}
async function onDisable(row: MemberItem) { await disableUser(row.username); await load() }
async function onEnable(row: MemberItem) { await enableUser(row.username); await load() }
async function onResetPwd(row: MemberItem) {
  const pwd = prompt(`为 ${row.username} 设置新密码（至少6位）`)
  if (!pwd) return
  await updatePassword(row.username, pwd)
}
async function onUnlock(row: any) { await unlockUser(row.username); await load() }

async function doInvite() {
  const payload:any = { username: inviteForm.value.username, email: inviteForm.value.email, role: inviteForm.value.role, nickname: inviteForm.value.nickname }
  if (inviteForm.value.password) payload.password = inviteForm.value.password
  await createUser(payload)
  showInvite.value = false
  inviteForm.value = { username:'', email:'', role:'user', nickname:'', password:'' }
  await load()
}

function onSelChange(rows: any[]) { selected.value = rows.map(r => r.username) }
async function bulk(action:'enable'|'disable'|'delete') { if (!selected.value.length) return; await bulkUsers(action, selected.value); await load() }
function doSearch() { page.value = 1; load() }
function onPageChange(p:number) { page.value = p; load() }
function toggleAdvanced() { showAdvancedFilters.value = !showAdvancedFilters.value }
function triggerCsv() { csvInputRef.value?.click() }
function triggerXlsx() { xlsxInputRef.value?.click() }

function openAssignDialog(row:any, type:'dept'|'position') { assignUser.value = row.username; assignType.value = type; assignValue.value=''; showAssign.value = true }
async function doAssign() {
  const v = assignValue.value.trim() ? Number(assignValue.value.trim()) : null
  if (assignType.value==='dept') await assignDept(assignUser.value, v)
  else await assignPosition(assignUser.value, v)
  showAssign.value = false
  await load()
}
async function onDeptVisible(open:boolean) { if (open && !depts.value.length) depts.value = await listDepts() }
async function onPosVisible(open:boolean) { if (open && !positions.value.length) positions.value = await listPositions() }

function deptName(row:any) {
  if (!row || row.deptId == null) return '-'
  const item = depts.value.find((d:any)=> Number(d.id) === Number(row.deptId))
  return item ? item.name : `#${row.deptId}`
}
function posName(row:any) {
  if (!row || row.positionId == null) return '-'
  const item = positions.value.find((p:any)=> Number(p.id) === Number(row.positionId))
  return item ? item.name : `#${row.positionId}`
}

async function doExport() {
  try {
    const params:any = { keyword:q.value.keyword, role:q.value.role, isActive:q.value.isActive, deptId:q.value.deptId, positionId:q.value.positionId, page: page.value, pageSize: pageSize.value, sortBy:'createdAt', order:'desc' }
    if (selected.value.length) params.usernames = selected.value
    const blob = await exportUsersCsv(params)
    if (!(blob instanceof Blob)) throw new Error('导出失败：未获得文件')
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'users.csv'
    a.click()
    URL.revokeObjectURL(url)
  } catch (e:any) {
    alert('导出 CSV 失败：' + (e?.response?.data?.msg || e?.message || '后端未启动或无权限'))
  }
}
async function doExportXlsx() {
  try {
    const params:any = { keyword:q.value.keyword, role:q.value.role, isActive:q.value.isActive, deptId:q.value.deptId, positionId:q.value.positionId, sortBy:'createdAt', order:'desc' }
    if (selected.value.length) params.usernames = selected.value
    const blob = await exportUsersXlsx(params)
    if (!(blob instanceof Blob)) throw new Error('导出失败：未获得文件')
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'users.xlsx'
    a.click()
    URL.revokeObjectURL(url)
  } catch (e:any) {
    alert('导出 XLSX 失败：' + (e?.response?.data?.msg || e?.message || '后端未启动或无权限'))
  }
}
async function doExportXlsxPage() {
  try {
    const params:any = { keyword:q.value.keyword, role:q.value.role, isActive:q.value.isActive, deptId:q.value.deptId, positionId:q.value.positionId, pageOnly: '1', page: page.value, pageSize: pageSize.value, sortBy:'createdAt', order:'desc' }
    const blob = await exportUsersXlsx(params)
    if (!(blob instanceof Blob)) throw new Error('导出失败：未获得文件')
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `users_page_${page.value}.xlsx`
    a.click()
    URL.revokeObjectURL(url)
  } catch (e:any) {
    alert('导出 XLSX（当前页）失败：' + (e?.response?.data?.msg || e?.message || '后端未启动或无权限'))
  }
}
async function onImportCsv(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  const text = await file.text()
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
  const res = await importUsers(list)
  if (res?.errors?.length) {
    alert(`导入完成: 新增 ${res.created} 条, 跳过 ${res.skipped} 条\n其中 ${res.errors.length} 条有问题, 请检查: \n` + res.errors.slice(0,5).map((e:any)=>`#${e.index||e.row||'?'} ${e.username||''} ${e.reason}`).join('\n'))
  }
  await load()
  input.value = ''
}
async function onImportXlsx(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  const res = await importUsersXlsx(file)
  if (res?.errors?.length) {
    alert(`导入完成: 新增 ${res.created} 条, 跳过 ${res.skipped} 条\n其中 ${res.errors.length} 条有问题, 请检查: \n` + res.errors.slice(0,5).map((e:any)=>`#${e.index||e.row||'?'} ${e.username||''} ${e.reason}`).join('\n'))
  }
  await load()
  input.value = ''
}

onMounted(async () => {
  load()
  // 预加载部门、岗位，以便表格显示名称
  try { depts.value = await listDepts() } catch {}
  try { positions.value = await listPositions() } catch {}
})

function fmtTime(s?: string) {
  if (!s) return '-'
  const d = new Date(s)
  if (isNaN(d.getTime())) return s
  const pad = (n:number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}
function fmtNum(n?: number) {
  const v = Number(n||0)
  return v.toLocaleString()
}

// （保留 depts 变量用于成员表“部门名称”展示）
</script>
<style scoped>
 .toolbar { display:flex; gap:12px; align-items:flex-start; justify-content:space-between; flex-wrap:wrap; margin-bottom: 12px }
 .filters { display:flex; flex-direction:column; gap:8px; min-width:320px }
 .advanced { padding-top:4px }
 .actions { display:flex; align-items:center }
.pager { margin-top: 12px; display:flex; justify-content:flex-end }
 /* 取消老式文件按钮样式，改为隐藏 input */
 .table-wrap { width:100%; overflow-x:auto }
 :deep(.el-table .cell) { white-space: nowrap; overflow: hidden; text-overflow: ellipsis }
 :deep(.el-table .col-uname .cell) { max-width: 140px }
 /* 注：部门管理改为单独页面，抽屉样式删除 */
</style>
