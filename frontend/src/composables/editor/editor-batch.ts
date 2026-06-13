import { computed, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { stripHtmlSimple as stripHtmlSimpleUtil } from '@/utils/html'
import type { SurveyEditorForm, SurveyEditorQuestion } from './editor-core'

interface EditorBatchOptions {
  surveyForm: SurveyEditorForm
  createDefaultQuestion: (type: number) => SurveyEditorQuestion
  ensureOptionExtras: (question: SurveyEditorQuestion, optionIndex: number) => any
  ensureMatrixConfig: (question: SurveyEditorQuestion) => { rows: string[] }
}

type BatchEditMode = 'options' | 'matrixRows'

export function useEditorBatch(options: EditorBatchOptions) {
  const { surveyForm, createDefaultQuestion, ensureOptionExtras, ensureMatrixConfig } = options

  const showBatchAddDialog = ref(false)
  const batchAddText = ref('')
  const batchAddTab = ref<'manual' | 'paste'>('manual')
  const batchAddQuestionType = ref<number>(3)

  const parsedQuestions = computed(() => {
    const text = batchAddText.value.trim()
    if (!text) return [] as Array<{ title: string; options: string[] }>

    const lines = text.split(/\r?\n/)
    const questions: Array<{ title: string; options: string[] }> = []
    let currentQuestion: { title: string; options: string[] } | null = null

    for (const rawLine of lines) {
      const line = rawLine.trim()
      if (!line) {
        if (currentQuestion) {
          questions.push(currentQuestion)
          currentQuestion = null
        }
        continue
      }

      const isQuestionLine = /^\d+[、.]/.test(line) || !currentQuestion
      if (isQuestionLine) {
        if (currentQuestion) questions.push(currentQuestion)
        currentQuestion = {
          title: line.replace(/^\d+[、.]\s*/, ''),
          options: []
        }
        continue
      }

      if (!currentQuestion) continue
      const option = line.replace(/^[A-Za-z][).、]?\s*/, '').replace(/^\d+[).、]?\s*/, '')
      if (option && !/^\d+$/.test(line)) currentQuestion.options.push(option)
    }

    if (currentQuestion) questions.push(currentQuestion)
    return questions
  })

  function openBatchAddDialog() {
    batchAddText.value = ''
    batchAddTab.value = 'manual'
    batchAddQuestionType.value = 3
    showBatchAddDialog.value = true
  }

  function closeBatchAddDialog() {
    showBatchAddDialog.value = false
  }

  watch(batchAddTab, newTab => {
    if (newTab === 'paste') batchAddText.value = ''
  })

  function showAISuggestion() {
    ElMessage.info('AI 自动生成答案功能开发中')
  }

  function saveBatchAddQuestions() {
    if (parsedQuestions.value.length === 0) {
      ElMessage.warning('请输入题目内容')
      return
    }

    parsedQuestions.value.forEach(questionDraft => {
      let type = 1
      if (questionDraft.options && questionDraft.options.length > 0) type = 3
      const question = createDefaultQuestion(type)
      question.title = questionDraft.title
      if (questionDraft.options && questionDraft.options.length > 0) question.options = questionDraft.options
      surveyForm.questions.push(question)
    })

    ElMessage.success(`成功导入 ${parsedQuestions.value.length} 个题目`)
    closeBatchAddDialog()
  }

  const showBatchDialog = ref(false)
  const batchTargetIndex = ref<number | null>(null)
  const batchEditMode = ref<BatchEditMode>('options')
  const batchText = ref('')
  const batchLineCount = computed(() => batchText.value.split(/\r?\n/).filter(line => line.trim() !== '').length)
  const batchDialogTitle = computed(() => batchEditMode.value === 'matrixRows' ? '行标题' : '编辑选项')
  const batchDialogPlaceholder = computed(() => batchEditMode.value === 'matrixRows'
    ? '每行一个行标题；空行自动忽略；可直接粘贴Excel的一列'
    : '每行一个选项；空行自动忽略；可直接粘贴Excel的一列')
  const showBatchPresets = computed(() => batchEditMode.value === 'options')

  const presetDefs: Record<string, string[]> = {
    满意度: ['很不满意', '不满意', '一般', '满意', '很满意'],
    认同度: ['很不同意', '不同意', '一般', '同意', '很同意'],
    重要度: ['很不重要', '不重要', '一般', '重要', '很重要'],
    符合度: ['很不符合', '不符合', '一般', '符合', '很符合'],
    可能性: ['很不可能', '不可能', '一般', '可能', '很可能'],
    性别: ['男', '女', '其他', '保密'],
    是否: ['是', '否'],
    '是/否/不确定': ['是', '否', '不确定'],
    满意度5分: ['非常满意', '满意', '一般', '不满意', '非常不满意'],
    Likert5分: ['非常不同意', '不同意', '一般', '同意', '非常同意'],
    数字1到10: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'],
    星期: ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
  }
  const presetNames = Object.keys(presetDefs)

  function usePreset(name: string) {
    batchText.value = (presetDefs[name] || []).join('\n')
  }

  function stripHtmlSimple(html: string) {
    return stripHtmlSimpleUtil(html)
  }

  function openBatchEdit(index: number, mode: BatchEditMode = 'options') {
    batchTargetIndex.value = index
    batchEditMode.value = mode
    const question = surveyForm.questions[index]
    if (mode === 'matrixRows') {
      batchText.value = ensureMatrixConfig(question).rows.join('\n')
      showBatchDialog.value = true
      return
    }
    const lines = (Array.isArray(question.options) ? question.options : []).map((option, optionIndex) => {
      const extra = ensureOptionExtras(question, optionIndex)
      if (extra?.rich) return stripHtmlSimple(String(option || ''))
      return String(option || '')
    })
    batchText.value = lines.join('\n')
    showBatchDialog.value = true
  }

  function openMatrixRowsBatchEdit(index: number) {
    openBatchEdit(index, 'matrixRows')
  }

  function closeBatchDialog() {
    showBatchDialog.value = false
  }

  async function saveBatchEdit() {
    const index = batchTargetIndex.value
    if (index == null) return
    const question: any = surveyForm.questions[index]
    const cleanLine = (value: string) =>
      value
        .replace(/^\s*[A-Za-z]\s*[.、]\s*/, '')
        .replace(/^\s*\d+\s*[.、]\s*/, '')
        .replace(/^\s*[（(][一二三四五六七八九十0-9A-Za-z]+[)）]\s*/, '')
        .trim()

    const nextOptions = batchText.value
      .split(/\r?\n/)
      .map(line => cleanLine(line))
      .filter(Boolean)

    if (batchEditMode.value === 'matrixRows') {
      if (nextOptions.length === 0) {
        await ElMessageBox.alert('请至少填写一行标题', '无法保存', { type: 'warning' })
        return
      }
      ensureMatrixConfig(question).rows = [...nextOptions]
      showBatchDialog.value = false
      ElMessage.success('已批量更新行标题')
      return
    }

    const isMatrixQuestion = [20, 21, 22, 24].includes(Number(question?.type))
    if (nextOptions.length < (isMatrixQuestion ? 2 : 1)) {
      await ElMessageBox.alert(isMatrixQuestion ? '矩阵题请至少填写两列选项' : '请至少填写一行选项', '无法保存', { type: 'warning' })
      return
    }

    const hasOptionLogic = Array.isArray(question.optionLogic) && question.optionLogic.some((group: any) => Array.isArray(group) && group.length > 0)
    const hasJumpByOption = !!(question?.jumpLogic?.byOption && Object.keys(question.jumpLogic.byOption).length > 0)
    if (hasOptionLogic || hasJumpByOption) {
      try {
        await ElMessageBox.confirm('批量保存会覆盖现有选项，并清空该题目的选项逻辑和按选项跳题，是否继续？', '提示', { type: 'warning' })
      } catch {
        return
      }
    }

    question.options = [...nextOptions]
    question.optionExtras = nextOptions.map(() => ({
      rich: false,
      hasDesc: false,
      desc: '',
      exclusive: false,
      defaultSelected: false,
      hidden: false,
      fillEnabled: false,
      fillRequired: false,
      fillPlaceholder: ''
    }))
    if (question.optionLogic) question.optionLogic = []
    if (question.jumpLogic?.byOption) question.jumpLogic.byOption = {}

    showBatchDialog.value = false
    ElMessage.success('已批量更新选项')
  }

  const showGroupDialog = ref(false)
  const groupTargetIndex = ref<number | null>(null)
  const groupRows = ref<Array<{ name: string; from: number; to: number; random?: boolean }>>([])
  const groupOrderRandom = ref(false)
  const groupSourceOptions = ref<any[]>([])
  const showGroupNameDialog = ref(false)
  const groupNameInput = ref('')
  let pendingGroupIndex: number | null = null

  function openGroupDialog(index: number) {
    groupTargetIndex.value = index
    const question: any = surveyForm.questions[index]
    groupSourceOptions.value = Array.isArray(question.options) ? question.options : []
    const sourceGroups = Array.isArray(question.optionGroups) ? question.optionGroups : []
    groupRows.value = sourceGroups.map((group: any) => ({
      name: String(group.name || ''),
      from: Number(group.from || NaN),
      to: Number(group.to || NaN),
      random: !!group.random
    }))
    groupOrderRandom.value = !!question.groupOrderRandom
    showGroupDialog.value = true
  }

  function closeGroupDialog() {
    showGroupDialog.value = false
  }

  function addGroupRow() {
    pendingGroupIndex = null
    groupNameInput.value = ''
    showGroupNameDialog.value = true
  }

  function removeGroupRow(index: number) {
    groupRows.value.splice(index, 1)
  }

  function editGroupName(index: number) {
    pendingGroupIndex = index
    groupNameInput.value = groupRows.value[index]?.name || ''
    showGroupNameDialog.value = true
  }

  function cancelGroupName() {
    showGroupNameDialog.value = false
    pendingGroupIndex = null
  }

  function minStartFor(groupIndex: number) {
    let maxEnd = 1
    for (let index = 0; index < groupIndex; index += 1) {
      const row = groupRows.value[index]
      const from = Number(row?.from || 0)
      const to = Number(row?.to || 0)
      if (from > 0 && to > 0 && to >= from) maxEnd = Math.max(maxEnd, to + 1)
    }
    return maxEnd
  }

  function confirmGroupName() {
    const name = groupNameInput.value.trim()
    if (pendingGroupIndex == null) {
      const total = groupSourceOptions.value.length
      const start = minStartFor(groupRows.value.length)
      if (start > total) {
        ElMessage.warning('没有可用选项了，无法继续新增分组')
        showGroupNameDialog.value = false
        pendingGroupIndex = null
        return
      }
      groupRows.value.push({ name, from: start, to: start, random: false })
    } else if (groupRows.value[pendingGroupIndex]) {
      groupRows.value[pendingGroupIndex].name = name
    }
    showGroupNameDialog.value = false
    pendingGroupIndex = null
  }

  function normalizeGroupRow(groupIndex: number) {
    const row = groupRows.value[groupIndex]
    if (!row) return
    const minStart = minStartFor(groupIndex)
    if ((row.from || 0) < minStart) row.from = minStart
    if ((row.to || 0) < row.from) row.to = row.from
  }

  function saveGroupDialog() {
    if (groupTargetIndex.value == null) return
    const question: any = surveyForm.questions[groupTargetIndex.value]
    question.optionGroups = groupRows.value
      .map(row => ({
        name: row.name.trim(),
        from: Math.min(row.from || 0, row.to || 0),
        to: Math.max(row.from || 0, row.to || 0),
        random: !!row.random
      }))
      .filter(row => row.from > 0 && row.to > 0 && row.to >= row.from)
    question.groupOrderRandom = !!groupOrderRandom.value
    showGroupDialog.value = false
  }

  function displayGroupName(name?: string) {
    const value = String(name || '')
    return value.startsWith('#') ? value.slice(1) : value
  }

  function groupHeaderFor(question: any, optionIndex: number): string | '' {
    const groups: any[] = Array.isArray(question?.optionGroups) ? question.optionGroups : []
    for (const group of groups) {
      const from = Number(group?.from || 0)
      const to = Number(group?.to || 0)
      if (from > 0 && to > 0 && to >= from && optionIndex === from - 1) {
        return displayGroupName(group?.name)
      }
    }
    return ''
  }

  return {
    showBatchAddDialog,
    openBatchAddDialog,
    closeBatchAddDialog,
    batchAddTab,
    batchAddText,
    parsedQuestions,
    showAISuggestion,
    saveBatchAddQuestions,
    showBatchDialog,
    openBatchEdit,
    openMatrixRowsBatchEdit,
    closeBatchDialog,
    batchEditMode,
    batchDialogTitle,
    batchDialogPlaceholder,
    batchText,
    batchLineCount,
    showBatchPresets,
    presetNames,
    usePreset,
    saveBatchEdit,
    showGroupDialog,
    openGroupDialog,
    closeGroupDialog,
    groupRows,
    addGroupRow,
    editGroupName,
    removeGroupRow,
    groupSourceOptions,
    minStartFor,
    normalizeGroupRow,
    groupOrderRandom,
    saveGroupDialog,
    showGroupNameDialog,
    cancelGroupName,
    groupNameInput,
    confirmGroupName,
    groupHeaderFor
  }
}
