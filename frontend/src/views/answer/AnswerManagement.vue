<template>
  <div class="answer-management">
    <!-- 页面头部 -->
    <div class="page-header">
      <h2>问卷答案管理</h2>
      <div class="header-actions">
        <el-button @click="showImportDialog = true" type="primary" icon="Upload">
          批量导入
        </el-button>
        <el-button @click="exportAnswers" type="success" icon="Download">
          导出Excel
        </el-button>
        <el-button @click="downloadAttachments" type="info" icon="FolderOpened">
          下载附件
        </el-button>
      </div>
    </div>

    <!-- 筛选条件 -->
    <div class="filters">
      <el-form :model="queryForm" inline>
        <el-form-item label="创建时间">
          <el-date-picker
            v-model="dateRange"
            type="datetimerange"
            range-separator="至"
            start-placeholder="开始时间"
            end-placeholder="结束时间"
            @change="handleDateChange"
          />
        </el-form-item>
        <el-form-item label="创建人">
          <el-input 
            v-model="queryForm.createBy" 
            placeholder="输入创建人ID"
            clearable
          />
        </el-form-item>
        <el-form-item>
          <el-button @click="loadAnswers" type="primary">查询</el-button>
          <el-button @click="resetQuery">重置</el-button>
        </el-form-item>
      </el-form>
    </div>

    <!-- 统计信息 -->
    <div class="statistics">
      <el-row :gutter="16">
        <el-col :span="6">
          <el-card>
            <div class="stat-item">
              <div class="stat-number">{{ totalCount }}</div>
              <div class="stat-label">总答案数</div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card>
            <div class="stat-item">
              <div class="stat-number">{{ todayCount }}</div>
              <div class="stat-label">今日新增</div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card>
            <div class="stat-item">
              <div class="stat-number">{{ avgScore.toFixed(1) }}</div>
              <div class="stat-label">平均分</div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card>
            <div class="stat-item">
              <div class="stat-number">{{ attachmentCount }}</div>
              <div class="stat-label">附件总数</div>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <!-- 答案列表 -->
    <div class="answer-list">
      <el-table 
        :data="answers" 
        :loading="loading"
        v-loading="loading"
        stripe
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="55" />
        <el-table-column prop="id" label="答案ID" width="200" />
        <el-table-column prop="createByName" label="创建人" width="120">
          <template #default="{ row }">
            <span>{{ row.createByName || '匿名用户' }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="createAt" label="创建时间" width="180">
          <template #default="{ row }">
            <span>{{ formatDate(row.createAt) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="examScore" label="考试得分" width="100">
          <template #default="{ row }">
            <el-tag v-if="row.examScore !== undefined" :type="getScoreType(row.examScore)">
              {{ row.examScore?.toFixed(1) }}分
            </el-tag>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column prop="rank" label="排名" width="80">
          <template #default="{ row }">
            <el-tag v-if="row.rank" type="warning">第{{ row.rank }}名</el-tag>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column prop="attachment" label="附件" width="100">
          <template #default="{ row }">
            <el-badge :value="row.attachment?.length || 0" type="info">
              <el-button 
                v-if="row.attachment?.length" 
                @click="downloadAnswerAttachment(row.id)"
                type="text" 
                size="small"
              >
                附件
              </el-button>
              <span v-else>无附件</span>
            </el-badge>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200">
          <template #default="{ row }">
            <el-button @click="viewAnswer(row)" type="text" size="small">
              查看
            </el-button>
            <el-button @click="editAnswer(row)" type="text" size="small">
              编辑
            </el-button>
            <el-button 
              @click="deleteAnswer(row.id)" 
              type="text" 
              size="small"
              style="color: #f56c6c"
            >
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination">
        <el-pagination
          v-model:current-page="queryForm.current"
          v-model:page-size="queryForm.pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="totalCount"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="loadAnswers"
          @current-change="loadAnswers"
        />
      </div>
    </div>

    <!-- 批量操作 -->
    <div v-if="selectedAnswers.length > 0" class="batch-actions">
      <el-button @click="batchExport" type="primary">
        批量导出 ({{ selectedAnswers.length }})
      </el-button>
      <el-button @click="batchDelete" type="danger">
        批量删除 ({{ selectedAnswers.length }})
      </el-button>
      <el-button @click="batchDownloadAttachments" type="info">
        批量下载附件 ({{ selectedAnswers.length }})
      </el-button>
    </div>

    <!-- 导入对话框 -->
    <el-dialog v-model="showImportDialog" title="批量导入答案" width="500px">
      <el-upload
        ref="uploadRef"
        :auto-upload="false"
        :show-file-list="true"
        accept=".xlsx,.xls"
        :on-change="handleFileChange"
      >
        <el-button type="primary" icon="Plus">选择Excel文件</el-button>
        <template #tip>
          <div class="el-upload__tip">
            支持.xlsx、.xls格式，第一行为表头
          </div>
        </template>
      </el-upload>
      
      <template #footer>
        <el-button @click="showImportDialog = false">取消</el-button>
        <el-button @click="handleImport" type="primary" :loading="importing">
          导入
        </el-button>
      </template>
    </el-dialog>

    <!-- 答案详情对话框 -->
    <el-dialog v-model="showAnswerDialog" :title="currentAnswer ? '答案详情' : '编辑答案'" width="800px">
      <div v-if="currentAnswer" class="answer-detail">
        <div class="answer-header">
          <h3>{{ currentAnswer.id }}</h3>
          <div class="answer-meta">
            <el-tag>创建人: {{ currentAnswer.createByName || '匿名' }}</el-tag>
            <el-tag type="info">创建时间: {{ formatDate(currentAnswer.createAt) }}</el-tag>
            <el-tag v-if="currentAnswer.examScore !== undefined" :type="getScoreType(currentAnswer.examScore)">
              得分: {{ currentAnswer.examScore.toFixed(1) }}
            </el-tag>
          </div>
        </div>
        
        <div class="answer-content">
          <h4>答案内容:</h4>
          <pre>{{ JSON.stringify(currentAnswer.answer, null, 2) }}</pre>
        </div>
        
        <div v-if="currentAnswer.attachment?.length" class="answer-attachments">
          <h4>附件列表:</h4>
          <el-list>
            <el-list-item v-for="file in currentAnswer.attachment" :key="file.id">
              <el-link @click="downloadFile(file)" type="primary">
                {{ file.originalName }}
              </el-link>
            </el-list-item>
          </el-list>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
// 暂时注释Element Plus导入，避免依赖问题
// import { ElMessage, ElMessageBox } from 'element-plus'
import { listAnswers, deleteAnswers } from '@/api/surveyAnswers'
import type { Answer } from '@/types/answer'

// 临时替代Element Plus的Message和MessageBox
const ElMessage = {
  success: (msg: string) => alert('成功: ' + msg),
  warning: (msg: string) => alert('警告: ' + msg),
  info: (msg: string) => alert('信息: ' + msg),
  error: (msg: string) => alert('错误: ' + msg)
}

const ElMessageBox = {
  confirm: (msg: string, title: string, options?: any) => {
    return new Promise((resolve, reject) => {
      if (confirm(msg)) {
        resolve(true)
      } else {
        reject()
      }
    })
  }
}

// Props
interface Props {
  projectId: string
}

const props = defineProps<Props>()

// 答案服务
const { 
  loading, 
  error,
  listAnswers, 
  getAnswer, 
  saveAnswer, 
  count, 
  deleteAnswers,
  exportSurvey,
  downloadAttachment,
  uploadAnswers,
  computeExamScore
} = useAnswerService()

// 响应式数据
const answers = ref<AnswerView[]>([])
const totalCount = ref(0)
const todayCount = ref(0)
const selectedAnswers = ref<AnswerView[]>([])
const showImportDialog = ref(false)
const showAnswerDialog = ref(false)
const currentAnswer = ref<AnswerView | null>(null)
const importing = ref(false)
const uploadFile = ref<File | null>(null)
const dateRange = ref<[Date, Date] | null>(null)

// 查询表单
const queryForm = reactive<AnswerQuery>({
  current: 1,
  pageSize: 20,
  projectId: props.projectId
})

// 计算属性
const avgScore = computed(() => {
  const validScores = answers.value
    .filter(a => a.examScore !== undefined)
    .map(a => a.examScore!)
  return validScores.length > 0 
    ? validScores.reduce((sum, score) => sum + score, 0) / validScores.length 
    : 0
})

const attachmentCount = computed(() => {
  return answers.value.reduce((count, answer) => {
    return count + (answer.attachment?.length || 0)
  }, 0)
})

// 生命周期
onMounted(() => {
  loadAnswers()
  loadTodayCount()
})

// 方法
const loadAnswers = async () => {
  const result = await listAnswers(queryForm)
  if (result) {
    answers.value = result.list
    totalCount.value = result.total
  }
}

const loadTodayCount = async () => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  
  const todayQuery = {
    projectId: props.projectId,
    startTime: today,
    endTime: tomorrow
  }
  
  const result = await count(todayQuery)
  if (result !== null) {
    todayCount.value = result
  }
}

const handleDateChange = (dates: [Date, Date] | null) => {
  if (dates) {
    queryForm.startTime = dates[0]
    queryForm.endTime = dates[1]
  } else {
    delete queryForm.startTime
    delete queryForm.endTime
  }
}

const resetQuery = () => {
  Object.assign(queryForm, {
    current: 1,
    pageSize: 20,
    projectId: props.projectId
  })
  dateRange.value = null
  loadAnswers()
}

const handleSelectionChange = (selection: AnswerView[]) => {
  selectedAnswers.value = selection
}

const viewAnswer = async (answer: AnswerView) => {
  const result = await getAnswer({ id: answer.id, rankEnabled: true })
  if (result) {
    currentAnswer.value = result
    showAnswerDialog.value = true
  }
}

const editAnswer = (answer: AnswerView) => {
  // 实现编辑逻辑
  ElMessage.info('编辑功能待实现')
}

const deleteAnswer = async (id: string) => {
  try {
    await ElMessageBox.confirm('确定要删除这个答案吗？', '确认删除', {
      type: 'warning'
    })
    
    const result = await deleteAnswers([id])
    if (result !== null) {
      ElMessage.success('删除成功')
      loadAnswers()
    }
  } catch {
    // 用户取消
  }
}

const exportAnswers = async () => {
  const ids = selectedAnswers.value.length > 0 
    ? selectedAnswers.value.map(a => a.id)
    : undefined
    
  const result = await exportSurvey({
    projectId: props.projectId,
    ids,
    startTime: queryForm.startTime,
    endTime: queryForm.endTime
  })
  
  if (result) {
    const url = URL.createObjectURL(result)
    const a = document.createElement('a')
    a.href = url
    a.download = `问卷答案_${new Date().toISOString().split('T')[0]}.xlsx`
    a.click()
    URL.revokeObjectURL(url)
    ElMessage.success('导出成功')
  }
}

const downloadAttachments = async () => {
  const ids = selectedAnswers.value.length > 0 
    ? selectedAnswers.value.map(a => a.id)
    : undefined
    
  const result = await downloadAttachment({
    projectId: props.projectId,
    ids,
    startTime: queryForm.startTime,
    endTime: queryForm.endTime
  })
  
  if (result) {
    const url = URL.createObjectURL(result)
    const a = document.createElement('a')
    a.href = url
    a.download = `问卷附件_${new Date().toISOString().split('T')[0]}.zip`
    a.click()
    URL.revokeObjectURL(url)
    ElMessage.success('下载成功')
  }
}

const downloadAnswerAttachment = async (answerId: string) => {
  const result = await downloadAttachment({
    projectId: props.projectId,
    answerId
  })
  
  if (result) {
    const url = URL.createObjectURL(result)
    const a = document.createElement('a')
    a.href = url
    a.download = `答案附件_${answerId}.zip`
    a.click()
    URL.revokeObjectURL(url)
    ElMessage.success('下载成功')
  }
}

const handleFileChange = (file: any) => {
  uploadFile.value = file.raw
}

const handleImport = async () => {
  if (!uploadFile.value) {
    ElMessage.warning('请选择文件')
    return
  }
  
  importing.value = true
  try {
    const result = await uploadAnswers(uploadFile.value, props.projectId)
    if (result !== null) {
      ElMessage.success('导入成功')
      showImportDialog.value = false
      loadAnswers()
    }
  } finally {
    importing.value = false
  }
}

const batchExport = () => {
  exportAnswers()
}

const batchDelete = async () => {
  try {
    await ElMessageBox.confirm(
      `确定要删除选中的 ${selectedAnswers.value.length} 个答案吗？`, 
      '确认批量删除', 
      { type: 'warning' }
    )
    
    const ids = selectedAnswers.value.map(a => a.id)
    const result = await deleteAnswers(ids)
    if (result !== null) {
      ElMessage.success('删除成功')
      selectedAnswers.value = []
      loadAnswers()
    }
  } catch {
    // 用户取消
  }
}

const batchDownloadAttachments = () => {
  downloadAttachments()
}

const downloadFile = (file: any) => {
  if (file.url) {
    window.open(file.url, '_blank')
  } else {
    ElMessage.warning('文件链接不可用')
  }
}

const formatDate = (date: string | Date) => {
  return new Date(date).toLocaleString('zh-CN')
}

const getScoreType = (score: number) => {
  if (score >= 90) return 'success'
  if (score >= 70) return 'warning'
  return 'danger'
}
</script>

<style scoped>
.answer-management {
  padding: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.page-header h2 {
  margin: 0;
  color: #333;
}

.filters {
  background: #f8f9fa;
  padding: 15px;
  border-radius: 8px;
  margin-bottom: 20px;
}

.statistics {
  margin-bottom: 20px;
}

.stat-item {
  text-align: center;
  padding: 10px;
}

.stat-number {
  font-size: 24px;
  font-weight: bold;
  color: #409EFF;
}

.stat-label {
  font-size: 14px;
  color: #666;
  margin-top: 5px;
}

.answer-list {
  background: white;
  border-radius: 8px;
  overflow: hidden;
}

.pagination {
  padding: 20px;
  text-align: center;
  background: #f8f9fa;
}

.batch-actions {
  position: fixed;
  bottom: 20px;
  right: 20px;
  background: white;
  padding: 15px;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  z-index: 100;
}

.answer-detail {
  max-height: 600px;
  overflow-y: auto;
}

.answer-header {
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 1px solid #eee;
}

.answer-meta {
  margin-top: 10px;
}

.answer-meta .el-tag {
  margin-right: 10px;
}

.answer-content {
  margin-bottom: 20px;
}

.answer-content pre {
  background: #f5f5f5;
  padding: 15px;
  border-radius: 4px;
  font-size: 12px;
  max-height: 300px;
  overflow-y: auto;
}

.answer-attachments h4 {
  margin-bottom: 10px;
}
</style>