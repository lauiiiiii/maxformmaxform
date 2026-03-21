<template>
  <div class="answers-dashboard">
    <aside class="dashboard-sidebar">
      <div class="sidebar-header">
        <span class="sidebar-icon">📋</span>
        <span class="sidebar-title">答卷中心</span>
      </div>
      <nav class="sidebar-nav">
        <button
          v-for="item in sidebarItems"
          :key="item.key"
          :class="['sidebar-link', { active: currentSection === item.key }]"
          @click="currentSection = item.key"
        >
          <span class="link-icon">{{ item.icon }}</span>
          <span>{{ item.label }}</span>
        </button>
      </nav>
      <div class="sidebar-footer">
        <p>收集周期</p>
        <strong>{{ collectionRange }}</strong>
        <p class="meta">已收集 {{ stats.total }} 份</p>
      </div>
    </aside>

    <main class="dashboard-main">
      <section v-if="currentSection === 'summary'" class="summary-section">
        <div class="summary-metrics">
          <div v-for="item in summaryHighlights" :key="item.label" class="summary-metric">
            <p class="metric-label">{{ item.label }}</p>
            <p class="metric-value">
              <span class="metric-number">{{ item.value }}</span>
              <small v-if="item.suffix">{{ item.suffix }}</small>
            </p>
          </div>
        </div>

        <div class="summary-card summary-chart">
          <header class="summary-card-header">
            <div>
              <h2>收集趋势图</h2>
              <p>近30日每日收集数据变化情况</p>
            </div>
            <button class="header-link">导出数据</button>
          </header>
          <div class="summary-card-body">
            <div class="chart-placeholder area">折线图占位（集成 ECharts 折线/区域图）</div>
          </div>
        </div>

        <div class="summary-bottom">
          <div class="summary-card map-card">
            <header class="summary-card-header">
              <div>
                <h2>地域分布</h2>
                <p>按省份统计答卷来源</p>
              </div>
              <button class="header-link">查看详细</button>
            </header>
            <div class="summary-card-body">
              <div class="chart-placeholder map">中国地图占位</div>
            </div>
          </div>
          <div class="summary-card system-card">
            <header class="summary-card-header">
              <div>
                <h2>系统环境</h2>
                <p>答卷设备与系统分布概览</p>
              </div>
              <div class="system-tabs">
                <button
                  v-for="tab in systemTabs"
                  :key="tab"
                  :class="['system-tab', { active: activeSystemTab === tab }]"
                  @click="activeSystemTab = tab"
                >
                  {{ tab }}
                </button>
              </div>
            </header>
            <div class="summary-card-body">
              <div class="chart-placeholder bar">柱状图占位</div>
              <ul class="system-list">
                <li v-for="item in currentSystemStats" :key="item.label">
                  <span>{{ item.label }}</span>
                  <strong>{{ item.value }}</strong>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section v-else-if="currentSection === 'analysis'" class="analysis-section">
        <header class="analysis-header">
          <div>
            <h2>题目统计分析</h2>
            <p>针对每道题生成详细的选项分布、平均分与有效样本数据。</p>
          </div>
          <div class="analysis-tools">
            <div class="view-toggle">
              <button
                v-for="mode in analysisViewModes"
                :key="mode"
                :class="['view-mode-btn', { active: activeViewMode === mode }]"
                type="button"
                @click="activeViewMode = mode"
              >
                {{ mode }}
              </button>
            </div>
          </div>
        </header>

        <div v-if="analysisQuestions.length" class="analysis-list">
          <article
            v-for="(question, index) in analysisQuestions"
            :key="question.questionId"
            class="question-analytics"
          >
            <header class="question-analytics__header">
              <div class="question-title-block">
                <span class="badge">第{{ index + 1 }}题</span>
                <div class="title-group">
                  <h3>{{ question.questionTitle }}</h3>
                  <span class="type">{{ question.questionTypeLabel }}</span>
                </div>
              </div>
            </header>
            <div v-if="question.type === 'choice'" class="question-table">
              <div class="table-head">
                <span class="col-option">选项</span>
                <span class="col-count">小计</span>
                <span class="col-ratio">比例</span>
              </div>
              <div
                v-for="(option, idx) in question.options || []"
                :key="idx"
                class="table-row"
              >
                <span class="col-option">{{ option.label }}</span>
                <span class="col-count">{{ formatNumber(option.count) }}</span>
                <span class="col-ratio">
                  <span class="ratio-value">{{ formatPercent(option.percentage) }}</span>
                  <span class="ratio-bar">
                    <span
                      class="ratio-fill"
                      :style="{ width: clampPercent(option.percentage), background: barPalette[idx % barPalette.length] }"
                    ></span>
                  </span>
                </span>
              </div>
            </div>

            <div v-else-if="question.type === 'rating'" class="question-rating">
              <div class="rating-score">
                <span class="value">{{ formatScore(question.avgScore) }}</span>
                <span class="label">平均分</span>
              </div>
              <ul class="rating-distribution">
                <li v-for="star in 5" :key="star">
                  <span class="star-label">{{ star }} 星</span>
                  <div class="progress">
                    <div
                      class="progress-bar"
                      :style="{ width: clampPercent(question.distribution?.[star] || 0), background: '#f59e0b' }"
                    ></div>
                  </div>
                  <span class="option-value">{{ formatPercent(question.distribution?.[star] || 0) }}</span>
                </li>
              </ul>
            </div>

            <div v-else class="question-text">
              <p>暂不支持该题型的图表分析，可查看原始答卷了解详情。</p>
            </div>

          </article>
        </div>
        <div v-else class="empty-state">
          <h3>暂无题目数据</h3>
          <p>待有用户提交答卷后，将自动生成题目洞察。</p>
        </div>
      </section>

      <section v-else-if="currentSection === 'download'" class="download-panel">
        <div class="download-grid">
          <div class="download-card">
            <div class="card-icon">📋</div>
            <h3>答案列表</h3>
            <p>查看与筛选所有问卷答案，支持按字段导出。</p>
            <button class="btn primary" @click="viewAnswers">查看答卷</button>
          </div>
          <div class="download-card">
            <div class="card-icon">📥</div>
            <h3>数据导出</h3>
            <p>一键导出 Excel / CSV 数据，便于在外部分析。</p>
            <button class="btn ghost" @click="exportData">导出数据</button>
          </div>
          <div class="download-card">
            <div class="card-icon">📁</div>
            <h3>附件下载</h3>
            <p>批量打包问卷附件，快速完成归档与审核。</p>
            <button class="btn ghost" @click="downloadFiles">下载附件</button>
          </div>
        </div>
      </section>

      <section v-else class="advanced-panel">
        <div class="advanced-card">
          <h3>自定义查询</h3>
          <p>设置筛选条件快速定位目标受访者。</p>
          <div class="query-row">
            <select class="input">
              <option>题目</option>
              <option>渠道</option>
              <option>时间</option>
            </select>
            <select class="input">
              <option>包含</option>
              <option>等于</option>
              <option>大于</option>
            </select>
            <input class="input" placeholder="输入值" />
            <button class="btn ghost">添加条件</button>
          </div>
          <div class="advanced-actions">
            <button class="btn primary">执行查询</button>
            <button class="btn ghost">保存模板</button>
          </div>
        </div>

        <div class="advanced-card">
          <h3>SPSS 高级分析</h3>
          <p>导出数据至 SPSS 或下载语法文件，满足深度分析需求。</p>
          <div class="advanced-actions">
            <button class="btn primary">导出数据 (.sav)</button>
            <button class="btn ghost">导出语法 (.sps)</button>
          </div>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { getResults as getSurveyStatistics } from '@/api/surveys'

type QuestionType = 'choice' | 'text' | 'rating' | 'other'
type SectionKey = 'summary' | 'analysis' | 'download' | 'advanced'
type SystemTab = '设备' | '浏览器' | '操作系统'
type AnalysisViewMode = '表格' | '明细' | '饼状' | '条形' | '折线'

interface AnswerStats {
  total: number
  today: number
  avgScore: number
  completionRate?: number
  completed?: number
  incomplete?: number
  avgTime?: string
  pageViews?: number
  avgDuration?: string
}

interface QuestionOption {
  label: string
  count: number
  percentage: number
}

interface CategoryStatItem {
  questionId: string | number
  questionTitle: string
  questionTypeLabel: string
  type: QuestionType
  isRadio?: boolean
  options?: QuestionOption[]
  sampleAnswers?: string[]
  totalAnswers?: number
  avgScore?: number | string
  distribution?: Record<number, number>
}

const props = withDefaults(defineProps<{
  stats?: AnswerStats
  surveyId?: string
  questions?: any[]
  surveyTitle?: string
  collectionRange?: string
}>(), {
  stats: () => ({
    total: 126,
    today: 8,
    avgScore: 87.5,
    completionRate: 88.9,
    completed: 112,
    incomplete: 14,
    avgTime: '3分28秒',
    pageViews: 885,
    avgDuration: "03'28\""
  }),
  questions: () => [],
  surveyTitle: '用户满意度调查',
  collectionRange: '2025-09-01 至 2025-10-08'
})

const currentSection = ref<SectionKey>('summary')
const realStatisticsData = ref<any>(null)
const isLoading = ref(false)
const activeSystemTab = ref<SystemTab>('设备')
const activeViewMode = ref<AnalysisViewMode>('表格')

const sidebarItems: Array<{ key: SectionKey; label: string; icon: string }> = [
  { key: 'summary', label: '答卷概览', icon: '📋' },
  { key: 'analysis', label: '统计&分析', icon: '📈' },
  { key: 'download', label: '查看下载答卷', icon: '📥' },
  { key: 'advanced', label: '高级工具', icon: '🧮' }
]

const barPalette = ['#2563eb', '#22c55e', '#f97316', '#a855f7', '#ef4444']
const systemTabs: SystemTab[] = ['设备', '浏览器', '操作系统']
const analysisViewModes: AnalysisViewMode[] = ['表格', '明细', '饼状', '条形', '折线']

const surveyTitle = computed(() => props.surveyTitle)
const stats = computed(() => props.stats)
const collectionRange = computed(() => props.collectionRange)

const summaryHighlights = computed(() => {
  const statValue = stats.value
  const completionRate = Number.isFinite(statValue.completionRate)
    ? Number(statValue.completionRate)
    : 0
  const completed = statValue.completed ?? Math.round((completionRate / 100) * statValue.total)

  return [
    {
      label: '今日新增',
      value: formatNumber(statValue.today)
    },
    {
      label: '数据总量',
      value: formatNumber(statValue.total)
    },
    {
      label: '总完成数',
      value: formatNumber(completed)
    },
    {
      label: '总完成率',
      value: completionRate.toFixed(0),
      suffix: '%'
    },
    {
      label: '平均答题时长',
      value: statValue.avgDuration || statValue.avgTime || '—'
    }
  ]
})

const systemStatsData = computed<Record<SystemTab, Array<{ label: string; value: string }>>>(() => {
  if (realStatisticsData.value?.systemStats) {
    return realStatisticsData.value.systemStats
  }

  return {
    设备: [
      { label: '移动设备', value: '167' },
      { label: '计算机', value: '45' }
    ],
    浏览器: [
      { label: 'Chrome', value: '138' },
      { label: 'Safari', value: '62' },
      { label: 'Edge', value: '44' }
    ],
    操作系统: [
      { label: 'iOS', value: '120' },
      { label: 'Android', value: '98' },
      { label: 'Windows', value: '74' },
      { label: 'macOS', value: '36' }
    ]
  }
})

const currentSystemStats = computed(() => systemStatsData.value[activeSystemTab.value])

const categoryStats = computed<CategoryStatItem[]>(() => {
  if (realStatisticsData.value?.questionStats?.length) {
    return realStatisticsData.value.questionStats
      .map((stat: any) => normalizeQuestionStat(stat))
      .filter(Boolean)
  }

  if (props.questions?.length) {
    return props.questions
      .map((q, index) => normalizeFromQuestion(q, index))
      .filter(Boolean) as CategoryStatItem[]
  }

  return generateMockStats()
})

const analysisQuestions = computed<CategoryStatItem[]>(() => categoryStats.value)

function formatNumber(value?: number | null): string {
  if (value === undefined || value === null || Number.isNaN(Number(value))) return '—'
  return new Intl.NumberFormat('zh-CN').format(Number(value))
}

function formatPercent(value?: number | string): string {
  const num = Number(value)
  if (!Number.isFinite(num)) return '0.00%'
  return `${num.toFixed(2)}%`
}

function clampPercent(value?: number | string): string {
  const num = Number(value)
  if (!Number.isFinite(num)) return '0%'
  return `${Math.max(0, Math.min(100, num))}%`
}

function formatScore(value?: number | string): string {
  const num = Number(value)
  if (!Number.isFinite(num)) return '—'
  return num.toFixed(2)
}

function normalizeQuestionStat(stat: any): CategoryStatItem | null {
  const typeLabel = getQuestionTypeLabel(stat.type)

  if (stat.type === 'radio' || stat.type === 'checkbox') {
    return {
      questionId: stat.questionId,
      questionTitle: stat.questionTitle,
      questionTypeLabel: typeLabel,
      type: 'choice',
      isRadio: stat.type === 'radio',
      options: stat.options || []
    }
  }

  if (stat.type === 'input' || stat.type === 'textarea') {
    return {
      questionId: stat.questionId,
      questionTitle: stat.questionTitle,
      questionTypeLabel: typeLabel,
      type: 'text',
      sampleAnswers: stat.sampleAnswers || [],
      totalAnswers: stat.totalAnswers || 0
    }
  }

  if (stat.type === 'rating' || stat.type === 'scale') {
    return {
      questionId: stat.questionId,
      questionTitle: stat.questionTitle,
      questionTypeLabel: typeLabel,
      type: 'rating',
      avgScore: stat.avgScore || 0,
      distribution: stat.distribution || {}
    }
  }

  return null
}

function normalizeFromQuestion(question: any, index: number): CategoryStatItem | null {
  const typeLabel = getQuestionTypeLabel(question.type)

  if (question.type === 'radio' || question.type === 'checkbox') {
    const options = generateOptionStats(question.options || [], question.type === 'radio')
    return {
      questionId: question.id,
      questionTitle: question.title || `题目 ${index + 1}`,
      questionTypeLabel: typeLabel,
      type: 'choice',
      isRadio: question.type === 'radio',
      options
    }
  }

  if (question.type === 'input' || question.type === 'textarea') {
    return {
      questionId: question.id,
      questionTitle: question.title || `题目 ${index + 1}`,
      questionTypeLabel: typeLabel,
      type: 'text',
      sampleAnswers: generateSampleAnswers(),
      totalAnswers: Math.floor(Math.random() * 100) + 50
    }
  }

  if (question.type === 'rating' || question.type === 'scale') {
    return {
      questionId: question.id,
      questionTitle: question.title || `题目 ${index + 1}`,
      questionTypeLabel: typeLabel,
      type: 'rating',
      avgScore: (Math.random() * 2 + 3).toFixed(1),
      distribution: {
        5: Math.floor(Math.random() * 30) + 20,
        4: Math.floor(Math.random() * 30) + 20,
        3: Math.floor(Math.random() * 20) + 10,
        2: Math.floor(Math.random() * 10) + 5,
        1: Math.floor(Math.random() * 10) + 5
      }
    }
  }

  return null
}

function generateMockStats(): CategoryStatItem[] {
  return [
    {
      questionId: 'mock-1',
      questionTitle: '您对我们的服务总体满意度如何？',
      questionTypeLabel: '单选题',
      type: 'choice',
      isRadio: true,
      options: [
        { label: '非常满意', count: 57, percentage: 45 },
        { label: '满意', count: 44, percentage: 35 },
        { label: '一般', count: 19, percentage: 15 },
        { label: '不满意', count: 6, percentage: 5 }
      ]
    },
    {
      questionId: 'mock-2',
      questionTitle: '您最关注哪些改进方向？（多选）',
      questionTypeLabel: '多选题',
      type: 'choice',
      isRadio: false,
      options: [
        { label: '产品设计', count: 88, percentage: 70 },
        { label: '功能改进', count: 69, percentage: 55 },
        { label: '加速流程', count: 50, percentage: 40 },
        { label: '客服响应', count: 38, percentage: 30 }
      ]
    }
  ]
}

function generateOptionStats(options: any[], isRadio: boolean): QuestionOption[] {
  const total = props.stats.total
  let remaining = 100

  return options.map((opt, index) => {
    const isLast = index === options.length - 1
    let percentage = isLast ? remaining : Math.floor(Math.random() * (remaining / (options.length - index) + 10))

    if (isRadio && isLast) {
      percentage = remaining
    } else if (!isRadio) {
      percentage = Math.floor(Math.random() * 60) + 10
    }

    remaining = Math.max(0, remaining - percentage)
    const count = Math.round((percentage / 100) * total)

    return {
      label: typeof opt === 'string' ? opt : opt.label || `选项${index + 1}`,
      count,
      percentage
    }
  })
}

function generateSampleAnswers(): string[] {
  const samples = [
    '希望增加更多功能',
    '界面很友好',
    '速度可以再快一点',
    '整体体验不错',
    '客服很专业',
    '价格合理',
    '操作简单易用',
    '还有改进空间'
  ]
  return samples.sort(() => Math.random() - 0.5).slice(0, 5)
}

function getQuestionTypeLabel(type: string): string {
  const typeMap: Record<string, string> = {
    radio: '单选题',
    checkbox: '多选题',
    input: '填空题',
    textarea: '多行填空',
    rating: '评分题',
    scale: '量表题',
    date: '日期题',
    upload: '上传题',
    ranking: '排序题'
  }
  return typeMap[type] || '其他'
}

const viewAnswers = () => {
  alert('查看答卷功能占位：展示答案列表，可筛选导出。')
}

const exportData = () => {
  alert('数据导出功能占位：将答卷导出为 Excel / CSV。')
}

const downloadFiles = () => {
  alert('附件下载功能占位：批量打包问卷附件。')
}

async function fetchRealStatistics() {
  if (!props.surveyId) return
  isLoading.value = true

  try {
    const data = await getSurveyStatistics(props.surveyId)
    realStatisticsData.value = data
  } catch (error) {
    console.warn('加载统计数据失败，降级为默认数据', error)
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  fetchRealStatistics()
})
</script>

<style scoped>
.answers-dashboard {
  display: grid;
  grid-template-columns: 240px 1fr;
  background: #f5f7fb;
  min-height: calc(100vh - 120px);
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 12px 40px rgba(15, 23, 42, 0.08);
}

.dashboard-sidebar {
  display: flex;
  flex-direction: column;
  background: linear-gradient(180deg, #f8fafc 0%, #edf2f7 100%);
  border-right: 1px solid rgba(148, 163, 184, 0.2);
  padding: 24px 20px;
  gap: 24px;
}

.sidebar-header {
  display: flex;
  align-items: center;
  gap: 12px;
  font-weight: 600;
  font-size: 16px;
  color: #1e293b;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.2);
}

.sidebar-icon {
  font-size: 24px;
}

.sidebar-nav {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.sidebar-link {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 10px;
  background: transparent;
  border: none;
  font-size: 14px;
  color: #475569;
  text-align: left;
  cursor: pointer;
  transition: all 0.2s ease;
}

.sidebar-link:hover,
.sidebar-link.active {
  background: rgba(59, 130, 246, 0.12);
  color: #1d4ed8;
  font-weight: 600;
}

.link-icon {
  font-size: 18px;
}

.sidebar-footer {
  margin-top: auto;
  padding: 16px;
  border-radius: 12px;
  background: rgba(148, 163, 184, 0.12);
  font-size: 13px;
  color: #475569;
  line-height: 1.5;
}

.sidebar-footer strong {
  display: block;
  font-size: 15px;
  color: #1e293b;
  margin: 4px 0;
}

.sidebar-footer .meta {
  color: #64748b;
}

.dashboard-main {
  display: flex;
  flex-direction: column;
  padding: 32px 36px;
  gap: 32px;
  background: #ffffff;
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 24px;
}

.header-info h1 {
  font-size: 26px;
  font-weight: 700;
  color: #0f172a;
  margin-bottom: 8px;
}

.header-meta {
  font-size: 14px;
  color: #64748b;
}

.header-meta strong {
  color: #0f172a;
  font-weight: 600;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 20px;
  border-radius: 10px;
  border: none;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn.primary {
  background: linear-gradient(135deg, #2563eb, #1d4ed8);
  color: #fff;
  box-shadow: 0 8px 20px rgba(37, 99, 235, 0.25);
}

.btn.primary:hover {
  filter: brightness(1.05);
}

.btn.ghost {
  background: rgba(37, 99, 235, 0.08);
  color: #1d4ed8;
}

.btn.ghost:hover {
  background: rgba(37, 99, 235, 0.15);
}

.summary-metrics {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 18px;
}

.summary-metric {
  background: #f8fafc;
  border: 1px solid rgba(226, 232, 240, 0.9);
  border-radius: 14px;
  padding: 16px 18px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-height: 88px;
}

.metric-label {
  font-size: 13px;
  color: #64748b;
}

.metric-value {
  display: flex;
  align-items: baseline;
  gap: 6px;
  font-weight: 700;
  color: #0f172a;
  font-size: 26px;
}

.metric-number {
  line-height: 1.1;
}

.metric-hint {
  font-size: 12px;
  color: #94a3b8;
}

.charts-grid {
  display: grid;
  grid-template-columns: 1.6fr 1fr;
  gap: 24px;
}

.chart-card {
  background: #ffffff;
  border-radius: 18px;
  border: 1px solid rgba(226, 232, 240, 0.9);
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.06);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.chart-card.large {
  min-height: 320px;
}

.chart-card.small {
  min-height: 210px;
}

.chart-column {
  display: grid;
  gap: 24px;
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px 0;
}

.chart-header h2,
.chart-header h3 {
  margin: 0;
  font-weight: 600;
  color: #0f172a;
}

.chart-header p {
  margin: 4px 0 0;
  font-size: 12px;
  color: #94a3b8;
}

.chart-body {
  padding: 20px 24px 24px;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.chart-placeholder {
  flex: 1;
  min-height: 200px;
  border-radius: 14px;
  border: 2px dashed rgba(148, 163, 184, 0.35);
  display: grid;
  place-items: center;
  color: #cbd5f5;
  font-size: 14px;
}

.chart-placeholder.ring {
  min-height: 140px;
}

.legend {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
  font-size: 13px;
  color: #475569;
}

.legend li {
  display: flex;
  align-items: center;
  gap: 8px;
}

.legend .dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.legend-value {
  margin-left: auto;
  color: #1e293b;
  font-weight: 600;
}

.header-link {
  background: none;
  border: none;
  padding: 0;
  font-size: 13px;
  color: #2563eb;
  cursor: pointer;
}

.summary-section {
  display: flex;
  flex-direction: column;
  gap: 28px;
}

.summary-card {
  background: #ffffff;
  border: 1px solid rgba(226, 232, 240, 0.9);
  border-radius: 18px;
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.05);
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.summary-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
}

.summary-card-header h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #0f172a;
}

.summary-card-header p {
  margin: 4px 0 0;
  font-size: 12px;
  color: #94a3b8;
}

.summary-card-body {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.summary-card.summary-chart {
  gap: 16px;
}

.summary-bottom {
  display: grid;
  grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr);
  gap: 24px;
}

.chart-placeholder.area {
  min-height: 260px;
}

.chart-placeholder.map {
  min-height: 240px;
}

.chart-placeholder.bar {
  min-height: 150px;
}

.system-tabs {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: rgba(37, 99, 235, 0.08);
  padding: 4px;
  border-radius: 999px;
}

.system-tab {
  border: none;
  background: transparent;
  padding: 6px 14px;
  border-radius: 999px;
  font-size: 12px;
  color: #1d4ed8;
  cursor: pointer;
  transition: all 0.2s ease;
}

.system-tab.active {
  background: #ffffff;
  color: #1d4ed8;
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.24);
}

.system-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
  font-size: 13px;
  color: #475569;
}

.system-list li {
  display: flex;
  justify-content: space-between;
}

.system-list strong {
  color: #0f172a;
}

.summary-section,
.analysis-section,
.download-panel,
.advanced-panel {
  background: #ffffff;
  border-radius: 18px;
  border: 1px solid rgba(226, 232, 240, 0.9);
  padding: 24px;
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.06);
  gap: 24px;
}

.analysis-section {
  display: flex;
  flex-direction: column;
  gap: 20px;
  max-width: 950px;
  width: 100%;
  margin: 0 auto;
}

.analysis-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  flex-wrap: wrap;
  gap: 12px;
}

.analysis-header h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: #1f2937;
}

.analysis-header p {
  margin: 4px 0 0;
  font-size: 12px;
  color: #6b7280;
}

.analysis-tools {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.view-toggle {
  display: inline-flex;
  background: rgba(79, 70, 229, 0.08);
  border-radius: 999px;
  padding: 4px;
  gap: 6px;
}

.view-mode-btn {
  border: none;
  background: transparent;
  padding: 6px 14px;
  border-radius: 999px;
  font-size: 12px;
  color: #4c6ef5;
  cursor: pointer;
  transition: all 0.2s ease;
}

.view-mode-btn.active {
  background: #4c6ef5;
  color: #ffffff;
  box-shadow: 0 4px 16px rgba(76, 110, 245, 0.35);
}

.analysis-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-height: calc(100vh - 260px);
  overflow-y: auto;
  padding-right: 6px;
}

.analysis-list::-webkit-scrollbar {
  width: 6px;
}

.analysis-list::-webkit-scrollbar-thumb {
  background: rgba(148, 163, 184, 0.5);
  border-radius: 999px;
}

.question-analytics {
  background: #ffffff;
  border-radius: 18px;
  padding: 24px;
  border: 1px solid rgba(231, 235, 244, 0.9);
  display: flex;
  flex-direction: column;
  gap: 18px;
  box-shadow: 0 8px 20px rgba(79, 70, 229, 0.06);
}

.question-analytics__header {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.question-title-block {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.badge {
  background: #2563eb;
  color: #fff;
  font-weight: 600;
  font-size: 13px;
  border-radius: 10px;
  padding: 6px 12px;
}

.title-group h3 {
  margin: 0 0 4px;
  font-size: 18px;
  color: #0f172a;
}

.title-group .type {
  font-size: 12px;
  color: #1d4ed8;
  background: rgba(37, 99, 235, 0.1);
  padding: 4px 8px;
  border-radius: 8px;
}

.question-table {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.table-head,
.table-row {
  display: grid;
  grid-template-columns: 350px 70px 350px;
  gap: 16px;
  font-size: 13px;
  color: #475569;
  align-items: center;
}

.table-head {
  color: #9ca3af;
  font-weight: 600;
  padding-bottom: 6px;
  border-bottom: 1px solid rgba(191, 209, 235, 0.5);
}

.table-row {
  padding: 10px 0;
  border-bottom: 1px dashed rgba(191, 209, 235, 0.4);
}

.col-option {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #0f172a;
  font-weight: 600;
}

.col-count {
  text-align: right;
  font-weight: 600;
  color: #1f2937;
}

.col-ratio {
  display: flex;
  align-items: center;
  gap: 10px;
  justify-content: flex-end;
}

.ratio-bar {
  position: relative;
  flex: 1;
  height: 8px;
  background: rgba(226, 232, 240, 0.8);
  border-radius: 999px;
  overflow: hidden;
}

.ratio-fill {
  position: absolute;
  inset: 0;
  border-radius: 999px;
  transition: width 0.3s ease;
}

.ratio-value {
  min-width: 64px;
  text-align: right;
  font-weight: 600;
  color: #1f2937;
}

.question-rating {
  display: grid;
  grid-template-columns: 160px 1fr;
  gap: 24px;
  align-items: center;
}

.question-rating .rating-score {
  display: grid;
  place-items: center;
  background: rgba(251, 191, 36, 0.12);
  border-radius: 16px;
  padding: 20px;
  gap: 6px;
}

.question-rating .rating-score .value {
  font-size: 34px;
  font-weight: 700;
  color: #b45309;
}

.question-rating .rating-score .label {
  font-size: 13px;
  color: #f59e0b;
}

.rating-distribution {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
  font-size: 13px;
}

.rating-distribution li {
  display: grid;
  grid-template-columns: 60px 1fr 70px;
  gap: 12px;
  align-items: center;
}

.star-label {
  color: #475569;
}

.rating-distribution .progress {
  height: 10px;
  background: rgba(148, 163, 184, 0.25);
  border-radius: 999px;
  overflow: hidden;
}

.rating-distribution .progress-bar {
  height: 100%;
  border-radius: 999px;
}

.question-text {
  font-size: 13px;
  color: #6b7280;
  background: rgba(226, 232, 240, 0.6);
  padding: 16px;
  border-radius: 12px;
}

.question-footer {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  font-size: 12px;
  color: #94a3b8;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  border-radius: 16px;
  background: rgba(226, 232, 240, 0.6);
  color: #64748b;
}

.download-panel {
  display: flex;
  flex-direction: column;
}

.download-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 24px;
}

.download-card {
  background: #f8fafc;
  border-radius: 16px;
  border: 1px solid rgba(226, 232, 240, 0.9);
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.08);
}

.download-card h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #0f172a;
}

.download-card p {
  font-size: 13px;
  color: #64748b;
  line-height: 1.6;
}

.download-card .btn {
  align-self: flex-start;
}

.download-card .btn.ghost {
  background: rgba(15, 23, 42, 0.06);
  color: #1f2937;
}

.card-icon {
  font-size: 32px;
}

.advanced-panel {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 24px;
}

.advanced-card {
  background: #f8fafc;
  border-radius: 14px;
  padding: 24px;
  border: 1px solid rgba(226, 232, 240, 0.8);
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.query-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.input {
  padding: 10px 14px;
  border-radius: 10px;
  border: 1px solid rgba(148, 163, 184, 0.6);
  min-width: 120px;
  font-size: 13px;
}

.advanced-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

@media (max-width: 1200px) {
  .answers-dashboard {
    grid-template-columns: 1fr;
  }

  .dashboard-sidebar {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    border-right: none;
    border-bottom: 1px solid rgba(148, 163, 184, 0.2);
  }

  .sidebar-nav {
    flex-direction: row;
  }

  .dashboard-main {
    padding: 24px;
  }

  .charts-grid {
    grid-template-columns: 1fr;
  }

  .summary-bottom {
    grid-template-columns: 1fr;
  }

  .rating-stats {
    grid-template-columns: 1fr;
  }

  .analysis-list {
    max-height: none;
  }
}

@media (max-width: 768px) {
  .dashboard-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .header-actions {
    width: 100%;
    justify-content: flex-start;
  }

  .summary-metrics {
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  }

  .summary-card {
    padding: 18px;
  }

  .question-item {
    padding: 18px;
  }

  .download-grid {
    grid-template-columns: 1fr;
  }

  .choice-table li {
    grid-template-columns: 1fr;
    gap: 8px;
  }

  .option-value {
    text-align: left;
  }
}
</style>
