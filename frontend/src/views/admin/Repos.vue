<template>
  <div data-testid="admin-repos-page">
    <h3>题库管理</h3>
    <div class="repo-toolbar">
      <el-input
        v-model="newRepoName"
        placeholder="题库名称"
        style="width: 260px"
        data-testid="repo-name-input"
      />
      <el-button type="primary" data-testid="repo-create-button" @click="createRepoAction">
        新建题库
      </el-button>
    </div>
    <el-table :data="repos" v-loading="loading" data-testid="admin-repos-table" @row-click="selectRepo">
      <el-table-column prop="id" label="ID" width="80" />
      <el-table-column label="题库名称">
        <template #default="{ row }">
          <span :data-testid="`repo-name-${row.id}`">{{ row.name }}</span>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="220">
        <template #default="{ row }">
          <el-button
            size="small"
            type="danger"
            :data-testid="`repo-delete-button-${row.id}`"
            @click.stop="removeRepo(row.id)"
          >
            删除
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-drawer
      v-model="drawer"
      :title="activeRepo?.name || '题库'"
      size="50%"
      data-testid="repo-questions-drawer"
    >
      <div class="question-toolbar">
        <el-input
          v-model="newQTitle"
          placeholder="题目标题"
          data-testid="repo-question-title-input"
        />
        <el-select
          v-model="newQType"
          placeholder="题型"
          style="width: 160px"
          data-testid="repo-question-type-select"
        >
          <el-option label="单选" value="radio" />
          <el-option label="多选" value="checkbox" />
          <el-option label="问答" value="textarea" />
        </el-select>
        <el-button type="primary" data-testid="repo-question-add-button" @click="addQuestion">
          添加题目
        </el-button>
      </div>
      <el-table :data="questions" v-loading="qLoading" data-testid="repo-questions-table">
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column label="题目">
          <template #default="{ row }">
            <span :data-testid="`repo-question-title-${row.id}`">{{ row.title }}</span>
          </template>
        </el-table-column>
        <el-table-column label="类型" width="120">
          <template #default="{ row }">
            <span :data-testid="`repo-question-type-${row.id}`">{{ row.type || '-' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120">
          <template #default="{ row }">
            <el-button
              size="small"
              type="danger"
              :data-testid="`repo-question-delete-button-${row.id}`"
              @click="removeQuestion(row.id)"
            >
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
      <div v-if="!qLoading && !questions.length" data-testid="repo-questions-empty">暂无题目</div>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import {
  addBankQuestion,
  createRepo,
  deleteRepo,
  listBankQuestions,
  listRepos,
  removeBankQuestion,
  type QuestionBankQuestionDTO,
  type QuestionBankRepoDTO
} from '@/api/repos'

const repos = ref<QuestionBankRepoDTO[]>([])
const loading = ref(false)
const newRepoName = ref('')

const drawer = ref(false)
const activeRepo = ref<QuestionBankRepoDTO | null>(null)
const questions = ref<QuestionBankQuestionDTO[]>([])
const qLoading = ref(false)
const newQTitle = ref('')
const newQType = ref('radio')

const load = async () => {
  loading.value = true
  try {
    repos.value = await listRepos()
  } finally {
    loading.value = false
  }
}

const createRepoAction = async () => {
  if (!newRepoName.value.trim()) return

  const repo = await createRepo({ name: newRepoName.value })
  repos.value.push(repo)
  newRepoName.value = ''
}

const removeRepo = async (id?: number) => {
  if (id == null) return

  await deleteRepo(id)
  repos.value = repos.value.filter(repo => repo.id !== id)

  if (activeRepo.value?.id === id) {
    activeRepo.value = null
    drawer.value = false
    questions.value = []
  }
}

const selectRepo = async (row: QuestionBankRepoDTO) => {
  if (row.id == null) return

  activeRepo.value = row
  drawer.value = true
  qLoading.value = true
  try {
    questions.value = await listBankQuestions(row.id)
  } finally {
    qLoading.value = false
  }
}

const addQuestion = async () => {
  if (!activeRepo.value?.id || !newQTitle.value.trim()) return

  const question = await addBankQuestion(activeRepo.value.id, {
    title: newQTitle.value,
    type: newQType.value
  })
  questions.value.push(question)
  newQTitle.value = ''
}

const removeQuestion = async (questionId?: number) => {
  if (!activeRepo.value?.id || questionId == null) return

  await removeBankQuestion(activeRepo.value.id, questionId)
  questions.value = questions.value.filter(question => question.id !== questionId)
}

onMounted(load)
</script>

<style scoped>
.repo-toolbar {
  margin-bottom: 12px;
  display: flex;
  gap: 8px;
  align-items: center;
}

.question-toolbar {
  margin-bottom: 10px;
  display: flex;
  gap: 8px;
}
</style>
