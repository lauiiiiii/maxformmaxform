<template>
  <div class="answer-page">
    <h1>答案管理</h1>
    <section class="toolbar">
      <label>
        问卷ID：
        <input v-model="query.projectId" placeholder="输入问卷ID" />
      </label>
      <label>
        开始时间：
        <input type="date" v-model="startDate" />
      </label>
      <label>
        结束时间：
        <input type="date" v-model="endDate" />
      </label>
      <label>
        状态：
        <select v-model="query.status">
          <option value="">全部</option>
          <option value="completed">已完成</option>
          <option value="draft">暂存</option>
        </select>
      </label>
      <button @click="load">查询</button>
      <button @click="download">导出Excel</button>
      <button @click="batchRemove" :disabled="!selected.length">批量删除</button>
      <button @click="batchExport" :disabled="!selected.length">批量导出</button>
      <button @click="showDeleted = !showDeleted">{{ showDeleted ? '返回列表' : '查看回收站' }}</button>
      <button @click="importDialog = true">导入Excel</button>
    </section>

    <table v-if="answers.length" class="answers">
      <thead>
        <tr>
          <th><input type="checkbox" v-model="allChecked" @change="toggleAll" /></th>
          <th>ID</th>
          <th>提交时间</th>
          <th>用户</th>
          <th>得分</th>
          <th>状态</th>
          <th v-if="showDeleted">恢复</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="a in answers" :key="a.id">
          <td><input type="checkbox" v-model="selected" :value="a.id" /></td>
          <td>{{ a.id }}</td>
          <td>{{ formatDate(a.createAt) }}</td>
          <td>{{ a.userInfo?.nickname || a.userInfo?.username || '-' }}</td>
          <td>{{ a.examScore ?? '-' }}</td>
          <td>{{ a.status ?? '-' }}</td>
          <td v-if="showDeleted">
            <button @click="restore(a.id)">恢复</button>
            <button @click="destroy(a.id)">彻底删除</button>
          </td>
          <td>
            <button @click="remove(a.id)">删除</button>
          </td>
        </tr>
      </tbody>
    </table>

    <p v-else class="empty">暂无数据</p>
    <div class="pager" v-if="total > query.pageSize">
      <button @click="prev" :disabled="query.current === 1">上一页</button>
      <span>第 {{ query.current }} 页 / 共 {{ Math.ceil(total / query.pageSize) }} 页</span>
      <button @click="next" :disabled="query.current * query.pageSize >= total">下一页</button>
    </div>

    <div v-if="importDialog" class="import-dialog">
      <h3>导入Excel</h3>
      <input type="file" @change="onFileChange" accept=".xlsx,.xls" />
      <button @click="importDialog = false">取消</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { listAnswers, deleteAnswers, downloadSurveyExcel } from '@/api/surveyAnswers'
import type { Answer } from '@/types/answer'

const query = ref<AnswerQuery>({ current: 1, pageSize: 10, projectId: '' })
const answers = ref<AnswerView[]>([])
const total = ref(0)
const selected = ref<string[]>([])
const startDate = ref('')
const endDate = ref('')
const showDeleted = ref(false)
const importDialog = ref(false)

const allChecked = computed({
  get: () => answers.value.length > 0 && selected.value.length === answers.value.length,
  set: v => toggleAll()
})

function toggleAll() {
  if (allChecked.value) {
    selected.value = []
  } else {
    selected.value = answers.value.map(a => a.id as string)
  }
}

async function load() {
  if (!query.value.projectId) return
  if (startDate.value) query.value.startTime = new Date(startDate.value)
  else delete query.value.startTime
  if (endDate.value) query.value.endTime = new Date(endDate.value)
  else delete query.value.endTime
  if (showDeleted.value) {
    answers.value = await surveyAnswerService.listAnswerDeleted(query.value)
    total.value = answers.value.length
  } else {
    const res = await surveyAnswerService.listAnswer(query.value)
    answers.value = res.list
    total.value = res.total
  }
  selected.value = []
}

async function restore(id?: string) {
  if (!id) return
  await surveyAnswerService.restoreAnswer([id])
  await load()
}

async function destroy(id?: string) {
  if (!id) return
  await surveyAnswerService.batchDestroyAnswer([id])
  await load()
}

async function download() {
  if (!query.value.projectId) return
  const blob = await surveyAnswerService.downloadSurvey({ projectId: query.value.projectId } as DownloadQuery)
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'survey.xlsx'
  a.click()
  URL.revokeObjectURL(url)
}

async function batchExport() {
  if (!selected.value.length) return
  const blob = await surveyAnswerService.downloadSurvey({ projectId: query.value.projectId, ids: selected.value } as DownloadQuery)
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'survey-selected.xlsx'
  a.click()
  URL.revokeObjectURL(url)
}

async function remove(id?: string) {
  if (!id) return
  await surveyAnswerService.deleteAnswer([id])
  await load()
}

async function batchRemove() {
  if (!selected.value.length) return
  await surveyAnswerService.deleteAnswer(selected.value)
  await load()
}

function formatDate(d?: Date) {
  if (!d) return '-'
  const dt = typeof d === 'string' ? new Date(d) : d
  return dt.toLocaleString()
}

function prev() {
  if (query.value.current > 1) {
    query.value.current--
    load()
  }
}
function next() {
  if (query.value.current * query.value.pageSize < total.value) {
    query.value.current++
    load()
  }
}

function onFileChange(e: Event) {
  const files = (e.target as HTMLInputElement).files
  if (!files || !files[0]) return
  surveyAnswerService.importAnswer(files[0], query.value.projectId!).then(() => {
    importDialog.value = false
    load()
  })
}
</script>

<style scoped>
.answer-page { padding: 16px; }
.toolbar { display: flex; gap: 8px; align-items: center; margin-bottom: 12px; }
.answers { width: 100%; border-collapse: collapse; }
.answers th, .answers td { border: 1px solid #ddd; padding: 6px 8px; }
.empty { color: #888; }
.pager { margin-top: 12px; display: flex; gap: 8px; align-items: center; }
.import-dialog { position: fixed; top: 30%; left: 50%; transform: translate(-50%, -30%); background: #fff; border: 1px solid #ccc; padding: 24px; z-index: 1000; }
</style>
