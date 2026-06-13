import { computed, nextTick, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { dryRunSurveyJson, generateSurveyByAi, getSurvey as getSurveyRaw, getResults as getSurveyDetailStats } from '@/api/surveys'
import { generateQuestionId as generateQuestionIdUtil } from '@/utils/uid'
import { mapLegacyTypeToServer, mapServerTypeToLegacy } from '@/mappers/surveyMappers'
import {
  getLegacyQuestionConfigPanel,
  getLegacyQuestionTypeLabel,
  legacyQuestionTypeHasOptions,
  serverQuestionTypeHasOptions
} from '@/utils/questionTypeRegistry'
import { buildUploadQuestionHelpText, DEFAULT_UPLOAD_ACCEPT, normalizeUploadQuestionConfig, sanitizeUploadAccept } from '@/utils/uploadQuestion'
import {
  buildLegacyQuestionDraft,
  getImplementedLegacyQuestionNames as getImplementedLegacyQuestionNamesFromEditorModel,
  getLegacyQuestionEditorConfig,
  getLegacyQuestionOptionSuffix,
  isLegacyQuestionOfServerType
} from '@/utils/questionEditorModel'
import { formatAiSurveyIssues, isLikelyAiJsonInput, parseAiSurveyInput } from '@/utils/aiSurveySchema'
import type { QuestionBankQuestionDTO, QuestionBankQuestionFormDTO } from '../../../../shared/management.contract.js'
import type {
  QuestionJumpLogicDTO,
  QuestionLogicDTO,
  QuestionOptionGroupDTO,
  QuestionQuotaModeDTO,
  VisibleWhenDTO
} from '../../../../shared/survey.contract.js'

export interface SurveyEditorOptionExtra {
  quotaLimit: number
  quotaEnabled: boolean
  rich: boolean
  hasDesc: boolean
  desc: string
  exclusive: boolean
  defaultSelected: boolean
  hidden: boolean
  fillEnabled: boolean
  fillRequired: boolean
  fillPlaceholder: string
}

export interface SurveyEditorMatrixOptionLimit {
  enabled: boolean
  min: number
  max: number
}

export interface SurveyEditorMatrixConfig {
  rows?: string[]
  selectionType?: 'single' | 'multiple'
  rowTitleWidth?: string
  rightRowTitle?: boolean
  rowTitleRandom?: boolean
  verticalSelect?: boolean
  singleQuestionAnswer?: boolean
  mobileLayout?: 'auto' | 'inline' | 'stacked' | string
  optionLimit?: Partial<SurveyEditorMatrixOptionLimit>
}

export interface SurveyEditorQuestion {
  id: string
  type: number
  uiType?: number
  title: string
  titleHtml?: string
  description?: string
  required: boolean
  options?: string[]
  matrix?: SurveyEditorMatrixConfig
  multiFill?: {
    items?: string[]
  }
  optionOrder?: 'none' | 'all' | 'flip' | 'firstFixed' | 'lastFixed'
  hideSystemNumber?: boolean
  validation?: Record<string, unknown>
  upload?: {
    maxFiles?: number
    maxSizeMb?: number
    accept?: string
    compressSize?: boolean
    compressDimensions?: boolean
    maxWidth?: number
    maxHeight?: number
    watermark?: string
  }
  logic?: QuestionLogicDTO
  jumpLogic?: QuestionJumpLogicDTO
  optionGroups?: QuestionOptionGroupDTO[]
  quotasEnabled?: boolean
  quotaMode?: QuestionQuotaModeDTO
  quotaShowRemaining?: boolean
  quotaFullText?: string
  groupOrderRandom?: boolean
  groupFillRandom?: boolean
  autoSelectOnAppear?: boolean
  optionLogic?: Array<VisibleWhenDTO | undefined>
  optionExtras?: SurveyEditorOptionExtra[]
  examConfig?: {
    score?: number
    correctAnswer?: unknown
  }
  placeholder?: string
  tags?: string[]
  aiMeta?: Record<string, unknown>
  [key: string]: unknown
}

export interface SurveyEditorForm {
  title: string
  description: string
  type: 'normal' | 'anonymous' | 'limited'
  endTime: string
  settings: {
    allowMultipleSubmissions: boolean
    showProgress: boolean
    randomizeQuestions: boolean
    collectIP: boolean
    submitOnce: boolean
  }
  questions: SurveyEditorQuestion[]
}

export interface QuestionBankExportMetadata {
  tags?: string[]
  knowledgePoints?: string[]
  applicableScenes?: string[]
  aiMeta?: Record<string, unknown>
}

interface AiImportedQuestionPayload {
  legacyType: number
  title: string
  required: boolean
  options?: string[]
  placeholder?: string
  description?: string
  validation?: Record<string, unknown>
  tags?: string[]
  aiMeta?: Record<string, unknown>
}

interface AiImportedSurveyPayload {
  title: string
  description?: string
  questions: AiImportedQuestionPayload[]
}

const QUESTION_BANK_AI_TAG = 'AI生成'

function isPlainObject(value: unknown): value is Record<string, any> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function cloneJsonValue<T>(value: T): T {
  if (value == null) return value
  if (Array.isArray(value)) return value.map(item => cloneJsonValue(item)) as T
  if (isPlainObject(value)) {
    return Object.keys(value).reduce((result, key) => {
      result[key] = cloneJsonValue((value as Record<string, any>)[key])
      return result
    }, {} as Record<string, any>) as T
  }
  return value
}

function mergeUniqueTextList(...values: Array<Array<unknown> | undefined>): string[] | undefined {
  const merged = values
    .flatMap(value => Array.isArray(value) ? value : [])
    .map(item => String(item || '').trim())
    .filter(Boolean)

  return merged.length > 0 ? Array.from(new Set(merged)) : undefined
}

function mergeAiMeta(...values: Array<Record<string, unknown> | undefined>): Record<string, unknown> | undefined {
  const merged = values.reduce<Record<string, unknown>>((result, value) => {
    if (!isPlainObject(value)) return result
    Object.assign(result, cloneJsonValue(value))
    return result
  }, {})

  return Object.keys(merged).length > 0 ? merged : undefined
}

function createAiJsonImportMeta() {
  return {
    source: 'survey.ai.json.import',
    generatedAt: new Date().toISOString(),
    generatedBy: 'manual-json',
    reviewStatus: 'draft'
  }
}

const MATRIX_ROW_TITLE_WIDTH_OPTIONS = ['', '10%', '15%', '20%', '30%', '40%', '50%', '60%', '70%', '80%', '90%']
const MATRIX_MOBILE_LAYOUT_OPTIONS = [
  { value: 'auto', label: '自动显示' },
  { value: 'inline', label: '同行显示' },
  { value: 'stacked', label: '换行显示' }
]

function createDefaultOptionExtra(): SurveyEditorOptionExtra {
  return {
    quotaLimit: 0,
    quotaEnabled: true,
    rich: false,
    hasDesc: false,
    desc: '',
    exclusive: false,
    defaultSelected: false,
    hidden: false,
    fillEnabled: false,
    fillRequired: false,
    fillPlaceholder: ''
  }
}

function withAiQuestionAnnotations(payload: AiImportedSurveyPayload, aiMeta?: Record<string, unknown>): AiImportedSurveyPayload {
  const normalizedAiMeta = mergeAiMeta(aiMeta)
  const aiTags = normalizedAiMeta ? [QUESTION_BANK_AI_TAG] : undefined

  return {
    ...payload,
    questions: payload.questions.map(question => ({
      ...question,
      tags: mergeUniqueTextList(question.tags, aiTags),
      aiMeta: mergeAiMeta(question.aiMeta, normalizedAiMeta)
    }))
  }
}

export function useEditorCore() {
  const router = useRouter()
  const route = useRoute()

  const saving = ref(false)
  const panelTab = ref<'types' | 'repo' | 'outline'>('types')

  const draggingIndex = ref<number | null>(null)
  const dragOverIndex = ref<number | 'end' | null>(null)
  const dragOverPos = ref<'before' | 'after'>('after')
  const outlineListEl = ref<HTMLElement | null>(null)
  const showOutlineTip = ref(true)
  const renamingIndex = ref<number | null>(null)
  const renameText = ref('')
  const renameInputEl = ref<HTMLInputElement | null>(null)
  const editingIndex = ref(-1)

  const currentTab = ref<'edit' | 'preview' | 'settings' | 'share' | 'answers'>('edit')
  const showAIHelper = ref(false)
  const showHeaderSettings = ref(false)
  const aiPrompt = ref('')
  const aiGenerating = ref(false)
  const aiApplyMode = ref<'append' | 'replace'>('append')

  const answerStats = reactive({
    total: 0,
    today: 0,
    avgScore: 0
  })

  const categoryExpanded = reactive({
    choice: true,
    fillblank: true,
    paging: true,
    matrix: true,
    rating: true,
    advanced: true
  })

  const surveyForm = reactive<SurveyEditorForm>({
    title: '',
    description: '',
    type: 'normal',
    endTime: '',
    settings: {
      allowMultipleSubmissions: false,
      showProgress: true,
      randomizeQuestions: false,
      collectIP: false,
      submitOnce: true
    },
    questions: []
  })

  const shareId = ref('')
  const currentSurveyId = ref('')
  const errors = reactive({ title: '' })

  const canPreview = computed(() => surveyForm.title.trim() !== '' && surveyForm.questions.length > 0)
  const canPublish = computed(() => canPreview.value && !Object.values(errors).some(error => error !== ''))
  const areAllNumbersHidden = computed(() => surveyForm.questions.length > 0 && surveyForm.questions.every(question => question.hideSystemNumber))
  const computedShareLink = computed(() => {
    const host = location?.origin || ''
    const code = shareId.value.trim()
    return code ? `${host}/s/${encodeURIComponent(code)}` : ''
  })

  function onOutlineDragStart(index: number, event: DragEvent) {
    draggingIndex.value = index
    dragOverIndex.value = null
    try {
      event.dataTransfer?.setData('text/plain', String(index))
    } catch {}
    if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move'
  }

  function onOutlineDragOver(index: number | 'end', event: DragEvent) {
    if (draggingIndex.value == null) return
    dragOverIndex.value = index
    if (typeof index === 'number') {
      const target = event.currentTarget as HTMLElement
      const rect = target.getBoundingClientRect()
      dragOverPos.value = event.clientY < rect.top + rect.height / 2 ? 'before' : 'after'
    } else {
      dragOverPos.value = 'after'
    }
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move'

    const host = outlineListEl.value
    if (!host) return
    const bounds = host.getBoundingClientRect()
    const margin = 30
    const speed = 8
    if (event.clientY < bounds.top + margin) host.scrollTop -= speed
    if (event.clientY > bounds.bottom - margin) host.scrollTop += speed
  }

  function onOutlineDrop(index: number | 'end') {
    const from = draggingIndex.value
    if (from == null) return
    let to = index === 'end' ? surveyForm.questions.length : Number(index)
    if (!Number.isFinite(to)) return

    let insertPos = to
    if (index !== 'end') insertPos = dragOverPos.value === 'before' ? to : to + 1
    if (insertPos === from || insertPos === from + 1) {
      draggingIndex.value = null
      dragOverIndex.value = null
      return
    }

    const list = [...surveyForm.questions]
    const [moved] = list.splice(from, 1)
    const adjustedPos = insertPos > from ? insertPos - 1 : insertPos
    list.splice(adjustedPos, 0, moved)
    surveyForm.questions.splice(0, surveyForm.questions.length, ...list)

    if (editingIndex.value === from) editingIndex.value = adjustedPos
    else if (editingIndex.value > from && editingIndex.value <= adjustedPos) editingIndex.value -= 1
    else if (editingIndex.value < from && editingIndex.value >= adjustedPos) editingIndex.value += 1

    draggingIndex.value = null
    dragOverIndex.value = null
    showOutlineTip.value = false
  }

  function onOutlineDragEnd() {
    draggingIndex.value = null
    dragOverIndex.value = null
  }

  function startRename(index: number, question: SurveyEditorQuestion) {
    renamingIndex.value = index
    renameText.value = String(question?.title || '')
    nextTick(() => renameInputEl.value?.focus())
  }

  function confirmRename() {
    const index = renamingIndex.value
    if (index == null) return
    const title = renameText.value.trim()
    if (title) surveyForm.questions[index].title = title
    renamingIndex.value = null
  }

  function closeQuestionEdit() {
    editingIndex.value = -1
  }

  function openQuestionEdit(index: number) {
    if (!Number.isInteger(index) || index < 0 || index >= surveyForm.questions.length) return
    normalizeQuestionForEditor(surveyForm.questions[index])
    editingIndex.value = index
    currentTab.value = 'edit'
  }

  function copyShareLink() {
    navigator.clipboard?.writeText(computedShareLink.value)
  }

  function validateForm() {
    errors.title = ''
    if (!surveyForm.title.trim()) errors.title = '请输入问卷标题'
    else if (surveyForm.title.length > 100) errors.title = '标题不能超过100个字符'
  }

  function getQuestionTypeLabel(type: number | string): string {
    return getLegacyQuestionTypeLabel(type)
  }

  function goBack() {
    try {
      router.back()
    } catch {
      router.push({ name: 'SurveyList' })
    }
  }

  function getQuestionConfig(type: number) {
    return getLegacyQuestionEditorConfig(type)
  }

  function isStandaloneConfigType(type: number): boolean {
    return getLegacyQuestionConfigPanel(type) === 'standalone'
  }

  function isMatrixLegacyQuestion(type: number | string): boolean {
    return isLegacyQuestionOfServerType(type, 'matrix')
  }

  function isMultiFillLegacyQuestion(type: number | string): boolean {
    return Number(type) === 9
  }

  function isSliderLegacyQuestion(type: number | string): boolean {
    return isLegacyQuestionOfServerType(type, 'slider')
  }

  function isUploadLegacyQuestion(type: number | string): boolean {
    return isLegacyQuestionOfServerType(type, 'upload')
  }

  function isRatingLegacyQuestion(type: number | string): boolean {
    return isLegacyQuestionOfServerType(type, 'rating')
  }

  function isScaleLegacyQuestion(type: number | string): boolean {
    return isLegacyQuestionOfServerType(type, 'scale')
  }

  const generateQuestionId = (): string => generateQuestionIdUtil('q')

  function buildLegacyQuestion(type: number): SurveyEditorQuestion {
    const question = buildLegacyQuestionDraft(type, {
      id: generateQuestionId(),
      hideSystemNumber: areAllNumbersHidden.value
    }) as SurveyEditorQuestion
    return normalizeQuestionForEditor(question)
  }

  function createDefaultQuestion(type: number): SurveyEditorQuestion {
    return buildLegacyQuestion(type)
  }

  function buildEditorQuestionFromServerQuestion(question: any): SurveyEditorQuestion {
    const editorQuestion: SurveyEditorQuestion = {
      id: question.id ? String(question.id) : generateQuestionId(),
      type: mapServerTypeToLegacy(question.type || 'input', question.uiType),
      uiType: question.uiType == null ? undefined : Number(question.uiType),
      title: question.title || '',
      ...(question.titleHtml ? { titleHtml: question.titleHtml } : {}),
      description: question.description || '',
      required: !!question.required,
      validation: question.validation || undefined,
      matrix: question.matrix
        ? {
            rows: Array.isArray(question.matrix.rows) ? question.matrix.rows.map((row: any) => row.label ?? String(row)) : [],
            selectionType: question.matrix.selectionType === 'multiple' ? 'multiple' : 'single',
            rowTitleWidth: String(question.matrix.rowTitleWidth || '30%'),
            rightRowTitle: !!question.matrix.rightRowTitle,
            rowTitleRandom: !!question.matrix.rowTitleRandom,
            verticalSelect: !!question.matrix.verticalSelect,
            singleQuestionAnswer: !!question.matrix.singleQuestionAnswer,
            mobileLayout: String(question.matrix.mobileLayout || 'auto'),
            optionLimit: {
              enabled: !!question.matrix.optionLimit?.enabled,
              min: Number(question.matrix.optionLimit?.min || 0),
              max: Number(question.matrix.optionLimit?.max || 0)
            }
          }
        : undefined,
      multiFill: question.multiFill
        ? {
            items: Array.isArray(question.multiFill.items)
              ? question.multiFill.items.map((item: any, itemIndex: number) => {
                  if (item && typeof item === 'object') return String(item.label ?? item.text ?? `填空${itemIndex + 1}`)
                  return String(item ?? `填空${itemIndex + 1}`)
                })
              : []
          }
        : undefined,
      hideSystemNumber: !!question.hideSystemNumber,
      quotasEnabled: !!question.quotasEnabled,
      quotaMode: (question as any).quotaMode || 'explicit',
      quotaFullText: (question as any).quotaFullText || '名额已满',
      quotaShowRemaining: !!(question as any).quotaShowRemaining,
      options: Array.isArray(question.options) ? question.options.map((option: any) => option.label ?? String(option)) : undefined,
      optionOrder: (question.optionOrder as any) || 'none',
      optionGroups: Array.isArray(question.optionGroups)
        ? question.optionGroups
            .map((group: any) => ({
              name: String(group?.name ?? ''),
              from: Number(group?.from ?? NaN),
              to: Number(group?.to ?? NaN),
              random: !!group?.random
            }))
            .filter((group: any) => Number.isFinite(group.from) && Number.isFinite(group.to) && group.from >= 1 && group.to >= group.from)
        : [],
      groupOrderRandom: !!question.groupOrderRandom,
      autoSelectOnAppear: !!question.autoSelectOnAppear,
      jumpLogic: question.jumpLogic,
      optionLogic: [],
      optionExtras: Array.isArray(question.options)
        ? question.options.map((option: any) => ({
            quotaLimit: Number(option.quotaLimit || 0),
            quotaEnabled: option.quotaEnabled !== false,
            rich: !!option.rich,
            hasDesc: !!option.desc,
            desc: option.desc || '',
            exclusive: !!option.exclusive,
            defaultSelected: !!option.defaultSelected,
            hidden: !!option.hidden,
            fillEnabled: !!option.fillEnabled,
            fillRequired: !!option.fillRequired,
            fillPlaceholder: option.fillPlaceholder || ''
          }))
        : [],
      examConfig: isPlainObject(question.examConfig)
        ? {
            score: Number(question.examConfig.score || 0),
            correctAnswer: cloneJsonValue(question.examConfig.correctAnswer)
          }
        : undefined
    }
    return normalizeQuestionForEditor(editorQuestion)
  }

  function buildEditorQuestionFromQuestionBank(question: QuestionBankQuestionDTO): SurveyEditorQuestion {
    const content = question.content
    const surveyQuestion = content && isPlainObject(content.surveyQuestion) ? content.surveyQuestion : null

    if (surveyQuestion) {
      const importedQuestion = buildEditorQuestionFromServerQuestion({
        ...surveyQuestion,
        title: String(surveyQuestion.title || question.stem || question.title || ''),
        description: String(surveyQuestion.description || question.analysis || '')
      })

      if ((!Array.isArray(importedQuestion.options) || importedQuestion.options.length === 0) && Array.isArray(question.options)) {
        importedQuestion.options = question.options
          .map(option => String(option?.label ?? option?.text ?? option?.value ?? '').trim())
          .filter(Boolean)
      }

      if (!importedQuestion.examConfig && (question.score != null || question.correctAnswer !== undefined)) {
        importedQuestion.examConfig = {
          score: Number(question.score || 0),
          correctAnswer: cloneJsonValue(question.correctAnswer)
        }
      }

      importedQuestion.id = generateQuestionId()
      importedQuestion.hideSystemNumber = areAllNumbersHidden.value
      importedQuestion.tags = mergeUniqueTextList(question.tags, question.content?.tags)
      importedQuestion.aiMeta = mergeAiMeta(question.aiMeta, question.content?.aiMeta)
      return importedQuestion
    }

    const type = mapServerTypeToLegacy(question.content?.questionType || question.type || 'input')
    const importedQuestion = buildLegacyQuestion(type)
    importedQuestion.title = String(question.stem || question.title || '').trim() || getQuestionTypeLabel(type)
    if (question.analysis) importedQuestion.description = String(question.analysis)
    if (Array.isArray(question.options)) {
      importedQuestion.options = question.options
        .map(option => String(option?.label ?? option?.text ?? option?.value ?? '').trim())
        .filter(Boolean)
    }
    if (question.score != null || question.correctAnswer !== undefined) {
      importedQuestion.examConfig = {
        score: Number(question.score || 0),
        correctAnswer: cloneJsonValue(question.correctAnswer)
      }
    }
    importedQuestion.tags = mergeUniqueTextList(question.tags, question.content?.tags)
    importedQuestion.aiMeta = mergeAiMeta(question.aiMeta, question.content?.aiMeta)
    return importedQuestion
  }

  function importQuestionBankQuestion(question: QuestionBankQuestionDTO) {
    const importedQuestion = normalizeQuestionForEditor(buildEditorQuestionFromQuestionBank(question))
    surveyForm.questions.push(importedQuestion)
    openQuestionEdit(surveyForm.questions.length - 1)
    return importedQuestion
  }

  function ensureSliderValidation(question: SurveyEditorQuestion) {
    question.validation = question.validation && typeof question.validation === 'object' ? question.validation : {}
    const validation = question.validation as Record<string, number>
    const min = Number(validation.min)
    const max = Number(validation.max)
    const step = Number(validation.step)
    validation.min = Number.isFinite(min) ? min : 0
    validation.max = Number.isFinite(max) ? max : 100
    validation.step = Number.isFinite(step) && step > 0 ? step : 1
    return validation as { min: number; max: number; step: number }
  }

  function normalizeSliderValidation(question: SurveyEditorQuestion) {
    const validation = ensureSliderValidation(question)
    if (validation.max < validation.min) validation.max = validation.min
    if (validation.step <= 0) validation.step = 1
  }

  function ensureRatingValidation(question: SurveyEditorQuestion) {
    question.validation = question.validation && typeof question.validation === 'object' ? question.validation : {}
    const validation = question.validation as Record<string, number>
    const min = Number(validation.min)
    const max = Number(validation.max)
    validation.min = Number.isFinite(min) ? min : 1
    validation.max = Number.isFinite(max) ? max : 5
    validation.step = 1
    return validation as { min: number; max: number; step: number }
  }

  function normalizeRatingValidation(question: SurveyEditorQuestion) {
    const validation = ensureRatingValidation(question)
    validation.min = Math.max(1, Math.min(10, Math.floor(Number(validation.min) || 1)))
    validation.max = Math.max(validation.min, Math.min(10, Math.floor(Number(validation.max) || 5)))
    validation.step = 1
  }

  function ensureScaleValidation(question: SurveyEditorQuestion) {
    question.validation = question.validation && typeof question.validation === 'object' ? question.validation : {}
    const validation = question.validation as Record<string, any>
    const min = Number(validation.min)
    const max = Number(validation.max)
    const step = Number(validation.step)
    validation.min = Number.isFinite(min) ? min : 0
    validation.max = Number.isFinite(max) ? max : 10
    validation.step = Number.isFinite(step) && step > 0 ? step : 1
    if (validation.minLabel == null) validation.minLabel = '最低'
    if (validation.maxLabel == null) validation.maxLabel = '最高'
    return validation as {
      min: number
      max: number
      step: number
      minLabel?: string
      maxLabel?: string
    }
  }

  function normalizeScaleValidation(question: SurveyEditorQuestion) {
    const validation = ensureScaleValidation(question)
    validation.min = Math.max(0, Math.min(100, Math.floor(Number(validation.min) || 0)))
    validation.max = Math.max(validation.min + 1, Math.min(100, Math.floor(Number(validation.max) || 10)))
    validation.step = Math.max(1, Math.floor(Number(validation.step) || 1))
  }

  function getScalePreviewValues(question: SurveyEditorQuestion) {
    const validation = getScaleValidation(question)
    const values: number[] = []
    for (let value = validation.min; value <= validation.max; value += validation.step) values.push(value)
    return values
  }

  function ensureMatrixConfig(question: SurveyEditorQuestion) {
    question.matrix = question.matrix && typeof question.matrix === 'object' ? question.matrix : {}
    question.matrix.selectionType = Number(question?.type) === 21 ? 'multiple' : 'single'
    if (!Array.isArray(question.options)) question.options = []
    while (question.options.length < 2) question.options.push(`选项${question.options.length + 1}`)
    if (!Array.isArray(question.matrix.rows) || question.matrix.rows.length === 0) {
      question.matrix.rows = ['服务态度', '响应速度', '专业程度']
    }
    question.matrix.rows = question.matrix.rows.map((row: any, index: number) => {
      if (typeof row === 'string') return row
      return String(row?.label ?? row?.text ?? `维度${index + 1}`)
    })
    if (!MATRIX_ROW_TITLE_WIDTH_OPTIONS.includes(String(question.matrix.rowTitleWidth || ''))) {
      question.matrix.rowTitleWidth = '30%'
    } else if (question.matrix.rowTitleWidth == null) {
      question.matrix.rowTitleWidth = '30%'
    }
    question.matrix.rightRowTitle = false
    question.matrix.rowTitleRandom = !!question.matrix.rowTitleRandom
    question.matrix.verticalSelect = false
    question.matrix.singleQuestionAnswer = !!question.matrix.singleQuestionAnswer
    if (!MATRIX_MOBILE_LAYOUT_OPTIONS.some(option => option.value === question.matrix?.mobileLayout)) {
      question.matrix.mobileLayout = 'auto'
    }
    normalizeMatrixOptionLimit(question)
    return question.matrix as SurveyEditorMatrixConfig & { rows: string[]; selectionType: 'single' | 'multiple'; optionLimit: SurveyEditorMatrixOptionLimit }
  }

  function normalizeMatrixOptionLimit(question: SurveyEditorQuestion) {
    question.matrix = question.matrix && typeof question.matrix === 'object' ? question.matrix : {}
    const source = question.matrix.optionLimit && typeof question.matrix.optionLimit === 'object' ? question.matrix.optionLimit : {}
    const min = Math.max(0, Math.floor(Number(source.min || 0)))
    const max = Math.max(0, Math.floor(Number(source.max || 0)))
    question.matrix.optionLimit = {
      enabled: !!source.enabled,
      min,
      max: max > 0 && max < min ? min : max
    }
    return question.matrix.optionLimit as SurveyEditorMatrixOptionLimit
  }

  function isMatrixMultipleLegacyQuestion(type: number | string) {
    return Number(type) === 21
  }

  function isMatrixDropdownLegacyQuestion(type: number | string) {
    return Number(type) === 24
  }

  function addMatrixRow(question: SurveyEditorQuestion) {
    const matrix = ensureMatrixConfig(question)
    matrix.rows.push(`维度${matrix.rows.length + 1}`)
  }

  function insertMatrixRow(question: SurveyEditorQuestion, rowIndex: number, position: 'before' | 'after' = 'after') {
    const matrix = ensureMatrixConfig(question)
    const baseIndex = Math.max(0, Math.min(matrix.rows.length, rowIndex + (position === 'after' ? 1 : 0)))
    matrix.rows.splice(baseIndex, 0, `维度${matrix.rows.length + 1}`)
  }

  function removeMatrixRow(question: SurveyEditorQuestion, rowIndex: number) {
    const matrix = ensureMatrixConfig(question)
    if (rowIndex < 0 || rowIndex >= matrix.rows.length) return
    if (matrix.rows.length <= 1) {
      ElMessage.warning('矩阵题至少保留 1 行')
      return
    }
    matrix.rows.splice(rowIndex, 1)
  }

  function addMatrixColumn(question: SurveyEditorQuestion) {
    if (!Array.isArray(question.options)) question.options = []
    const nextIndex = question.options.length
    question.options.push(`选项${nextIndex + 1}`)
    const current = question as any
    current.optionExtras = Array.isArray(current.optionExtras) ? current.optionExtras : []
    current.optionExtras[nextIndex] = current.optionExtras[nextIndex] || createDefaultOptionExtra()
  }

  function insertMatrixColumn(question: SurveyEditorQuestion, columnIndex: number, position: 'before' | 'after' = 'after') {
    if (!Array.isArray(question.options)) question.options = []
    const insertAt = Math.max(0, Math.min(question.options.length, columnIndex + (position === 'after' ? 1 : 0)))
    question.options.splice(insertAt, 0, `选项${question.options.length + 1}`)
    const current = question as any
    current.optionExtras = Array.isArray(current.optionExtras) ? current.optionExtras : []
    current.optionExtras.splice(insertAt, 0, createDefaultOptionExtra())
  }

  function removeMatrixColumn(question: SurveyEditorQuestion, columnIndex: number) {
    if (!Array.isArray(question.options)) return
    if (columnIndex < 0 || columnIndex >= question.options.length) return
    if (question.options.length <= 2) {
      ElMessage.warning('矩阵题至少保留 2 列')
      return
    }
    removeOption(question, columnIndex)
  }

  function swapMatrixRowsAndOptions(question: SurveyEditorQuestion) {
    const matrix = ensureMatrixConfig(question)
    const currentRows = matrix.rows.map((row, index) => String(row || `维度${index + 1}`)).filter(Boolean)
    const currentOptions = Array.isArray(question.options)
      ? question.options.map((option, index) => String(option || `选项${index + 1}`)).filter(Boolean)
      : []
    if (currentRows.length < 2) {
      ElMessage.warning('行标题至少需要 2 项才能与选项交换')
      return
    }
    if (currentOptions.length < 1) {
      ElMessage.warning('请先设置矩阵选项')
      return
    }
    matrix.rows = currentOptions.length > 0 ? currentOptions : ['维度1']
    question.options = currentRows.length >= 2 ? currentRows : [...currentRows, '选项2']
    ;(question as any).optionExtras = question.options.map(() => createDefaultOptionExtra())
  }

  function ensureMultiFillConfig(question: SurveyEditorQuestion) {
    question.multiFill = question.multiFill && typeof question.multiFill === 'object' ? question.multiFill : {}
    if (!Array.isArray(question.multiFill.items) || question.multiFill.items.length === 0) {
      question.multiFill.items = ['姓名', '部门', '员工编号']
    }
    question.multiFill.items = question.multiFill.items
      .map((item: any, index: number) => {
        if (typeof item === 'string') return item
        return String(item?.label ?? item?.text ?? `填空${index + 1}`)
      })
    if (question.multiFill.items.length === 0) question.multiFill.items = ['填空1']
    return question.multiFill as { items: string[] }
  }

  function addMultiFillItem(question: SurveyEditorQuestion) {
    const multiFill = ensureMultiFillConfig(question)
    multiFill.items.push(`填空${multiFill.items.length + 1}`)
  }

  function addMultiFillItemAt(question: SurveyEditorQuestion, atIndex: number) {
    const multiFill = ensureMultiFillConfig(question)
    const label = `填空${multiFill.items.length + 1}`
    multiFill.items.splice(atIndex, 0, label)
  }

  function removeMultiFillItem(question: SurveyEditorQuestion, itemIndex: number) {
    const multiFill = ensureMultiFillConfig(question)
    if (multiFill.items.length <= 1) return
    if (itemIndex < 0 || itemIndex >= multiFill.items.length) return
    multiFill.items.splice(itemIndex, 1)
  }

  function ensureUploadConfig(question: SurveyEditorQuestion) {
    const normalized = normalizeUploadQuestionConfig(question)
    // 若 question 已有 upload 且 accept 已被显式设置（包括空字符串），则保留原值；否则用规范化结果或默认值
    const existingAccept = question.upload && typeof question.upload === 'object' && 'accept' in question.upload ? (question.upload as any).accept : undefined
    question.upload = {
      maxFiles: normalized.maxFiles,
      maxSizeMb: normalized.maxSizeMb,
      accept: existingAccept !== undefined ? existingAccept : (normalized.accept || DEFAULT_UPLOAD_ACCEPT),
      compressSize: normalized.compressSize,
      compressDimensions: normalized.compressDimensions,
      maxWidth: normalized.maxWidth || undefined,
      maxHeight: normalized.maxHeight || undefined,
      watermark: normalized.watermark || undefined
    }
    return question.upload as { maxFiles: number; maxSizeMb: number; accept: string; compressSize: boolean; compressDimensions: boolean; maxWidth?: number; maxHeight?: number; watermark?: string }
  }

  function normalizeUploadConfig(question: SurveyEditorQuestion) {
    const upload = ensureUploadConfig(question)
    upload.maxFiles = Math.max(1, Math.min(20, Math.floor(Number(upload.maxFiles) || 1)))
    upload.maxSizeMb = Math.max(1, Math.min(10, Number(upload.maxSizeMb) || 10))
    upload.accept = sanitizeUploadAccept(upload.accept)
    upload.maxWidth = Math.max(0, Math.min(10000, Math.floor(Number(upload.maxWidth) || 0)))
    upload.maxHeight = Math.max(0, Math.min(10000, Math.floor(Number(upload.maxHeight) || 0)))
  }

  function uploadConfigSummary(question: SurveyEditorQuestion) {
    return buildUploadQuestionHelpText(question)
  }

  function getUploadRestrictionMode(question: SurveyEditorQuestion): string {
    const accept = getUploadConfig(question).accept || ''
    const tokens = accept.split(',').map(t => t.trim().toLowerCase()).filter(Boolean)
    if (!tokens.length) return 'all'
    const imgExts = ['.jpg','.jpeg','.png','.gif','.webp']
    const docExts = ['.pdf','.docx','.xlsx']
    const hasOnlyImg = tokens.every(t => imgExts.includes(t))
    if (hasOnlyImg) return 'image'
    const hasOnlyDoc = tokens.every(t => docExts.includes(t))
    if (hasOnlyDoc) return 'document'
    const hasImgAndPdf = tokens.every(t => imgExts.includes(t) || t === '.pdf')
    if (hasImgAndPdf) return 'image+pdf'
    return 'all'
  }

  function setUploadRestrictionMode(question: SurveyEditorQuestion, mode: string) {
    const config = ensureUploadConfig(question)
    switch (mode) {
      case 'all':
        config.accept = ''
        config.compressSize = false
        config.compressDimensions = false
        config.maxWidth = 0
        config.maxHeight = 0
        config.watermark = ''
        break
      case 'image':
        config.accept = '.jpg,.jpeg,.png,.gif,.webp'
        config.compressSize = true
        config.compressDimensions = true
        if (!config.maxWidth && !config.maxHeight) {
          config.maxWidth = 1920
          config.maxHeight = 1080
        }
        break
      case 'document':
        config.accept = '.pdf,.docx,.xlsx'
        config.compressSize = false
        config.compressDimensions = false
        config.maxWidth = 0
        config.maxHeight = 0
        config.watermark = ''
        break
      case 'image+pdf':
        config.accept = '.jpg,.jpeg,.png,.gif,.webp,.pdf'
        config.compressSize = true
        config.compressDimensions = true
        if (!config.maxWidth && !config.maxHeight) {
          config.maxWidth = 1920
          config.maxHeight = 1080
        }
        break
    }
    normalizeUploadConfig(question)
  }

  function getImplementedQuestionNames() {
    return getImplementedLegacyQuestionNamesFromEditorModel()
  }

  function addQuestionByType(type: number) {
    editingIndex.value = -1
    const config = getQuestionConfig(type)
    if (!config.implemented) {
      alert(`${config.name} 正在开发中。\n\n已实现题型：\n${getImplementedQuestionNames()}`)
      return
    }
    surveyForm.questions.push(buildLegacyQuestion(type))
    currentTab.value = 'edit'
  }

  function hasOptions(type: number): boolean {
    return legacyQuestionTypeHasOptions(type)
  }

  function getOptionLabel(type: number, index: number): string {
    return getLegacyQuestionOptionSuffix(type, index)
  }

  function addOption(question: SurveyEditorQuestion) {
    if (!Array.isArray(question.options)) question.options = []
    const nextIndex = question.options.length
    question.options.push(`选项${getOptionLabel(question.type, nextIndex)}`)
    const current = question as any
    current.optionExtras = Array.isArray(current.optionExtras) ? current.optionExtras : []
    current.optionExtras[nextIndex] = current.optionExtras[nextIndex] || createDefaultOptionExtra()
  }

  function removeOption(question: SurveyEditorQuestion, optionIndex: number) {
    if (!Array.isArray(question.options)) return
    if (optionIndex < 0 || optionIndex >= question.options.length) return
    question.options.splice(optionIndex, 1)
    const current = question as any
    if (Array.isArray(current.optionExtras)) current.optionExtras.splice(optionIndex, 1)
  }

  function ensureOptionExtras(question: SurveyEditorQuestion, optionIndex: number) {
    const current = question as any
    current.optionExtras = Array.isArray(current.optionExtras) ? current.optionExtras : []
    current.optionExtras[optionIndex] = current.optionExtras[optionIndex] || createDefaultOptionExtra()
    return current.optionExtras[optionIndex]
  }

  function getSliderValidation(question: SurveyEditorQuestion) {
    if (question.validation && typeof question.validation === 'object') {
      return question.validation as { min: number; max: number; step: number }
    }
    return { min: 0, max: 100, step: 1 }
  }

  function getRatingValidation(question: SurveyEditorQuestion) {
    if (question.validation && typeof question.validation === 'object') {
      return question.validation as { min: number; max: number; step: number }
    }
    return { min: 1, max: 5, step: 1 }
  }

  function getScaleValidation(question: SurveyEditorQuestion) {
    if (question.validation && typeof question.validation === 'object') {
      return question.validation as { min: number; max: number; step: number; minLabel?: string; maxLabel?: string }
    }
    return { min: 0, max: 10, step: 1, minLabel: '最低', maxLabel: '最高' }
  }

  function getMatrixConfig(question: SurveyEditorQuestion) {
    if (question.matrix && typeof question.matrix === 'object') {
      return question.matrix as SurveyEditorMatrixConfig & { rows: string[]; selectionType: 'single' | 'multiple'; optionLimit: SurveyEditorMatrixOptionLimit }
    }
    return {
      rows: [],
      selectionType: 'single',
      rowTitleWidth: '30%',
      rightRowTitle: false,
      rowTitleRandom: false,
      verticalSelect: false,
      singleQuestionAnswer: false,
      mobileLayout: 'auto',
      optionLimit: { enabled: false, min: 0, max: 0 }
    } as SurveyEditorMatrixConfig & { rows: string[]; selectionType: 'single' | 'multiple'; optionLimit: SurveyEditorMatrixOptionLimit }
  }

  function getMultiFillConfig(question: SurveyEditorQuestion) {
    if (question.multiFill && typeof question.multiFill === 'object') {
      return question.multiFill as { items: string[] }
    }
    return { items: [] }
  }

  function getUploadConfig(question: SurveyEditorQuestion) {
    if (question.upload && typeof question.upload === 'object') {
      return question.upload as { maxFiles: number; maxSizeMb: number; accept: string; compressSize: boolean; compressDimensions: boolean; maxWidth?: number; maxHeight?: number; watermark?: string }
    }
    return {
      maxFiles: 1,
      maxSizeMb: 10,
      accept: DEFAULT_UPLOAD_ACCEPT,
      compressSize: false,
      compressDimensions: false,
      maxWidth: 0,
      maxHeight: 0,
      watermark: ''
    }
  }

  function getOptionExtra(question: SurveyEditorQuestion, optionIndex: number) {
    const current = question as any
    const extra = Array.isArray(current.optionExtras) ? current.optionExtras[optionIndex] : undefined
    return extra || createDefaultOptionExtra()
  }

  function normalizeQuestionForEditor(question: SurveyEditorQuestion) {
    if (!question) return question

    if (hasOptions(question.type) && !Array.isArray(question.options)) question.options = []
    if (isMatrixLegacyQuestion(question.type)) ensureMatrixConfig(question)
    if (isMultiFillLegacyQuestion(question.type)) ensureMultiFillConfig(question)
    if (isSliderLegacyQuestion(question.type)) ensureSliderValidation(question)
    if (isUploadLegacyQuestion(question.type)) ensureUploadConfig(question)
    if (isRatingLegacyQuestion(question.type)) ensureRatingValidation(question)
    if (isScaleLegacyQuestion(question.type)) ensureScaleValidation(question)

    if (Array.isArray(question.options)) {
      question.optionExtras = Array.isArray(question.optionExtras) ? question.optionExtras : []
      while (question.optionExtras.length > question.options.length) question.optionExtras.pop()
      question.options.forEach((_, optionIndex) => ensureOptionExtras(question, optionIndex))
    }

    return question
  }

  function isGroupConfigured(question: SurveyEditorQuestion): boolean {
    if (!question) return false
    const hasGroups = Array.isArray(question.optionGroups) && question.optionGroups.length > 0
    const hasRandom = !!question.groupOrderRandom || !!question.groupFillRandom
    return !!(hasGroups || hasRandom)
  }

  function isScoreConfigured(question: SurveyEditorQuestion): boolean {
    const config = question?.examConfig
    return !!(config && typeof config.score === 'number' && config.score > 0)
  }

  function moveQuestionUp(index: number) {
    if (index <= 0) return
    const question = surveyForm.questions[index]
    surveyForm.questions.splice(index, 1)
    surveyForm.questions.splice(index - 1, 0, question)
    if (editingIndex.value === index) editingIndex.value = index - 1
  }

  function moveQuestionDown(index: number) {
    if (index >= surveyForm.questions.length - 1) return
    const question = surveyForm.questions[index]
    surveyForm.questions.splice(index, 1)
    surveyForm.questions.splice(index + 1, 0, question)
    if (editingIndex.value === index) editingIndex.value = index + 1
  }

  function buildAiImportedQuestion(question: AiImportedQuestionPayload): SurveyEditorQuestion {
    const importedQuestion = buildLegacyQuestion(question.legacyType)
    importedQuestion.title = question.title
    importedQuestion.required = question.required
    importedQuestion.hideSystemNumber = areAllNumbersHidden.value

    if (question.description) importedQuestion.description = question.description
    if (Array.isArray(question.options)) importedQuestion.options = [...question.options]
    if (question.validation) {
      importedQuestion.validation = {
        ...(importedQuestion.validation || {}),
        ...question.validation
      }
    }
    if (question.placeholder) (importedQuestion as any).placeholder = question.placeholder
    if (Array.isArray(question.tags) && question.tags.length > 0) importedQuestion.tags = mergeUniqueTextList(question.tags)
    if (question.aiMeta && isPlainObject(question.aiMeta)) importedQuestion.aiMeta = mergeAiMeta(question.aiMeta)

    return normalizeQuestionForEditor(importedQuestion)
  }

  function resolveAiImportedSurveyState(payload: AiImportedSurveyPayload) {
    const importedQuestions = payload.questions.map(buildAiImportedQuestion)
    const nextDescription = payload.description || ''

    if (aiApplyMode.value === 'replace') {
      return {
        importedQuestions,
        title: payload.title || surveyForm.title,
        description: nextDescription,
        questions: importedQuestions
      }
    }

    return {
      importedQuestions,
      title: surveyForm.title.trim() ? surveyForm.title : payload.title,
      description: surveyForm.description.trim() || !nextDescription ? surveyForm.description : nextDescription,
      questions: [...surveyForm.questions, ...importedQuestions]
    }
  }

  function applyAiImportedSurvey(payload: AiImportedSurveyPayload) {
    const { importedQuestions, title, description, questions } = resolveAiImportedSurveyState(payload)
    questions.forEach(question => normalizeQuestionForEditor(question))

    if (aiApplyMode.value === 'replace') {
      surveyForm.title = title
      surveyForm.description = description
      surveyForm.questions.splice(0, surveyForm.questions.length, ...questions)
      if (importedQuestions.length > 0) openQuestionEdit(0)
      else editingIndex.value = -1
    } else {
      surveyForm.title = title
      surveyForm.description = description
      surveyForm.questions.push(...importedQuestions)
    }

    validateForm()
    showAIHelper.value = false
    aiPrompt.value = ''

    return importedQuestions.length
  }

  function getRequestErrorMessage(error: any, fallback: string): string {
    return error?.response?.data?.error?.message || error?.message || fallback
  }

  async function validateAiImportedSurvey(payload: AiImportedSurveyPayload) {
    const nextState = resolveAiImportedSurveyState(payload)
    const result = await dryRunSurveyJson({
      survey: buildServerSurveyPayload({
        title: nextState.title,
        description: nextState.description,
        questions: nextState.questions
      })
    })

    if (!result.valid) {
      throw new Error(result.error || 'AI import dry-run validation failed')
    }

    return result
  }

  async function generateByAILegacy() {
    if (!aiPrompt.value.trim()) {
      ElMessage.warning('请先输入 AI 需求或 JSON')
      return
    }

    const parsedAiSurvey = parseAiSurveyInput(aiPrompt.value)
    if (parsedAiSurvey.success) {
      const importedCount = applyAiImportedSurvey(parsedAiSurvey.data)
      ElMessage.success(`已从校验通过的 AI JSON 导入 ${importedCount} 道题`)
      return
    }

    if (isLikelyAiJsonInput(aiPrompt.value)) {
      ElMessage.error(`AI JSON 校验失败：\n${formatAiSurveyIssues(parsedAiSurvey.issues)}`)
      return
    }

    aiGenerating.value = true
    try {
      const generated = await generateSurveyByAi({
        prompt: aiPrompt.value,
        context: {
          title: surveyForm.title,
          description: surveyForm.description,
          questions: surveyForm.questions
            .filter(question => String(question.title || '').trim())
            .map(question => ({
              title: String(question.title || '').trim(),
              type: question.type
            }))
        }
      })

      const importedCount = applyAiImportedSurvey(generated)
      ElMessage.success(`已通过 AI 生成导入 ${importedCount} 道题`)
    } catch (error: any) {
      ElMessage.error(error?.response?.data?.error?.message || error?.message || 'AI 生成失败')
    } finally {
      aiGenerating.value = false
    }
  }

  async function generateByAIAutoValidated() {
    if (!aiPrompt.value.trim()) {
      ElMessage.warning('请先输入 AI 需求或 JSON')
      return
    }

    const parsedAiSurvey = parseAiSurveyInput(aiPrompt.value)
    if (parsedAiSurvey.success) {
      const annotatedSurvey = withAiQuestionAnnotations(parsedAiSurvey.data, createAiJsonImportMeta())
      aiGenerating.value = true
      try {
        await validateAiImportedSurvey(annotatedSurvey)
        const importedCount = applyAiImportedSurvey(annotatedSurvey)
        ElMessage.success(`AI JSON 已通过 dry-run 校验，并导入 ${importedCount} 道题`)
      } catch (error: any) {
        ElMessage.error(getRequestErrorMessage(error, 'AI JSON dry-run 校验失败'))
      } finally {
        aiGenerating.value = false
      }
      return
    }

    if (isLikelyAiJsonInput(aiPrompt.value)) {
      ElMessage.error(`AI JSON 校验失败：\n${formatAiSurveyIssues(parsedAiSurvey.issues)}`)
      return
    }

    aiGenerating.value = true
    try {
      const generated = await generateSurveyByAi({
        prompt: aiPrompt.value,
        context: {
          title: surveyForm.title,
          description: surveyForm.description,
          questions: surveyForm.questions
            .filter(question => String(question.title || '').trim())
            .map(question => ({
              title: String(question.title || '').trim(),
              type: question.type
            }))
        }
      })

      const annotatedSurvey = withAiQuestionAnnotations(generated, generated.aiMeta)
      await validateAiImportedSurvey(annotatedSurvey)
      const importedCount = applyAiImportedSurvey(annotatedSurvey)
      ElMessage.success(`AI 生成内容已通过 dry-run 校验，并导入 ${importedCount} 道题`)
    } catch (error: any) {
      ElMessage.error(getRequestErrorMessage(error, 'AI 生成或 dry-run 校验失败'))
    } finally {
      aiGenerating.value = false
    }
  }

  function duplicateQuestion(index: number) {
    const originalQuestion = surveyForm.questions[index]
    const duplicatedQuestion = {
      ...originalQuestion,
      id: generateQuestionId(),
      title: `${originalQuestion.title}（副本）`,
      options: Array.isArray(originalQuestion.options) ? [...originalQuestion.options] : undefined,
      optionExtras: Array.isArray(originalQuestion.optionExtras)
        ? originalQuestion.optionExtras.map(extra => ({ ...createDefaultOptionExtra(), ...(extra || {}) }))
        : undefined,
      validation: originalQuestion.validation ? { ...originalQuestion.validation } : undefined,
      upload: originalQuestion.upload ? { ...originalQuestion.upload } : undefined,
      multiFill: originalQuestion.multiFill
        ? {
            items: Array.isArray(originalQuestion.multiFill.items) ? [...originalQuestion.multiFill.items] : undefined
          }
        : undefined,
      matrix: originalQuestion.matrix
        ? {
            rows: Array.isArray(originalQuestion.matrix.rows) ? [...originalQuestion.matrix.rows] : undefined,
            selectionType: originalQuestion.matrix.selectionType,
            rowTitleWidth: originalQuestion.matrix.rowTitleWidth,
            rightRowTitle: originalQuestion.matrix.rightRowTitle,
            rowTitleRandom: originalQuestion.matrix.rowTitleRandom,
            verticalSelect: originalQuestion.matrix.verticalSelect,
            singleQuestionAnswer: originalQuestion.matrix.singleQuestionAnswer,
            mobileLayout: originalQuestion.matrix.mobileLayout,
            optionLimit: originalQuestion.matrix.optionLimit ? { ...originalQuestion.matrix.optionLimit } : undefined
          }
        : undefined
    }
    surveyForm.questions.splice(index + 1, 0, normalizeQuestionForEditor(duplicatedQuestion))
  }

  function deleteQuestion(index: number) {
    if (!confirm('确定要删除这道题目吗？')) return
    surveyForm.questions.splice(index, 1)
  }

  function finishEdit() {
    editingIndex.value = -1
  }

  function addQuestionAfter(index: number) {
    const current = surveyForm.questions[index]
    const nextQuestion = buildLegacyQuestion(Number(current.type))
    if (isSliderLegacyQuestion(current.type)) nextQuestion.validation = { ...ensureSliderValidation(current) }
    if (isRatingLegacyQuestion(current.type)) nextQuestion.validation = { ...ensureRatingValidation(current) }
    if (isScaleLegacyQuestion(current.type)) nextQuestion.validation = { ...ensureScaleValidation(current) }
    if (isMatrixLegacyQuestion(current.type)) {
      const currentMatrix = ensureMatrixConfig(current)
      nextQuestion.matrix = {
        rows: [...currentMatrix.rows],
        selectionType: currentMatrix.selectionType,
        rowTitleWidth: currentMatrix.rowTitleWidth,
        rightRowTitle: currentMatrix.rightRowTitle,
        rowTitleRandom: currentMatrix.rowTitleRandom,
        verticalSelect: currentMatrix.verticalSelect,
        singleQuestionAnswer: currentMatrix.singleQuestionAnswer,
        mobileLayout: currentMatrix.mobileLayout,
        optionLimit: { ...currentMatrix.optionLimit }
      }
    }
    if (isUploadLegacyQuestion(current.type)) nextQuestion.upload = { ...ensureUploadConfig(current) }
    surveyForm.questions.splice(index + 1, 0, normalizeQuestionForEditor(nextQuestion))
  }

  function addOptionAt(question: SurveyEditorQuestion, at: number) {
    if (!Array.isArray(question.options)) question.options = []
    question.options.splice(at, 0, `选项${question.options.length + 1}`)
    const current = question as any
    current.optionExtras = Array.isArray(current.optionExtras) ? current.optionExtras : []
    current.optionExtras.splice(at, 0, createDefaultOptionExtra())
  }

  function toggleDesc(question: SurveyEditorQuestion, optionIndex: number) {
    const extra = ensureOptionExtras(question, optionIndex)
    extra.hasDesc = !extra.hasDesc
    if (!extra.hasDesc) extra.desc = ''
  }

  function toggleHidden(question: SurveyEditorQuestion, optionIndex: number) {
    const extra = ensureOptionExtras(question, optionIndex)
    if (!extra.hidden) {
      const optionLogic = question.optionLogic?.[optionIndex]
      const hasOptionLogic = Array.isArray(optionLogic) && optionLogic.length > 0
      const hasJumpByOption = !!(question?.jumpLogic?.byOption && String(question.jumpLogic.byOption[String(optionIndex + 1)] || '') !== '')
      if (hasOptionLogic || hasJumpByOption) {
        alert('该选项已配置逻辑关系，不能直接隐藏。')
        return
      }
    }
    extra.hidden = !extra.hidden
  }

  function toggleCategory(category: keyof typeof categoryExpanded) {
    categoryExpanded[category] = !categoryExpanded[category]
  }

  const hintOpenState = reactive<Record<string, boolean>>({})
  const isHintOpen = (question: SurveyEditorQuestion) => !!hintOpenState[question.id]
  const setHintOpen = (question: SurveyEditorQuestion, value: boolean) => {
    hintOpenState[question.id] = !!value
  }
  const toggleHint = (question: SurveyEditorQuestion) => setHintOpen(question, !isHintOpen(question))
  const onHintCheckboxChange = (question: SurveyEditorQuestion, event: Event) => {
    const target = event.target as HTMLInputElement
    setHintOpen(question, !!target.checked)
  }

  function buildServerQuestionPayload(
    question: SurveyEditorQuestion,
    index: number,
    options: {
      includeCrossQuestionLogic?: boolean
      questionList?: SurveyEditorQuestion[]
    } = {}
  ) {
    const includeCrossQuestionLogic = options.includeCrossQuestionLogic !== false
    const questionList = Array.isArray(options.questionList) && options.questionList.length > 0
      ? options.questionList
      : surveyForm.questions
    const idToOrder = Object.fromEntries(questionList.map((item, questionIndex) => [String(item.id), String(questionIndex + 1)]))
    const base: any = {
      uiType: Number((question as any).uiType ?? question.type),
      type: mapLegacyTypeToServer(question.type),
      title: question.title,
      ...(question.titleHtml ? { titleHtml: question.titleHtml } : {}),
      description: question.description,
      required: question.required,
      order: index + 1,
      hideSystemNumber: !!question.hideSystemNumber
    }

    if (question.examConfig && typeof question.examConfig === 'object') {
      const examScore = Number(question.examConfig.score || 0)
      if (Number.isFinite(examScore) || question.examConfig.correctAnswer !== undefined) {
        base.examConfig = {
          ...(Number.isFinite(examScore) ? { score: examScore } : {}),
          ...(question.examConfig.correctAnswer !== undefined
            ? { correctAnswer: cloneJsonValue(question.examConfig.correctAnswer) }
            : {})
        }
      }
    }

    if (question.validation && typeof question.validation === 'object') {
      base.validation = { ...question.validation }
    }

    const isOptionType = ['radio', 'checkbox', 'ranking', 'matrix', 'ratio'].includes(base.type)
    if (isOptionType) {
      base.options = (question.options || []).map((label, optionIndex) => {
        const extra: any = (question as any).optionExtras?.[optionIndex] || {}
        return {
          label,
          value: String(optionIndex + 1),
          order: optionIndex + 1,
          quotaLimit: Number(extra.quotaLimit || 0),
          quotaEnabled: extra.quotaEnabled !== false,
          rich: !!extra.rich,
          desc: extra.hasDesc ? extra.desc || '' : '',
          exclusive: !!extra.exclusive,
          defaultSelected: !!extra.defaultSelected,
          hidden: !!extra.hidden,
          fillEnabled: !!extra.fillEnabled,
          fillRequired: !!extra.fillRequired,
          fillPlaceholder: extra.fillPlaceholder || ''
        }
      })
      base.optionOrder = question.optionOrder || 'none'

      if (Array.isArray((question as any).optionGroups) && (question as any).optionGroups.length > 0) {
        base.optionGroups = (question as any).optionGroups
          .map((group: any) => ({
            name: String(group?.name ?? ''),
            from: Number(group?.from ?? NaN),
            to: Number(group?.to ?? NaN),
            random: !!group?.random
          }))
          .filter((group: any) => Number.isFinite(group.from) && Number.isFinite(group.to) && group.from >= 1 && group.to >= group.from)
      }
      if ((question as any).groupOrderRandom != null) base.groupOrderRandom = !!(question as any).groupOrderRandom
      if ((question as any).quotasEnabled != null) base.quotasEnabled = !!(question as any).quotasEnabled
      if ((question as any).quotaMode) base.quotaMode = (question as any).quotaMode
      if ((question as any).quotaFullText != null) base.quotaFullText = String((question as any).quotaFullText || '')
      if ((question as any).quotaShowRemaining != null) base.quotaShowRemaining = !!(question as any).quotaShowRemaining
      if ((question as any).autoSelectOnAppear) base.autoSelectOnAppear = true

      if (includeCrossQuestionLogic && Array.isArray((question as any).optionLogic)) {
        base.options = base.options.map((option: any, optionIndex: number) => {
          const optionGroups = (question as any).optionLogic?.[optionIndex]
          if (!Array.isArray(optionGroups) || optionGroups.length === 0) return option
          const mappedGroups = optionGroups.map((group: any[]) =>
            (group || []).map((condition: any) => {
              const depLocalId = String(condition.qid)
              const depIndex = questionList.findIndex(item => String(item.id) === depLocalId || String(item.id) === String(condition.qid))
              const depQuestion = questionList[depIndex]
              let value: any = condition.value
              if (depQuestion && Array.isArray(depQuestion.options) && depQuestion.options.length > 0) {
                const labelToValue = new Map<string, string>()
                depQuestion.options.forEach((depLabel: string, depOptionIndex: number) => {
                  labelToValue.set(String(depLabel), String(depOptionIndex + 1))
                })
                const mapValue = (raw: any) => {
                  const stringValue = String(raw)
                  if (/^\d+$/.test(stringValue)) return stringValue
                  return labelToValue.get(stringValue) || stringValue
                }
                value = Array.isArray(condition.value) ? condition.value.map(mapValue) : mapValue(condition.value)
              }
              return {
                qid: idToOrder[String(condition.qid)] || String(condition.qid),
                op: condition.op,
                value
              }
            })
          )
          return { ...option, visibleWhen: mappedGroups }
        })
      }

      if (includeCrossQuestionLogic && (question as any).jumpLogic) base.jumpLogic = (question as any).jumpLogic
    }

    if (base.type === 'matrix') {
      const matrix = ensureMatrixConfig(question)
      base.matrix = {
        selectionType: matrix.selectionType,
        rowTitleWidth: matrix.rowTitleWidth || '30%',
        rightRowTitle: !!matrix.rightRowTitle,
        rowTitleRandom: !!matrix.rowTitleRandom,
        verticalSelect: !!matrix.verticalSelect,
        singleQuestionAnswer: !!matrix.singleQuestionAnswer,
        mobileLayout: matrix.mobileLayout || 'auto',
        optionLimit: {
          enabled: !!matrix.optionLimit?.enabled,
          min: Number(matrix.optionLimit?.min || 0),
          max: Number(matrix.optionLimit?.max || 0)
        },
        rows: matrix.rows.map((label: string, rowIndex: number) => ({
          label,
          value: String(rowIndex + 1),
          order: rowIndex + 1
        }))
      }
    }

    if (base.type === 'multi_input') {
      const multiFill = ensureMultiFillConfig(question)
      base.multiFill = {
        items: multiFill.items.map((label: string, itemIndex: number) => {
          const normalizedLabel = String(label || '').trim() || `填空${itemIndex + 1}`
          return {
            label: normalizedLabel,
            value: String(itemIndex + 1),
            order: itemIndex + 1,
            placeholder: '',
            required: true
          }
        })
      }
    }

    if (base.type === 'rating') {
      const validation = ensureRatingValidation(question)
      base.validation = {
        ...base.validation,
        min: validation.min,
        max: validation.max,
        step: 1
      }
    }

    if (base.type === 'scale') {
      const validation = ensureScaleValidation(question)
      base.validation = {
        ...base.validation,
        min: validation.min,
        max: validation.max,
        step: validation.step,
        minLabel: validation.minLabel || '',
        maxLabel: validation.maxLabel || ''
      }
    }

    if (includeCrossQuestionLogic && (question as any).logic?.visibleWhen) {
      const mapped = (question as any).logic.visibleWhen.map((group: any[]) =>
        (group || []).map((condition: any) => {
          const depLocalId = String(condition.qid)
          const depIndex = questionList.findIndex(item => String(item.id) === depLocalId || String(item.id) === String(condition.qid))
          const depQuestion = questionList[depIndex]
          let value: any = condition.value
          if (depQuestion && Array.isArray(depQuestion.options) && depQuestion.options.length > 0) {
            const labelToValue = new Map<string, string>()
            depQuestion.options.forEach((label: string, depOptionIndex: number) => {
              labelToValue.set(String(label), String(depOptionIndex + 1))
            })
            const mapValue = (raw: any) => {
              const stringValue = String(raw)
              if (/^\d+$/.test(stringValue)) return stringValue
              return labelToValue.get(stringValue) || stringValue
            }
            value = Array.isArray(condition.value) ? condition.value.map(mapValue) : mapValue(condition.value)
          }
          return {
            qid: idToOrder[String(condition.qid)] || String(condition.qid),
            op: condition.op,
            value
          }
        })
      )
      base.logic = { visibleWhen: mapped }
    }

    return base
  }

  function buildQuestionBankPayload(questionIndex: number, metadata: QuestionBankExportMetadata = {}): QuestionBankQuestionFormDTO | null {
    const question = surveyForm.questions[questionIndex]
    if (!question) return null

    const exportedQuestion = buildServerQuestionPayload(question, questionIndex, { includeCrossQuestionLogic: false })
    const title = String(question.title || getQuestionTypeLabel(question.type)).trim() || getQuestionTypeLabel(question.type)
    const description = String(question.description || '').trim()
    const rawScore = question.examConfig && typeof question.examConfig === 'object'
      ? Number(question.examConfig.score || 0)
      : NaN
    const hasScore = Number.isFinite(rawScore)
    const normalizedTags = mergeUniqueTextList(
      question.tags,
      metadata.tags,
      question.aiMeta ? [QUESTION_BANK_AI_TAG] : undefined
    ) || []
    const normalizedKnowledgePoints = Array.isArray(metadata.knowledgePoints) ? metadata.knowledgePoints.map(item => String(item).trim()).filter(Boolean) : []
    const normalizedApplicableScenes = Array.isArray(metadata.applicableScenes) ? metadata.applicableScenes.map(item => String(item).trim()).filter(Boolean) : []
    const normalizedAiMeta = mergeAiMeta(
      question.aiMeta,
      metadata.aiMeta && isPlainObject(metadata.aiMeta) ? metadata.aiMeta : undefined
    )
    const topLevelOptions = serverQuestionTypeHasOptions(exportedQuestion.type) && Array.isArray(exportedQuestion.options)
      ? exportedQuestion.options.map((option: any) => ({
          label: String(option?.label ?? ''),
          value: option?.value == null ? undefined : String(option.value),
          ...(option?.desc ? { desc: String(option.desc) } : {})
        }))
      : undefined

    return {
      title,
      type: exportedQuestion.type,
      ...(hasScore ? { score: rawScore } : {}),
      ...(question.examConfig?.correctAnswer !== undefined
        ? { correctAnswer: cloneJsonValue(question.examConfig.correctAnswer) }
        : {}),
      stem: title,
      ...(description ? { analysis: description } : {}),
      ...(normalizedTags.length > 0 ? { tags: normalizedTags } : {}),
      ...(normalizedKnowledgePoints.length > 0 ? { knowledgePoints: normalizedKnowledgePoints } : {}),
      ...(normalizedApplicableScenes.length > 0 ? { applicableScenes: normalizedApplicableScenes } : {}),
      ...(normalizedAiMeta ? { aiMeta: normalizedAiMeta } : {}),
      ...(topLevelOptions && topLevelOptions.length > 0 ? { options: topLevelOptions } : {}),
      content: {
        title,
        questionType: exportedQuestion.type,
        stem: title,
        ...(description ? { analysis: description } : {}),
        ...(normalizedTags.length > 0 ? { tags: normalizedTags } : {}),
        ...(normalizedKnowledgePoints.length > 0 ? { knowledgePoints: normalizedKnowledgePoints } : {}),
        ...(normalizedApplicableScenes.length > 0 ? { applicableScenes: normalizedApplicableScenes } : {}),
        ...(hasScore ? { score: rawScore } : {}),
        ...(question.examConfig?.correctAnswer !== undefined
          ? { correctAnswer: cloneJsonValue(question.examConfig.correctAnswer) }
          : {}),
        ...(topLevelOptions && topLevelOptions.length > 0 ? { options: cloneJsonValue(topLevelOptions) } : {}),
        ...(normalizedAiMeta ? { aiMeta: normalizedAiMeta } : {}),
        surveyQuestion: exportedQuestion
      }
    }
  }

  function buildServerSurveyPayload(draft: {
    title: string
    description: string
    questions: SurveyEditorQuestion[]
  }) {
    const questions = draft.questions.map((question, index) => buildServerQuestionPayload(question, index, {
      questionList: draft.questions
    }))

    return {
      title: draft.title,
      description: draft.description,
      questions,
      settings: {
        ...surveyForm.settings,
        endTime: surveyForm.endTime || '',
        submitOnce: !surveyForm.settings.allowMultipleSubmissions
      }
    }
  }

  function toServerPayload() {
    return buildServerSurveyPayload({
      title: surveyForm.title,
      description: surveyForm.description,
      questions: surveyForm.questions
    })
  }

  onMounted(async () => {
    const initTitle = (route.query?.title as string) || ''
    if (initTitle && !surveyForm.title) surveyForm.title = initTitle

    const initTab = (route.query?.tab as string) || ''
    if (['edit', 'preview', 'answers', 'settings'].includes(initTab)) {
      currentTab.value = initTab as 'edit' | 'preview' | 'answers' | 'settings'
    }

    const editingId = route.params?.id as string | undefined
    if (!editingId) return

    try {
      const survey = await getSurveyRaw(String(editingId))
      surveyForm.title = survey.title || ''
      surveyForm.description = survey.description || ''
      surveyForm.settings = {
        ...surveyForm.settings,
        ...(survey.settings || {}),
        showProgress: survey?.settings?.showProgress !== false,
        allowMultipleSubmissions: !!survey?.settings?.allowMultipleSubmissions,
        randomizeQuestions: !!(survey as any)?.settings?.randomizeQuestions || !!(survey as any)?.settings?.randomOrder,
        collectIP: !!(survey as any)?.settings?.collectIP,
        submitOnce: (survey as any)?.settings?.submitOnce !== false
      }
      surveyForm.endTime = survey?.settings?.endTime || ''
      currentSurveyId.value = String(survey.id || editingId)
      shareId.value = String((survey as any).share_code || (survey as any).shareId || survey.id || '')

      try {
        const statsData = await getSurveyDetailStats(currentSurveyId.value)
        if (statsData) {
          Object.assign(answerStats, {
            total: statsData.total || 0,
            today: statsData.today || 0,
            avgScore: statsData.avgScore || 0,
            completionRate: statsData.completionRate || 0,
            completed: statsData.completed || 0,
            incomplete: statsData.incomplete || 0,
            avgTime: statsData.avgTime || '-'
          })
        }
      } catch (error) {
        console.warn('加载答卷统计失败，使用默认值。', error)
      }

      const sourceQuestions = Array.isArray(survey.questions) ? survey.questions : []
      surveyForm.questions = sourceQuestions.map((question: any) => buildEditorQuestionFromServerQuestion(question))

      const orderToLocalId: Record<string, string> = {}
      surveyForm.questions.forEach((question, index) => {
        orderToLocalId[String(sourceQuestions[index]?.order || index + 1)] = String(question.id)
      })

      sourceQuestions.forEach((question: any, index: number) => {
        const visibleWhen = question?.logic?.visibleWhen
        if (!Array.isArray(visibleWhen) || visibleWhen.length === 0) return
        const mapped = visibleWhen.map((group: any[]) =>
          (group || []).map((condition: any) => {
            const localQuestionId = orderToLocalId[String(condition.qid)] || String(condition.qid)
            const depIndex = surveyForm.questions.findIndex(item => String(item.id) === localQuestionId)
            const depQuestion = surveyForm.questions[depIndex]
            let value = condition.value
            if (depQuestion && Array.isArray(depQuestion.options) && depQuestion.options.length > 0) {
              const valueToLabel = new Map<string, string>()
              depQuestion.options.forEach((label: string, optionIndex: number) => {
                valueToLabel.set(String(optionIndex + 1), String(label))
              })
              const restoreValue = (raw: any) => valueToLabel.get(String(raw)) || String(raw)
              value = Array.isArray(condition.value) ? condition.value.map(restoreValue) : restoreValue(condition.value)
            }
            return { qid: localQuestionId, op: condition.op, value }
          })
        )
        ;(surveyForm.questions[index] as any).logic = { visibleWhen: mapped }
      })

      sourceQuestions.forEach((question: any, index: number) => {
        const options = Array.isArray(question.options) ? question.options : []
        if (!options.length) return
        const localQuestion: any = surveyForm.questions[index]
        localQuestion.optionLogic = localQuestion.optionLogic || []
        options.forEach((option: any, optionIndex: number) => {
          const groups = option?.visibleWhen
          if (!Array.isArray(groups) || groups.length === 0) return
          const mapped = groups.map((group: any[]) =>
            (group || []).map((condition: any) => {
              const localQuestionId = orderToLocalId[String(condition.qid)] || String(condition.qid)
              const depIndex = surveyForm.questions.findIndex(item => String(item.id) === localQuestionId)
              const depQuestion = surveyForm.questions[depIndex]
              let value = condition.value
              if (depQuestion && Array.isArray(depQuestion.options) && depQuestion.options.length > 0) {
                const valueToLabel = new Map<string, string>()
                depQuestion.options.forEach((label: string, depOptionIndex: number) => {
                  valueToLabel.set(String(depOptionIndex + 1), String(label))
                })
                const restoreValue = (raw: any) => valueToLabel.get(String(raw)) || String(raw)
                value = Array.isArray(condition.value) ? condition.value.map(restoreValue) : restoreValue(condition.value)
              }
              return { qid: localQuestionId, op: condition.op, value }
            })
          )
          localQuestion.optionLogic[optionIndex] = mapped
        })
      })
      surveyForm.questions.forEach(question => normalizeQuestionForEditor(question))
    } catch (error) {
      console.error('加载问卷失败', error)
    }
  })

  return {
    router,
    route,
    surveyForm,
    saving,
    panelTab,
    currentSurveyId,
    shareId,
    currentTab,
    showHeaderSettings,
    showAIHelper,
    aiPrompt,
    aiGenerating,
    editingIndex,
    answerStats,
    categoryExpanded,
    draggingIndex,
    dragOverIndex,
    dragOverPos,
    outlineListEl,
    showOutlineTip,
    renamingIndex,
    renameText,
    renameInputEl,
    errors,
    canPreview,
    canPublish,
    areAllNumbersHidden,
    computedShareLink,
    copyShareLink,
    validateForm,
    closeQuestionEdit,
    openQuestionEdit,
    getQuestionTypeLabel,
    goBack,
    getQuestionConfig,
    isStandaloneConfigType,
    isMatrixLegacyQuestion,
    isMultiFillLegacyQuestion,
    isSliderLegacyQuestion,
    isUploadLegacyQuestion,
    isRatingLegacyQuestion,
    isScaleLegacyQuestion,
    buildLegacyQuestion,
    createDefaultQuestion,
    importQuestionBankQuestion,
    ensureSliderValidation,
    getSliderValidation,
    normalizeSliderValidation,
    ensureRatingValidation,
    getRatingValidation,
    normalizeRatingValidation,
    ensureScaleValidation,
    getScaleValidation,
    normalizeScaleValidation,
    getScalePreviewValues,
    ensureMatrixConfig,
    getMatrixConfig,
    normalizeMatrixOptionLimit,
    isMatrixMultipleLegacyQuestion,
    isMatrixDropdownLegacyQuestion,
    addMatrixRow,
    insertMatrixRow,
    removeMatrixRow,
    addMatrixColumn,
    insertMatrixColumn,
    removeMatrixColumn,
    swapMatrixRowsAndOptions,
    matrixRowTitleWidthOptions: MATRIX_ROW_TITLE_WIDTH_OPTIONS,
    matrixMobileLayoutOptions: MATRIX_MOBILE_LAYOUT_OPTIONS,
    ensureMultiFillConfig,
    getMultiFillConfig,
    addMultiFillItem,
    addMultiFillItemAt,
    removeMultiFillItem,
    ensureUploadConfig,
    getUploadConfig,
    normalizeUploadConfig,
    uploadConfigSummary,
    getUploadRestrictionMode,
    setUploadRestrictionMode,
    addQuestionByType,
    hasOptions,
    addOption,
    removeOption,
    ensureOptionExtras,
    getOptionExtra,
    normalizeQuestionForEditor,
    isGroupConfigured,
    isScoreConfigured,
    moveQuestionUp,
    moveQuestionDown,
    generateByAI: generateByAIAutoValidated,
    onOutlineDragStart,
    onOutlineDragOver,
    onOutlineDrop,
    onOutlineDragEnd,
    startRename,
    confirmRename,
    duplicateQuestion,
    deleteQuestion,
    finishEdit,
    addQuestionAfter,
    addOptionAt,
    toggleDesc,
    toggleHidden,
    toggleCategory,
    isHintOpen,
    toggleHint,
    onHintCheckboxChange,
    buildQuestionBankPayload,
    toServerPayload
  }
}
