<template>
  <div>
    <h3>问卷管理</h3>
    <el-button type="primary" @click="create" style="margin-bottom:12px;">新建问卷</el-button>
    <el-table :data="surveys" v-loading="loading">
      <el-table-column prop="id" label="ID" width="80" />
      <el-table-column prop="title" label="问卷标题" />
      <el-table-column label="创建人" width="220">
        <template #default="{ row }">
          <el-space>
            <el-tag size="small">ID: {{ row.createdById || '—' }}</el-tag>
            <el-link type="primary" @click="openCreator(row.createdBy || row.createdById)">{{ row.createdBy || '—' }}</el-link>
          </el-space>
        </template>
      </el-table-column>
      <el-table-column prop="status" label="状态" width="120">
        <template #default="{ row }">
          <el-tag :type="statusType(row.status)">{{ statusText(row.status) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="auditStatus" label="审核状态" width="120">
        <template #default="{ row }">
          <el-tag :type="auditType(row.auditStatus)">{{ auditText(row.auditStatus) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="submitCount" label="收集份数" width="120">
        <template #default="{ row }">
          <el-tag type="info">{{ row.submitCount ?? 0 }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="360">
        <template #default="{ row }">
          <el-button size="small" @click="view(row.id)">查看内容</el-button>
          <el-button size="small" @click="publish(row.id)">发布</el-button>
          <el-dropdown size="small" style="margin-left:6px;">
            <el-button size="small">审核</el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item @click.stop="audit(row.id,'approved')">通过</el-dropdown-item>
                <el-dropdown-item @click.stop="audit(row.id,'rejected')">驳回</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
          <el-button size="small" type="danger" @click="remove(row.id)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>
  </div>
  <el-drawer v-model="drawer" title="问卷内容" size="50%">
    <div v-if="current">
      <div style="font-weight:600;margin-bottom:8px;">{{ current.title }}</div>
      <div style="margin:6px 0 12px; color:#666;">
        <el-space>
          <span>问卷ID: {{ current.id }}</span>
          <span>创建人: <el-link type="primary" @click="openCreator(current.createdBy || current.createdById)">{{ current.createdBy || '—' }}</el-link></span>
          <span>状态: {{ statusText(current.status) }}</span>
          <span v-if="current.auditStatus">审核: {{ auditText(current.auditStatus) }}</span>
          <span>收集份数: {{ current.submitCount ?? 0 }}</span>
        </el-space>
      </div>
      <el-collapse>
        <el-collapse-item v-for="(q, idx) in current.questions" :key="idx" :title="`${idx+1}. ${q.title}`">
          <div>类型：{{ q.type }}</div>
          <div v-if="q.options && q.options.length">
            选项：
            <ul>
              <li v-for="(op,i) in q.options" :key="i">{{ op.label ?? op.text ?? op.value }}</li>
            </ul>
          </div>
        </el-collapse-item>
      </el-collapse>
      <div style="margin-top:16px;">
        <h4>关键时间</h4>
        <ul style="line-height:1.8; color:#666;">
          <li>创建时间：{{ current.createdAt || '—' }}</li>
          <li v-if="current.updatedAt">最近修改：{{ current.updatedAt }}</li>
          <li v-if="current.publishedAt">发布时间：{{ current.publishedAt }}</li>
          <li v-if="current.closedAt">关闭时间：{{ current.closedAt }}</li>
          <li v-if="current.deletedAt">删除时间：{{ current.deletedAt }}</li>
          <li v-if="current.auditAt">审核时间：{{ current.auditAt }}</li>
          <li v-if="current.lastSubmitAt">最近提交：{{ current.lastSubmitAt }}</li>
        </ul>
        <h4 style="margin-top:12px;">操作留痕</h4>
        <el-timeline v-if="Array.isArray(current.logs) && current.logs.length">
          <el-timeline-item v-for="(log, i) in current.logs" :key="i" :timestamp="log.time" placement="top">
            <div><strong>{{ log.actor }}</strong> - {{ log.action }}</div>
            <div style="color:#666;">{{ log.detail }}</div>
          </el-timeline-item>
        </el-timeline>
        <div v-else style="color:#999;">暂无操作记录</div>
      </div>
    </div>
  </el-drawer>
  <el-drawer v-model="creatorDrawer" title="创建人信息" size="40%">
    <div v-if="creator">
      <el-descriptions title="创建人资料" :column="1" border style="margin-bottom:12px;">
        <el-descriptions-item label="ID">{{ creator.id }}</el-descriptions-item>
        <el-descriptions-item label="用户名">{{ creator.username }}</el-descriptions-item>
        <el-descriptions-item label="邮箱">{{ creator.email || '—' }}</el-descriptions-item>
        <el-descriptions-item label="角色">{{ creator.role }}</el-descriptions-item>
        <el-descriptions-item label="状态">{{ creator.isActive ? '启用' : '禁用' }}</el-descriptions-item>
      </el-descriptions>
      <h4 style="margin:8px 0;">该用户的问卷（{{ creatorSurveys.length }}）</h4>
      <el-table :data="creatorSurveys" size="small">
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="title" label="问卷标题" />
        <el-table-column prop="status" label="状态" width="120">
          <template #default="{ row }">
            <el-tag :type="statusType(row.status)">{{ statusText(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="submitCount" label="收集份数" width="100">
          <template #default="{ row }">{{ row.submitCount ?? 0 }}</template>
        </el-table-column>
        <el-table-column label="操作" width="160">
          <template #default="{ row }">
            <el-button size="small" @click="view(row.id)">查看</el-button>
            <el-button size="small" type="primary" @click="publish(row.id)">发布</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>
  </el-drawer>
</template>
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { listSurveys, createSurvey, deleteSurvey, publishSurvey } from '@/api/surveys'
import type { Survey } from '@/types/survey'
type SurveyDTO = Survey
import http from '@/api/http'
import { fetchUsers } from '@/api/userAdmin'

const surveys = ref<SurveyDTO[]>([])
const loading = ref(false)
const drawer = ref(false)
const current = ref<any>(null)
const creatorDrawer = ref(false)
const creator = ref<any>(null)
const creatorSurveys = ref<SurveyDTO[]>([])

const load = async () => {
  loading.value = true
  try {
    surveys.value = await listSurveys()
  } finally {
    loading.value = false
  }
}

const create = async () => {
  const s = await createSurvey({ title: '新问卷', questions: [] })
  surveys.value.push(s)
}

const remove = async (id: number) => {
  await deleteSurvey(id)
  surveys.value = surveys.value.filter(s => s.id !== id)
}

const publish = async (id: number) => {
  const s = await publishSurvey(id)
  const i = surveys.value.findIndex(x => x.id === id)
  if (i > -1) surveys.value[i] = s
}

const view = async (id: number) => {
  const { data } = await http.get(`/surveys/${id}?raw=true`)
  current.value = data.data
  drawer.value = true
}

const audit = async (id: number, action: 'approved'|'rejected') => {
  await http.post(`/surveys/${id}/audit`, { action })
  ElMessage.success(action === 'approved' ? '已通过' : '已驳回')
  load()
}

// 打开创建人详情
const openCreator = async (userIdentity: string | number | undefined) => {
  if (!userIdentity) return
  let username: string | null = null
  // 如果传入的是用户名（非纯数字），直接使用；否则按 ID 查找用户名
  if (typeof userIdentity === 'string' && isNaN(Number(userIdentity))) {
    username = userIdentity
  } else {
    // 通过用户列表回落查找（后端暂未提供按ID获取用户接口）
    const result = await fetchUsers()
    const users = result.list || result as any
    const found = users.find((u: any) => String(u.id) === String(userIdentity))
    if (found) username = found.username
  }
  if (!username) return
  const { data } = await http.get(`/users/${username}`)
  creator.value = data.data
  creatorSurveys.value = await listSurveys({ createdBy: username })
  creatorDrawer.value = true
}

onMounted(load)

// 中文状态映射
const statusText = (s?: string) => s === 'published' ? '收集中' : s === 'closed' ? '已结束' : '草稿'
const statusType = (s?: string) => s === 'published' ? 'success' : s === 'closed' ? 'info' : 'warning'
const auditText = (s?: string) => s === 'approved' ? '已通过' : s === 'rejected' ? '已驳回' : '待审核'
const auditType = (s?: string) => s === 'approved' ? 'success' : s === 'rejected' ? 'danger' : 'warning'
</script>
