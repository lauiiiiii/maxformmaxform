<template>
  <div class="question-bank-page" data-testid="admin-repos-page">
    <section class="page-header">
      <div>
        <h3>题库管理</h3>
        <p>支持题库新建、搜索筛选、题目维护、Excel/文本导入和批量导出。</p>
      </div>
      <div class="page-actions">
        <el-button @click="loadRepos">刷新</el-button>
        <el-button type="primary" data-testid="repo-create-button" @click="openRepoDialog()">新建题库</el-button>
      </div>
    </section>

    <div class="workspace">
      <section class="panel repo-panel">
        <div class="panel-header">
          <div class="panel-title">题库列表</div>
          <div class="panel-count">{{ repos.length }} 个题库</div>
        </div>

        <div class="filters">
          <el-input v-model="repoFilters.keyword" placeholder="搜索题库名称/标签/分类" clearable @keyup.enter="loadRepos" />
          <el-input v-model="repoFilters.category" placeholder="分类" clearable @keyup.enter="loadRepos" />
          <el-input v-model="repoFilters.repoType" placeholder="题库类型" clearable @keyup.enter="loadRepos" />
          <el-button type="primary" @click="loadRepos">搜索</el-button>
        </div>

        <el-table
          :data="repos"
          v-loading="loading"
          row-key="id"
          highlight-current-row
          class="repo-table"
          data-testid="admin-repos-table"
          @row-click="selectRepo"
        >
          <el-table-column prop="name" label="题库名称" min-width="180">
            <template #default="{ row }">
              <span :data-testid="`repo-name-${row.id}`">{{ row.name }}</span>
            </template>
          </el-table-column>
          <el-table-column label="分类" width="120">
            <template #default="{ row }">{{ row.category || '-' }}</template>
          </el-table-column>
          <el-table-column label="题量" width="80">
            <template #default="{ row }">{{ row.questionCount || row.question_count || 0 }}</template>
          </el-table-column>
          <el-table-column label="操作" width="170" fixed="right">
            <template #default="{ row }">
              <el-button size="small" @click.stop="openRepoDialog(row)">编辑</el-button>
              <el-button size="small" type="danger" :data-testid="`repo-delete-button-${row.id}`" @click.stop="removeRepoAction(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </section>

      <section class="panel question-panel">
        <template v-if="activeRepo">
          <div class="panel-header">
            <div>
              <div class="panel-title">{{ activeRepo.name }}</div>
              <div class="panel-subtitle">{{ activeRepo.description || '未填写题库描述' }}</div>
            </div>
            <div class="toolbar-actions">
              <el-button @click="openImportDialog">导入题目</el-button>
              <el-button @click="handleExport('json')">导出 JSON</el-button>
              <el-button @click="handleExport('txt')">导出文本</el-button>
              <el-button @click="handleExport('xlsx')">导出 Excel</el-button>
              <el-button type="primary" data-testid="repo-question-add-button" @click="openQuestionDialog()">新增题目</el-button>
            </div>
          </div>

          <div class="repo-meta">
            <span>分类：{{ activeRepo.category || '-' }}</span>
            <span>类型：{{ activeRepo.repoType || '-' }}</span>
            <span>共享：{{ activeRepo.shared ? '是' : '否' }}</span>
            <span>练习库：{{ activeRepo.practice ? '是' : '否' }}</span>
          </div>

          <div class="filters">
            <el-input v-model="questionFilters.keyword" placeholder="搜索题干、标题、标签" clearable @keyup.enter="loadQuestions" />
            <el-select v-model="questionFilters.type" placeholder="题型" clearable style="width: 160px">
              <el-option v-for="option in questionTypeOptions" :key="option.value" :label="option.label" :value="option.value" />
            </el-select>
            <el-button type="primary" @click="loadQuestions">搜索</el-button>
          </div>

          <el-table :data="questions" v-loading="qLoading" data-testid="repo-questions-table">
            <el-table-column prop="title" label="题目标题" min-width="180">
              <template #default="{ row }">
                <span :data-testid="`repo-question-title-${row.id}`">{{ row.title }}</span>
              </template>
            </el-table-column>
            <el-table-column label="题型" width="120">
              <template #default="{ row }">
                <span :data-testid="`repo-question-type-${row.id}`">{{ row.type || row.content?.questionType || '-' }}</span>
              </template>
            </el-table-column>
            <el-table-column label="题干" min-width="220">
              <template #default="{ row }">
                <span :data-testid="`repo-question-stem-${row.id}`">{{ formatStem(row) }}</span>
              </template>
            </el-table-column>
            <el-table-column label="选项" min-width="160">
              <template #default="{ row }">
                <span :data-testid="`repo-question-option-count-${row.id}`">{{ formatOptionCount(row) }}</span>
                <div class="muted" :data-testid="`repo-question-option-preview-${row.id}`">{{ formatOptionPreview(row) }}</div>
              </template>
            </el-table-column>
            <el-table-column label="标签" min-width="160">
              <template #default="{ row }">{{ (row.tags || []).join('，') || '-' }}</template>
            </el-table-column>
            <el-table-column label="更新时间" width="180">
              <template #default="{ row }">{{ formatDate(row.updatedAt || row.updated_at) }}</template>
            </el-table-column>
            <el-table-column label="操作" width="170" fixed="right">
              <template #default="{ row }">
                <el-button size="small" @click="openQuestionDialog(row)">编辑</el-button>
                <el-button size="small" type="danger" :data-testid="`repo-question-delete-button-${row.id}`" @click="removeQuestionAction(row)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>

          <div v-if="!qLoading && !questions.length" class="empty">当前筛选条件下暂无题目</div>
        </template>

        <div v-else class="empty empty-large">
          请选择左侧题库，或先新建题库。
        </div>
      </section>
    </div>

    <el-dialog v-model="repoDialogVisible" :title="repoForm.id ? '编辑题库' : '新建题库'" width="640px">
      <div class="dialog-grid">
        <el-input v-model="repoForm.name" placeholder="题库名称" data-testid="repo-name-input" />
        <el-input v-model="repoForm.category" placeholder="分类" />
        <el-input v-model="repoForm.repoType" placeholder="题库类型" />
        <el-input v-model="repoForm.tagsText" placeholder="标签，逗号/换行分隔" />
        <el-input v-model="repoForm.description" type="textarea" :rows="4" placeholder="题库描述" class="full-span" />
        <div class="switches full-span">
          <el-switch v-model="repoForm.shared" active-text="共享题库" />
          <el-switch v-model="repoForm.practice" active-text="练习题库" />
        </div>
      </div>
      <template #footer>
        <el-button @click="repoDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitRepo">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="questionDialogVisible" :title="questionForm.id ? '编辑题目' : '新增题目'" width="760px">
      <div class="dialog-grid">
        <el-input v-model="questionForm.title" placeholder="题目标题" data-testid="repo-question-title-input" />
        <el-select v-model="questionForm.type" placeholder="题型" data-testid="repo-question-type-select">
          <el-option v-for="option in questionTypeOptions" :key="option.value" :label="option.label" :value="option.value" />
        </el-select>
        <el-input v-model="questionForm.difficulty" placeholder="难度" />
        <el-input v-model="questionForm.score" placeholder="分值" />
        <el-input v-model="questionForm.tagsText" placeholder="标签，逗号/换行分隔" />
        <el-input v-model="questionForm.knowledgePointsText" placeholder="知识点，逗号/换行分隔" />
        <el-input v-model="questionForm.applicableScenesText" placeholder="适用场景，逗号/换行分隔" class="full-span" />
        <el-input v-model="questionForm.stem" type="textarea" :rows="4" placeholder="题干 / 题面" class="full-span" data-testid="repo-question-stem-input" />
        <el-input v-model="questionForm.optionsText" type="textarea" :rows="4" placeholder="选项，每行一个；单选/多选题至少 2 项" class="full-span" data-testid="repo-question-options-input" />
        <el-input v-model="questionForm.analysis" type="textarea" :rows="3" placeholder="解析" class="full-span" />
        <el-input v-model="questionForm.correctAnswerText" placeholder="正确答案，可直接填文本或 JSON" class="full-span" />
        <el-input v-model="questionForm.advancedContent" type="textarea" :rows="5" placeholder='高级 JSON 扩展，例如 {"surveyQuestion": {...}}' class="full-span" />
      </div>
      <template #footer>
        <el-button @click="questionDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitQuestion">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="importDialogVisible" title="导入题目" width="720px">
      <div class="import-mode">
        <el-radio-group v-model="importMode">
          <el-radio-button label="file">文件导入</el-radio-button>
          <el-radio-button label="text">文本导入</el-radio-button>
        </el-radio-group>
        <el-select v-model="importFormat" style="width: 180px">
          <el-option label="Excel (.xlsx/.xls)" value="xlsx" />
          <el-option label="文本 (.txt)" value="txt" />
          <el-option label="JSON (.json)" value="json" />
        </el-select>
      </div>

      <div v-if="importMode === 'file'" class="import-box">
        <input :key="fileInputKey" type="file" accept=".xlsx,.xls,.json,.txt" @change="handleFileChange" />
        <div class="muted">{{ selectedFileName || '未选择文件' }}</div>
      </div>
      <el-input v-else v-model="importText" type="textarea" :rows="12" placeholder="支持特定格式文本，每道题用空行分隔。例如：标题: ... / 类型: radio / 题干: ... / 选项: A | B | C" />

      <div v-if="importResult" class="import-result">
        <div>总计：{{ importResult.totalCount }}，成功：{{ importResult.createdCount }}，失败：{{ importResult.failedCount }}</div>
        <div v-if="importResult.errors.length" class="import-errors">
          <div v-for="item in importResult.errors" :key="`${item.index}-${item.title}`">
            第 {{ item.index }} 条 {{ item.title ? `《${item.title}》` : '' }}：{{ item.reason }}
          </div>
        </div>
      </div>

      <template #footer>
        <el-button @click="importDialogVisible = false">关闭</el-button>
        <el-button type="primary" @click="submitImport">开始导入</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  addBankQuestion,
  createRepo,
  deleteRepo,
  exportRepo,
  importBankQuestions,
  listBankQuestions,
  listRepos,
  removeBankQuestion,
  updateBankQuestion,
  updateRepo,
  type QuestionBankExportFormat,
  type QuestionBankImportFormat,
  type QuestionBankImportResultDTO,
  type QuestionBankQuestionDTO,
  type QuestionBankQuestionFormDTO,
  type QuestionBankRepoDTO
} from '@/api/repos'

const questionTypeOptions = [
  { label: '单选', value: 'radio' },
  { label: '多选', value: 'checkbox' },
  { label: '填空', value: 'input' },
  { label: '问答', value: 'textarea' }
]

const loading = ref(false)
const qLoading = ref(false)
const repos = ref<QuestionBankRepoDTO[]>([])
const questions = ref<QuestionBankQuestionDTO[]>([])
const activeRepoId = ref<number | null>(null)
const repoDialogVisible = ref(false)
const questionDialogVisible = ref(false)
const importDialogVisible = ref(false)
const importMode = ref<'file' | 'text'>('file')
const importFormat = ref<QuestionBankImportFormat>('xlsx')
const selectedFile = ref<File | null>(null)
const selectedFileName = ref('')
const importText = ref('')
const importResult = ref<QuestionBankImportResultDTO | null>(null)
const fileInputKey = ref(0)

const repoFilters = reactive({ keyword: '', category: '', repoType: '' })
const questionFilters = reactive({ keyword: '', type: '' })
const repoForm = reactive({ id: undefined as number | undefined, name: '', description: '', category: '', repoType: '', shared: false, practice: false, tagsText: '' })
const questionForm = reactive({ id: undefined as number | undefined, title: '', type: 'radio', stem: '', optionsText: '', analysis: '', difficulty: '', score: '', tagsText: '', knowledgePointsText: '', applicableScenesText: '', correctAnswerText: '', advancedContent: '' })

const activeRepo = computed(() => repos.value.find(item => item.id === activeRepoId.value) || null)

function cleanQuery<T extends Record<string, unknown>>(value: T) {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== '' && item != null))
}

function splitTextList(value: string) {
  return value.split(/[,\n|]/).map(item => item.trim()).filter(Boolean)
}

function parseJsonMaybe(value: string) {
  const text = value.trim()
  if (!text) return undefined
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

function resetRepoForm(repo?: QuestionBankRepoDTO) {
  repoForm.id = repo?.id
  repoForm.name = repo?.name || ''
  repoForm.description = repo?.description || ''
  repoForm.category = repo?.category || ''
  repoForm.repoType = repo?.repoType || ''
  repoForm.shared = Boolean(repo?.shared)
  repoForm.practice = Boolean(repo?.practice)
  repoForm.tagsText = (repo?.tags || []).join(', ')
}

function resetQuestionForm(question?: QuestionBankQuestionDTO) {
  questionForm.id = question?.id
  questionForm.title = question?.title || ''
  questionForm.type = question?.type || question?.content?.questionType || 'radio'
  questionForm.stem = question?.stem || question?.content?.stem || ''
  questionForm.optionsText = (question?.options || []).map(option => option.label || option.text || option.value || '').filter(Boolean).join('\n')
  questionForm.analysis = question?.analysis || question?.content?.analysis || ''
  questionForm.difficulty = question?.difficulty || question?.content?.difficulty || ''
  questionForm.score = question?.score == null ? '' : String(question.score)
  questionForm.tagsText = (question?.tags || []).join(', ')
  questionForm.knowledgePointsText = (question?.knowledgePoints || []).join(', ')
  questionForm.applicableScenesText = (question?.applicableScenes || []).join(', ')
  questionForm.correctAnswerText = question?.correctAnswer == null ? '' : JSON.stringify(question.correctAnswer)
  questionForm.advancedContent = ''
}

function openRepoDialog(repo?: QuestionBankRepoDTO) {
  resetRepoForm(repo)
  repoDialogVisible.value = true
}

function openQuestionDialog(question?: QuestionBankQuestionDTO) {
  if (!activeRepo.value?.id) {
    ElMessage.warning('请先选择题库')
    return
  }
  resetQuestionForm(question)
  questionDialogVisible.value = true
}

async function loadRepos() {
  loading.value = true
  try {
    repos.value = await listRepos(cleanQuery(repoFilters))
    if (!repos.value.some(item => item.id === activeRepoId.value)) {
      activeRepoId.value = repos.value[0]?.id ?? null
    }
    await loadQuestions()
  } finally {
    loading.value = false
  }
}

async function loadQuestions() {
  if (!activeRepoId.value) {
    questions.value = []
    return
  }
  qLoading.value = true
  try {
    questions.value = await listBankQuestions(activeRepoId.value, cleanQuery(questionFilters))
  } finally {
    qLoading.value = false
  }
}

async function selectRepo(row: QuestionBankRepoDTO) {
  activeRepoId.value = row.id || null
  await loadQuestions()
}

async function submitRepo() {
  const payload = {
    name: repoForm.name,
    description: repoForm.description || undefined,
    category: repoForm.category || undefined,
    repoType: repoForm.repoType || undefined,
    shared: repoForm.shared,
    practice: repoForm.practice,
    tags: splitTextList(repoForm.tagsText)
  }
  const repo = repoForm.id ? await updateRepo(repoForm.id, payload) : await createRepo(payload)
  repoDialogVisible.value = false
  await loadRepos()
  activeRepoId.value = repo.id || activeRepoId.value
}

function buildQuestionPayload(): Partial<QuestionBankQuestionFormDTO> | null {
  const options = splitTextList(questionForm.optionsText).map((label, index) => ({ label, value: String(index + 1) }))
  const needsOptions = ['radio', 'checkbox'].includes(questionForm.type)
  if (needsOptions && options.length < 2) {
    ElMessage.warning('单选/多选题至少需要 2 个选项')
    return null
  }

  let content: Record<string, unknown> | undefined
  if (questionForm.advancedContent.trim()) {
    try {
      const parsed = JSON.parse(questionForm.advancedContent)
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        ElMessage.error('高级 JSON 扩展必须是对象')
        return null
      }
      content = parsed as Record<string, unknown>
    } catch {
      ElMessage.error('高级 JSON 扩展不是合法 JSON')
      return null
    }
  }

  return {
    title: questionForm.title,
    type: questionForm.type,
    stem: questionForm.stem || undefined,
    options: needsOptions ? options : undefined,
    analysis: questionForm.analysis || undefined,
    difficulty: questionForm.difficulty || undefined,
    score: questionForm.score.trim() === '' ? undefined : Number(questionForm.score),
    tags: splitTextList(questionForm.tagsText),
    knowledgePoints: splitTextList(questionForm.knowledgePointsText),
    applicableScenes: splitTextList(questionForm.applicableScenesText),
    correctAnswer: parseJsonMaybe(questionForm.correctAnswerText),
    content
  }
}

async function submitQuestion() {
  if (!activeRepo.value?.id) return
  const payload = buildQuestionPayload()
  if (!payload) return

  if (questionForm.id) {
    await updateBankQuestion(activeRepo.value.id, questionForm.id, payload)
  } else {
    await addBankQuestion(activeRepo.value.id, payload)
  }

  questionDialogVisible.value = false
  await Promise.all([loadRepos(), loadQuestions()])
}

async function removeRepoAction(repo: QuestionBankRepoDTO) {
  await ElMessageBox.confirm(`确认删除题库“${repo.name}”吗？`, '删除题库', { type: 'warning' })
  await deleteRepo(repo.id!)
  if (activeRepoId.value === repo.id) activeRepoId.value = null
  await loadRepos()
}

async function removeQuestionAction(question: QuestionBankQuestionDTO) {
  if (!activeRepo.value?.id || !question.id) return
  await ElMessageBox.confirm(`确认删除题目“${question.title}”吗？`, '删除题目', { type: 'warning' })
  await removeBankQuestion(activeRepo.value.id, question.id)
  await Promise.all([loadRepos(), loadQuestions()])
}

function openImportDialog() {
  if (!activeRepo.value?.id) {
    ElMessage.warning('请先选择题库')
    return
  }
  importMode.value = 'file'
  importFormat.value = 'xlsx'
  selectedFile.value = null
  selectedFileName.value = ''
  importText.value = ''
  importResult.value = null
  fileInputKey.value += 1
  importDialogVisible.value = true
}

function handleFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0] || null
  selectedFile.value = file
  selectedFileName.value = file?.name || ''
}

async function submitImport() {
  if (!activeRepo.value?.id) return
  const result = await importBankQuestions(activeRepo.value.id, {
    format: importFormat.value,
    text: importMode.value === 'text' ? importText.value : undefined,
    file: importMode.value === 'file' ? selectedFile.value : null
  })
  importResult.value = result
  ElMessage.success(`导入完成：成功 ${result.createdCount} 条，失败 ${result.failedCount} 条`)
  await Promise.all([loadRepos(), loadQuestions()])
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

async function handleExport(format: QuestionBankExportFormat) {
  if (!activeRepo.value?.id) return
  const result = await exportRepo(activeRepo.value.id, format, cleanQuery(questionFilters))
  downloadBlob(result.blob, result.filename)
}

function getOptions(question: QuestionBankQuestionDTO) {
  return question.options || question.content?.options || []
}

function formatStem(question: QuestionBankQuestionDTO) {
  const stem = String(question.stem || question.content?.stem || '').trim()
  return stem || '-'
}

function formatOptionCount(question: QuestionBankQuestionDTO) {
  const count = getOptions(question).length
  return count > 0 ? `${count} 项` : '-'
}

function formatOptionPreview(question: QuestionBankQuestionDTO) {
  const labels = getOptions(question).map(option => option.label || option.text || option.value || '').filter(Boolean)
  return labels.length ? labels.slice(0, 3).join(' / ') : '-'
}

function formatDate(value?: string) {
  if (!value) return '-'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString()
}

onMounted(loadRepos)
</script>

<style scoped>
.question-bank-page { display: flex; flex-direction: column; gap: 16px; }
.page-header, .panel-header, .filters, .page-actions, .toolbar-actions, .repo-meta, .switches, .import-mode { display: flex; gap: 12px; }
.page-header, .panel-header { justify-content: space-between; align-items: flex-start; }
.page-header p, .panel-subtitle, .muted { color: #6b7280; }
.workspace { display: grid; grid-template-columns: 420px 1fr; gap: 16px; align-items: start; }
.panel { background: #fff; border: 1px solid #e5e7eb; border-radius: 16px; padding: 16px; box-shadow: 0 10px 30px rgba(15, 23, 42, 0.04); }
.panel-title { font-size: 16px; font-weight: 600; color: #111827; }
.panel-count { color: #6b7280; font-size: 13px; }
.filters { margin: 16px 0; flex-wrap: wrap; }
.repo-table { cursor: pointer; }
.repo-meta { margin-bottom: 16px; flex-wrap: wrap; color: #374151; }
.dialog-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
.full-span { grid-column: 1 / -1; }
.empty { padding: 32px 12px; color: #6b7280; text-align: center; }
.empty-large { min-height: 360px; display: flex; align-items: center; justify-content: center; }
.switches { padding-top: 4px; }
.import-box, .import-result { margin-top: 16px; }
.import-errors { max-height: 160px; overflow: auto; margin-top: 8px; color: #b91c1c; }

@media (max-width: 1180px) {
  .workspace { grid-template-columns: 1fr; }
}

@media (max-width: 760px) {
  .dialog-grid { grid-template-columns: 1fr; }
}
</style>
