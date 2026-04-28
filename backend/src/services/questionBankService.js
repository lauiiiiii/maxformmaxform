import ExcelJS from 'exceljs'
import { throwManagementError, throwManagementPolicyError } from '../http/managementErrors.js'
import { getAuthenticatedActorPolicy } from '../policies/actorPolicy.js'
import questionBankRepository from '../repositories/questionBankRepository.js'
import {
  ensurePlainObjectPayload,
  isPlainObject,
  normalizeOptionalBoolean,
  normalizeOptionalNumber,
  normalizeOptionalStringArray,
  normalizeOptionalTrimmedString,
  normalizeRequiredTrimmedString
} from '../utils/managementPayload.js'
import { recordManagementAction, runManagementTransaction } from './activity.js'
import { normalizeServerQuestionType, serverQuestionTypeHasOptions, SUPPORTED_SERVER_TYPES } from '../../../shared/questionTypeRegistry.js'
import { isAdmin } from '../policies/accessPolicy.js'
import {
  createQuestionBankQuestionDto,
  createQuestionBankRepoDto,
  MANAGEMENT_ERROR_CODES
} from '../../../shared/management.contract.js'

const QUESTION_BANK_AI_TAG = 'AI生成'
const QUESTION_BANK_IMPORT_FILE_MAX_BYTES = 10 * 1024 * 1024
const QUESTION_BANK_IMPORT_TEXT_FORMATS = new Set(['text', 'txt'])
const QUESTION_BANK_IMPORT_JSON_FORMATS = new Set(['json'])
const QUESTION_BANK_IMPORT_EXCEL_FORMATS = new Set(['xlsx', 'xls', 'excel'])
const QUESTION_BANK_EXPORT_FORMATS = new Set(['json', 'txt', 'xlsx'])
const QUESTION_IMPORT_FIELD_ALIASES = Object.freeze({
  title: 'title',
  标题: 'title',
  题目: 'title',
  name: 'title',
  type: 'type',
  类型: 'type',
  stem: 'stem',
  题干: 'stem',
  题面: 'stem',
  description: 'analysis',
  analysis: 'analysis',
  解析: 'analysis',
  difficulty: 'difficulty',
  难度: 'difficulty',
  score: 'score',
  分值: 'score',
  points: 'score',
  options: 'options',
  option: 'options',
  选项: 'options',
  answers: 'correctAnswer',
  answer: 'correctAnswer',
  正确答案: 'correctAnswer',
  答案: 'correctAnswer',
  tags: 'tags',
  标签: 'tags',
  knowledgepoints: 'knowledgePoints',
  knowledgepoint: 'knowledgePoints',
  知识点: 'knowledgePoints',
  applicablescenes: 'applicableScenes',
  scenes: 'applicableScenes',
  scene: 'applicableScenes',
  场景: 'applicableScenes',
  applicableScenes: 'applicableScenes',
  aimeta: 'aiMeta',
  aiMeta: 'aiMeta'
})

function ensureQuestionBankActor(actor) {
  throwManagementPolicyError(getAuthenticatedActorPolicy(actor))
}

function resolveRepoScope(actor) {
  ensureQuestionBankActor(actor)
  return isAdmin(actor) ? {} : { creator_id: Number(actor.sub) }
}

function normalizeRepoName(name, { required = false } = {}) {
  if (name === undefined) {
    if (required) {
      throwManagementError(400, MANAGEMENT_ERROR_CODES.QUESTION_BANK_REPO_NAME_REQUIRED, 'Question bank repo name is required')
    }
    return undefined
  }
  return normalizeRequiredTrimmedString(name, {
    field: 'name',
    code: MANAGEMENT_ERROR_CODES.QUESTION_BANK_REPO_NAME_REQUIRED,
    message: 'Question bank repo name is required'
  })
}

function normalizeOptionalText(value) {
  return normalizeOptionalTrimmedString(value, {
    field: 'text',
    allowNull: true,
    emptyToNull: true
  })
}

function normalizeQuestionTitle(title) {
  return normalizeRequiredTrimmedString(title, {
    field: 'title',
    code: MANAGEMENT_ERROR_CODES.QUESTION_BANK_QUESTION_TITLE_REQUIRED,
    message: 'Question title is required'
  })
}

function normalizeScore(score) {
  try {
    return normalizeOptionalNumber(score, { field: 'score', allowNull: true })
  } catch (error) {
    if (error?.code === MANAGEMENT_ERROR_CODES.INVALID_PAYLOAD) {
      throwManagementError(400, MANAGEMENT_ERROR_CODES.QUESTION_BANK_QUESTION_SCORE_INVALID, 'Question score is invalid')
    }
    throw error
  }
}

function cloneJsonValue(value) {
  if (value === undefined) return undefined
  if (value === null) return null
  if (Array.isArray(value)) return value.map(cloneJsonValue).filter(item => item !== undefined)
  if (isPlainObject(value)) {
    return Object.keys(value).reduce((result, key) => {
      const cloned = cloneJsonValue(value[key])
      if (cloned !== undefined) result[key] = cloned
      return result
    }, {})
  }
  if (['string', 'number', 'boolean'].includes(typeof value)) return value
  return String(value)
}

const QUESTION_BANK_TYPE_ALIASES = Object.freeze({
  single: 'radio',
  multiple: 'checkbox',
  text: 'input',
  essay: 'textarea',
  select: 'radio',
  dropdown: 'radio'
})

function normalizeQuestionType(type) {
  const normalized = normalizeOptionalTrimmedString(type, {
    field: 'type',
    allowNull: true,
    emptyToNull: true
  })
  if (normalized == null) return normalized
  const alias = QUESTION_BANK_TYPE_ALIASES[normalized]
  if (alias) return alias
  return SUPPORTED_SERVER_TYPES.includes(normalized) ? normalizeServerQuestionType(normalized) : normalized
}

function normalizeQuestionOption(option, index) {
  if (typeof option === 'string') {
    const label = option.trim()
    if (!label) {
      throwManagementError(400, MANAGEMENT_ERROR_CODES.QUESTION_BANK_QUESTION_CONTENT_INVALID, `content.options[${index}] label is required`)
    }
    return {
      label,
      value: String(index + 1)
    }
  }

  if (!isPlainObject(option)) {
    throwManagementError(400, MANAGEMENT_ERROR_CODES.QUESTION_BANK_QUESTION_CONTENT_INVALID, `content.options[${index}] must be an object or string`)
  }

  const label = String(option.label ?? option.text ?? '').trim()
  if (!label) {
    throwManagementError(400, MANAGEMENT_ERROR_CODES.QUESTION_BANK_QUESTION_CONTENT_INVALID, `content.options[${index}] label is required`)
  }

  return {
    ...cloneJsonValue(option),
    label,
    value: String(option.value ?? index + 1)
  }
}

function normalizeQuestionOptions(options) {
  if (options === undefined) return undefined
  if (!Array.isArray(options)) {
    throwManagementError(400, MANAGEMENT_ERROR_CODES.QUESTION_BANK_QUESTION_CONTENT_INVALID, 'content.options must be an array')
  }

  return options.map((option, index) => normalizeQuestionOption(option, index))
}

function normalizeOptionalStringList(value, field) {
  if (value === undefined) return undefined
  if (typeof value === 'string') {
    return value.split(/[,\n|]/).map(item => item.trim()).filter(Boolean)
  }
  return normalizeOptionalStringArray(value, { field })
}

function mergeQuestionTags(tags, aiMeta) {
  const normalizedTags = Array.isArray(tags)
    ? tags.map(item => String(item || '').trim()).filter(Boolean)
    : []

  if (isPlainObject(aiMeta) && Object.keys(aiMeta).length > 0 && !normalizedTags.includes(QUESTION_BANK_AI_TAG)) {
    normalizedTags.push(QUESTION_BANK_AI_TAG)
  }

  return normalizedTags.length > 0 ? Array.from(new Set(normalizedTags)) : undefined
}

function normalizeQuestionContent(content) {
  if (content === undefined) return undefined
  if (content === null) return null
  if (!isPlainObject(content)) {
    throwManagementError(400, MANAGEMENT_ERROR_CODES.QUESTION_BANK_QUESTION_CONTENT_INVALID, 'Question content must be an object')
  }

  const normalized = cloneJsonValue(content)
  if (normalized.title !== undefined) {
    normalized.title = normalizeOptionalTrimmedString(normalized.title, {
      field: 'content.title',
      allowNull: false,
      emptyToNull: false
    })
  }
  if (normalized.questionType !== undefined) {
    normalized.questionType = normalizeQuestionType(normalized.questionType)
  }
  if (normalized.stem !== undefined) {
    normalized.stem = normalizeOptionalTrimmedString(normalized.stem, {
      field: 'content.stem',
      allowNull: true,
      emptyToNull: true
    })
  }
  if (normalized.analysis !== undefined) {
    normalized.analysis = normalizeOptionalTrimmedString(normalized.analysis, {
      field: 'content.analysis',
      allowNull: true,
      emptyToNull: true
    })
  }
  if (normalized.difficulty !== undefined) {
    normalized.difficulty = normalizeOptionalTrimmedString(normalized.difficulty, {
      field: 'content.difficulty',
      allowNull: true,
      emptyToNull: true
    })
  }
  if (normalized.score !== undefined) {
    normalized.score = normalizeScore(normalized.score)
  }
  if (normalized.tags !== undefined) {
    normalized.tags = normalizeOptionalStringList(normalized.tags, 'content.tags')
  }
  if (normalized.knowledgePoints !== undefined) {
    normalized.knowledgePoints = normalizeOptionalStringList(normalized.knowledgePoints, 'content.knowledgePoints')
  }
  if (normalized.applicableScenes !== undefined) {
    normalized.applicableScenes = normalizeOptionalStringList(normalized.applicableScenes, 'content.applicableScenes')
  }
  if (normalized.options !== undefined) {
    normalized.options = normalizeQuestionOptions(normalized.options)
  }
  if (normalized.surveyQuestion !== undefined && normalized.surveyQuestion !== null && !isPlainObject(normalized.surveyQuestion)) {
    throwManagementError(400, MANAGEMENT_ERROR_CODES.QUESTION_BANK_QUESTION_CONTENT_INVALID, 'content.surveyQuestion must be an object')
  }
  if (normalized.aiMeta !== undefined && normalized.aiMeta !== null && !isPlainObject(normalized.aiMeta)) {
    throwManagementError(400, MANAGEMENT_ERROR_CODES.QUESTION_BANK_QUESTION_CONTENT_INVALID, 'content.aiMeta must be an object')
  }

  return normalized
}

function normalizeRepoContent(content) {
  if (content === undefined) return undefined
  if (content === null) return null
  if (!isPlainObject(content)) {
    throwManagementError(400, MANAGEMENT_ERROR_CODES.INVALID_PAYLOAD, 'Repo content must be an object')
  }

  const normalized = cloneJsonValue(content)
  if (normalized.category !== undefined) {
    normalized.category = normalizeOptionalTrimmedString(normalized.category, {
      field: 'content.category',
      allowNull: true,
      emptyToNull: true
    })
  }
  if (normalized.repoType !== undefined) {
    normalized.repoType = normalizeOptionalTrimmedString(normalized.repoType, {
      field: 'content.repoType',
      allowNull: true,
      emptyToNull: true
    })
  }
  if (normalized.shared !== undefined) {
    normalized.shared = normalizeOptionalBoolean(normalized.shared, { field: 'content.shared' })
  }
  if (normalized.practice !== undefined) {
    normalized.practice = normalizeOptionalBoolean(normalized.practice, { field: 'content.practice' })
  }
  if (normalized.tags !== undefined) {
    normalized.tags = normalizeOptionalStringList(normalized.tags, 'content.tags')
  }

  return normalized
}

function normalizeRepoWritePayload(body = {}, { requireName = false } = {}) {
  const normalizedContent = normalizeRepoContent(body.content)
  const normalizedTags = normalizeOptionalStringList(body.tags ?? normalizedContent?.tags, 'tags')
  const mergedContent = {
    ...(normalizedContent || {}),
    category: normalizeOptionalTrimmedString(body.category ?? normalizedContent?.category, {
      field: 'category',
      allowNull: true,
      emptyToNull: true
    }),
    repoType: normalizeOptionalTrimmedString(body.repoType ?? normalizedContent?.repoType, {
      field: 'repoType',
      allowNull: true,
      emptyToNull: true
    }),
    shared: body.shared === undefined && normalizedContent?.shared === undefined
      ? undefined
      : normalizeOptionalBoolean(body.shared ?? normalizedContent?.shared, { field: 'shared' }),
    practice: body.practice === undefined && normalizedContent?.practice === undefined
      ? undefined
      : normalizeOptionalBoolean(body.practice ?? normalizedContent?.practice, { field: 'practice' }),
    tags: normalizedTags
  }
  Object.keys(mergedContent).forEach(key => {
    if (mergedContent[key] === undefined) delete mergedContent[key]
  })

  return {
    name: normalizeRepoName(body.name, { required: requireName }),
    description: normalizeOptionalText(body.description),
    content: Object.keys(mergedContent).length > 0 ? mergedContent : null
  }
}

function normalizeQuestionWritePayload(body = {}, { requireTitle = true } = {}) {
  const normalizedContent = normalizeQuestionContent(body.content)
  const normalizedType = normalizeQuestionType(body.type ?? normalizedContent?.questionType)
  const normalizedOptions = normalizeQuestionOptions(body.options ?? normalizedContent?.options)
  const normalizedStem = normalizeOptionalTrimmedString(body.stem ?? normalizedContent?.stem, {
    field: 'stem',
    allowNull: true,
    emptyToNull: true
  })
  const normalizedAnalysis = normalizeOptionalTrimmedString(body.analysis ?? normalizedContent?.analysis, {
    field: 'analysis',
    allowNull: true,
    emptyToNull: true
  })
  const normalizedAiMeta = body.aiMeta !== undefined ? cloneJsonValue(body.aiMeta) : normalizedContent?.aiMeta
  const normalizedTags = mergeQuestionTags(
    normalizeOptionalStringList(body.tags ?? normalizedContent?.tags, 'tags'),
    normalizedAiMeta
  )
  const normalizedKnowledgePoints = normalizeOptionalStringList(body.knowledgePoints ?? normalizedContent?.knowledgePoints, 'knowledgePoints')
  const normalizedApplicableScenes = normalizeOptionalStringList(body.applicableScenes ?? normalizedContent?.applicableScenes, 'applicableScenes')
  const normalizedCorrectAnswer = body.correctAnswer !== undefined ? cloneJsonValue(body.correctAnswer) : normalizedContent?.correctAnswer
  const normalizedSurveyQuestion = body.surveyQuestion !== undefined ? cloneJsonValue(body.surveyQuestion) : normalizedContent?.surveyQuestion

  if (normalizedSurveyQuestion !== undefined && normalizedSurveyQuestion !== null && !isPlainObject(normalizedSurveyQuestion)) {
    throwManagementError(400, MANAGEMENT_ERROR_CODES.QUESTION_BANK_QUESTION_CONTENT_INVALID, 'surveyQuestion must be an object')
  }
  if (normalizedAiMeta !== undefined && normalizedAiMeta !== null && !isPlainObject(normalizedAiMeta)) {
    throwManagementError(400, MANAGEMENT_ERROR_CODES.QUESTION_BANK_QUESTION_CONTENT_INVALID, 'aiMeta must be an object')
  }
  if (serverQuestionTypeHasOptions(normalizedType) && (!Array.isArray(normalizedOptions) || normalizedOptions.length < 2)) {
    throwManagementError(400, MANAGEMENT_ERROR_CODES.QUESTION_BANK_QUESTION_CONTENT_INVALID, 'Option questions require at least 2 options')
  }

  const resolvedTitle = body.title ?? normalizedContent?.title
  const resolvedDifficulty = body.difficulty ?? normalizedContent?.difficulty
  const resolvedScore = body.score ?? normalizedContent?.score
  const mergedContent = {
    ...(normalizedContent || {}),
    title: resolvedTitle,
    questionType: normalizedType ?? normalizedContent?.questionType,
    stem: normalizedStem,
    options: normalizedOptions,
    correctAnswer: normalizedCorrectAnswer,
    analysis: normalizedAnalysis,
    tags: normalizedTags,
    knowledgePoints: normalizedKnowledgePoints,
    applicableScenes: normalizedApplicableScenes,
    difficulty: normalizeOptionalTrimmedString(resolvedDifficulty, {
      field: 'difficulty',
      allowNull: true,
      emptyToNull: true
    }),
    score: normalizeScore(resolvedScore),
    surveyQuestion: normalizedSurveyQuestion,
    aiMeta: normalizedAiMeta
  }
  Object.keys(mergedContent).forEach(key => {
    if (mergedContent[key] === undefined) delete mergedContent[key]
  })

  return {
    title: requireTitle ? normalizeQuestionTitle(resolvedTitle) : resolvedTitle === undefined ? undefined : normalizeQuestionTitle(resolvedTitle),
    type: normalizedType,
    difficulty: normalizeOptionalTrimmedString(resolvedDifficulty, {
      field: 'difficulty',
      allowNull: true,
      emptyToNull: true
    }),
    score: normalizeScore(resolvedScore),
    content: Object.keys(mergedContent).length > 0 ? mergedContent : null
  }
}

function normalizeRepoListQuery(query = {}) {
  return {
    keyword: normalizeOptionalTrimmedString(query.keyword, {
      field: 'keyword',
      allowNull: true,
      emptyToNull: true
    }),
    category: normalizeOptionalTrimmedString(query.category, {
      field: 'category',
      allowNull: true,
      emptyToNull: true
    }),
    repoType: normalizeOptionalTrimmedString(query.repoType, {
      field: 'repoType',
      allowNull: true,
      emptyToNull: true
    })
  }
}

function normalizeQuestionListQuery(query = {}) {
  return {
    keyword: normalizeOptionalTrimmedString(query.keyword, {
      field: 'keyword',
      allowNull: true,
      emptyToNull: true
    }),
    type: normalizeOptionalTrimmedString(query.type, {
      field: 'type',
      allowNull: true,
      emptyToNull: true
    })
  }
}

function normalizeQuestionRecordKey(key) {
  const compact = String(key || '').trim().replace(/\s+/g, '')
  return QUESTION_IMPORT_FIELD_ALIASES[compact] || QUESTION_IMPORT_FIELD_ALIASES[compact.toLowerCase()] || compact
}

function parseQuestionOptionsFromString(value) {
  return String(value || '')
    .split(/\r?\n|[|]/)
    .map(item => item.trim())
    .filter(Boolean)
}

function parseLooseJson(value) {
  const text = String(value || '').trim()
  if (!text) return undefined
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

function normalizeImportedQuestionRecord(input = {}) {
  if (!isPlainObject(input)) {
    throw new Error('Imported question must be an object')
  }

  const options = input.options === undefined
    ? undefined
    : Array.isArray(input.options)
      ? input.options
      : parseQuestionOptionsFromString(input.options)

  return {
    title: input.title ?? input.name,
    type: input.type,
    stem: input.stem ?? input.question ?? input.description,
    options,
    analysis: input.analysis,
    difficulty: input.difficulty,
    score: input.score,
    tags: input.tags,
    knowledgePoints: input.knowledgePoints,
    applicableScenes: input.applicableScenes,
    correctAnswer: input.correctAnswer,
    aiMeta: input.aiMeta
  }
}

async function parseExcelImportRecords(file) {
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(file.buffer)
  const worksheet = workbook.worksheets[0]
  if (!worksheet) return []

  const headers = worksheet.getRow(1).values.slice(1).map(value => normalizeQuestionRecordKey(value))
  const records = []

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return

    const record = {}
    let hasValue = false
    headers.forEach((header, index) => {
      if (!header) return
      const cell = row.getCell(index + 1)
      const rawValue = cell?.text ?? cell?.value
      if (rawValue == null || String(rawValue).trim() === '') return
      hasValue = true
      record[header] = rawValue
    })

    if (!hasValue) return

    records.push(normalizeImportedQuestionRecord({
      ...record,
      score: record.score === undefined ? undefined : Number(record.score),
      tags: record.tags === undefined ? undefined : parseQuestionOptionsFromString(record.tags),
      knowledgePoints: record.knowledgePoints === undefined ? undefined : parseQuestionOptionsFromString(record.knowledgePoints),
      applicableScenes: record.applicableScenes === undefined ? undefined : parseQuestionOptionsFromString(record.applicableScenes),
      options: record.options,
      aiMeta: record.aiMeta === undefined ? undefined : parseLooseJson(record.aiMeta),
      correctAnswer: record.correctAnswer === undefined ? undefined : parseLooseJson(record.correctAnswer)
    }))
  })

  return records
}

function parseJsonImportRecords(text) {
  const parsed = JSON.parse(String(text || ''))
  const list = Array.isArray(parsed) ? parsed : (Array.isArray(parsed?.questions) ? parsed.questions : [])
  if (!Array.isArray(list)) {
    throw new Error('JSON import payload must be an array or an object with questions')
  }
  return list.map(item => normalizeImportedQuestionRecord(item))
}

function parseTextImportRecords(text) {
  const blocks = String(text || '')
    .split(/\r?\n\s*\r?\n/)
    .map(item => item.trim())
    .filter(Boolean)

  return blocks.map(block => {
    const result = {}
    const optionLines = []

    for (const rawLine of block.split(/\r?\n/)) {
      const line = rawLine.trim()
      if (!line) continue

      if (/^[-*]\s+/.test(line)) {
        optionLines.push(line.replace(/^[-*]\s+/, '').trim())
        continue
      }

      const match = line.match(/^([^:：]+)\s*[:：]\s*(.*)$/)
      if (!match) continue

      const key = normalizeQuestionRecordKey(match[1])
      const value = match[2].trim()
      if (key === 'options') {
        if (value) optionLines.push(...parseQuestionOptionsFromString(value))
        continue
      }
      if (key === 'tags' || key === 'knowledgePoints' || key === 'applicableScenes') {
        result[key] = parseQuestionOptionsFromString(value)
        continue
      }
      if (key === 'score') {
        result[key] = value === '' ? undefined : Number(value)
        continue
      }
      if (key === 'aiMeta' || key === 'correctAnswer') {
        result[key] = parseLooseJson(value)
        continue
      }
      result[key] = value
    }

    if (optionLines.length > 0) result.options = optionLines
    return normalizeImportedQuestionRecord(result)
  })
}

async function resolveImportRecords({ body = {}, file }) {
  const normalizedFormat = String(body.format || file?.originalname?.split('.').pop() || '').trim().toLowerCase()

  if (file) {
    if (!Buffer.isBuffer(file.buffer)) throw new Error('Import file is missing')
    if (file.buffer.length > QUESTION_BANK_IMPORT_FILE_MAX_BYTES) throw new Error('Import file is too large')
    if (QUESTION_BANK_IMPORT_EXCEL_FORMATS.has(normalizedFormat)) return parseExcelImportRecords(file)

    const text = file.buffer.toString('utf8')
    if (QUESTION_BANK_IMPORT_JSON_FORMATS.has(normalizedFormat)) return parseJsonImportRecords(text)
    return parseTextImportRecords(text)
  }

  const text = normalizeOptionalTrimmedString(body.text, {
    field: 'text',
    allowNull: true,
    emptyToNull: true
  })
  if (!text) throw new Error('Import text or file is required')

  if (QUESTION_BANK_IMPORT_JSON_FORMATS.has(normalizedFormat)) return parseJsonImportRecords(text)
  if (QUESTION_BANK_IMPORT_TEXT_FORMATS.has(normalizedFormat) || !normalizedFormat) return parseTextImportRecords(text)
  throw new Error('Unsupported import format')
}

function buildQuestionExportText(question, index) {
  const content = question?.content || {}
  const options = Array.isArray(question?.options) ? question.options : (Array.isArray(content.options) ? content.options : [])
  const tags = Array.isArray(question?.tags) ? question.tags : (Array.isArray(content.tags) ? content.tags : [])
  const knowledgePoints = Array.isArray(question?.knowledgePoints) ? question.knowledgePoints : (Array.isArray(content.knowledgePoints) ? content.knowledgePoints : [])
  const applicableScenes = Array.isArray(question?.applicableScenes) ? question.applicableScenes : (Array.isArray(content.applicableScenes) ? content.applicableScenes : [])
  const lines = [
    `#${index + 1}`,
    `标题: ${String(question?.title || '')}`,
    `类型: ${String(question?.type || content.questionType || '')}`,
    `题干: ${String(question?.stem || content.stem || '')}`
  ]

  if (options.length > 0) lines.push(`选项: ${options.map(option => String(option?.label ?? option?.text ?? option?.value ?? '')).filter(Boolean).join(' | ')}`)
  if (question?.analysis || content.analysis) lines.push(`解析: ${String(question.analysis || content.analysis || '')}`)
  if (question?.difficulty || content.difficulty) lines.push(`难度: ${String(question.difficulty || content.difficulty || '')}`)
  if (question?.score != null || content.score != null) lines.push(`分值: ${String(question.score ?? content.score ?? '')}`)
  if (tags.length > 0) lines.push(`标签: ${tags.join(', ')}`)
  if (knowledgePoints.length > 0) lines.push(`知识点: ${knowledgePoints.join(', ')}`)
  if (applicableScenes.length > 0) lines.push(`场景: ${applicableScenes.join(', ')}`)
  return lines.join('\n')
}

function sanitizeExportFileName(value) {
  return String(value || 'question-bank')
    .trim()
    .replace(/[\\/:*?"<>|]+/g, '-')
    .replace(/\s+/g, '-')
    .slice(0, 60) || 'question-bank'
}

function mergeRepoForUpdate(repo, body = {}) {
  const current = createQuestionBankRepoDto(repo)
  const bodyContent = isPlainObject(body.content) ? body.content : undefined
  return {
    name: body.name ?? current?.name,
    description: body.description ?? current?.description,
    category: body.category ?? current?.category,
    repoType: body.repoType ?? current?.repoType,
    shared: body.shared ?? current?.shared,
    practice: body.practice ?? current?.practice,
    tags: body.tags ?? current?.tags,
    content: bodyContent
      ? { ...(current?.content || {}), ...bodyContent }
      : current?.content
  }
}

function mergeQuestionForUpdate(question, body = {}) {
  const current = createQuestionBankQuestionDto(question)
  const bodyContent = isPlainObject(body.content) ? body.content : undefined
  return {
    title: body.title ?? current?.title,
    type: body.type ?? current?.type,
    stem: body.stem ?? current?.stem,
    options: body.options ?? current?.options,
    analysis: body.analysis ?? current?.analysis,
    difficulty: body.difficulty ?? current?.difficulty,
    score: body.score ?? current?.score,
    tags: body.tags ?? current?.tags,
    knowledgePoints: body.knowledgePoints ?? current?.knowledgePoints,
    applicableScenes: body.applicableScenes ?? current?.applicableScenes,
    correctAnswer: body.correctAnswer ?? current?.correctAnswer,
    aiMeta: body.aiMeta ?? current?.aiMeta,
    surveyQuestion: body.surveyQuestion ?? current?.content?.surveyQuestion,
    content: bodyContent
      ? { ...(current?.content || {}), ...bodyContent }
      : current?.content
  }
}

function createQuestionCreatePayload(repoId, body = {}) {
  const normalized = normalizeQuestionWritePayload(body, { requireTitle: true })
  return {
    repo_id: Number(repoId),
    title: normalized.title,
    type: normalized.type,
    difficulty: normalized.difficulty,
    score: normalized.score,
    content: normalized.content
  }
}

async function getRepoOrThrow(repoId, options = {}) {
  const repo = await questionBankRepository.findRepoById(repoId, options)
  if (!repo) {
    throwManagementError(404, MANAGEMENT_ERROR_CODES.QUESTION_BANK_REPO_NOT_FOUND, 'Question bank repo not found')
  }
  return repo
}

async function getQuestionOrThrow(repoId, questionId, options = {}) {
  const question = await questionBankRepository.findQuestionById(questionId, repoId, options)
  if (!question) {
    throwManagementError(404, MANAGEMENT_ERROR_CODES.QUESTION_BANK_QUESTION_NOT_FOUND, 'Question bank question not found')
  }
  return question
}

async function buildRepoExportPayload(repoId, query = {}) {
  const repo = createQuestionBankRepoDto(await getRepoOrThrow(repoId))
  const filters = normalizeQuestionListQuery(query)
  const questions = (await questionBankRepository.listQuestions(repoId, filters)).map(item => createQuestionBankQuestionDto(item))
  return { repo, questions }
}

async function buildRepoExportFile({ repo, questions, format }) {
  const filenameBase = sanitizeExportFileName(repo?.name || `question-bank-${repo?.id || 'export'}`)

  if (format === 'json') {
    return {
      filename: `${filenameBase}.json`,
      contentType: 'application/json; charset=utf-8',
      buffer: Buffer.from(JSON.stringify({ repo, questions }, null, 2), 'utf8')
    }
  }

  if (format === 'txt') {
    const sections = [
      `题库: ${repo?.name || ''}`,
      `描述: ${repo?.description || ''}`,
      `题目数: ${questions.length}`,
      '',
      ...questions.flatMap((question, index) => [buildQuestionExportText(question, index), ''])
    ]
    return {
      filename: `${filenameBase}.txt`,
      contentType: 'text/plain; charset=utf-8',
      buffer: Buffer.from(sections.join('\n').trim(), 'utf8')
    }
  }

  const workbook = new ExcelJS.Workbook()
  const repoSheet = workbook.addWorksheet('Repo')
  repoSheet.columns = [
    { header: 'field', key: 'field', width: 20 },
    { header: 'value', key: 'value', width: 48 }
  ]
  repoSheet.addRows([
    { field: 'id', value: repo?.id ?? '' },
    { field: 'name', value: repo?.name ?? '' },
    { field: 'description', value: repo?.description ?? '' },
    { field: 'category', value: repo?.category ?? '' },
    { field: 'repoType', value: repo?.repoType ?? '' },
    { field: 'shared', value: repo?.shared == null ? '' : String(repo.shared) },
    { field: 'practice', value: repo?.practice == null ? '' : String(repo.practice) },
    { field: 'tags', value: Array.isArray(repo?.tags) ? repo.tags.join(', ') : '' }
  ])

  const questionSheet = workbook.addWorksheet('Questions')
  questionSheet.columns = [
    { header: 'title', key: 'title', width: 28 },
    { header: 'type', key: 'type', width: 18 },
    { header: 'stem', key: 'stem', width: 40 },
    { header: 'options', key: 'options', width: 40 },
    { header: 'analysis', key: 'analysis', width: 32 },
    { header: 'difficulty', key: 'difficulty', width: 16 },
    { header: 'score', key: 'score', width: 12 },
    { header: 'tags', key: 'tags', width: 26 },
    { header: 'knowledgePoints', key: 'knowledgePoints', width: 26 },
    { header: 'applicableScenes', key: 'applicableScenes', width: 26 },
    { header: 'correctAnswer', key: 'correctAnswer', width: 24 },
    { header: 'aiMeta', key: 'aiMeta', width: 30 }
  ]

  questions.forEach(question => {
    questionSheet.addRow({
      title: question.title || '',
      type: question.type || question.content?.questionType || '',
      stem: question.stem || question.content?.stem || '',
      options: (question.options || []).map(option => option?.label ?? option?.text ?? option?.value ?? '').filter(Boolean).join(' | '),
      analysis: question.analysis || question.content?.analysis || '',
      difficulty: question.difficulty || question.content?.difficulty || '',
      score: question.score ?? question.content?.score ?? '',
      tags: Array.isArray(question.tags) ? question.tags.join(', ') : '',
      knowledgePoints: Array.isArray(question.knowledgePoints) ? question.knowledgePoints.join(', ') : '',
      applicableScenes: Array.isArray(question.applicableScenes) ? question.applicableScenes.join(', ') : '',
      correctAnswer: question.correctAnswer == null ? '' : JSON.stringify(question.correctAnswer),
      aiMeta: question.aiMeta == null ? '' : JSON.stringify(question.aiMeta)
    })
  })

  const buffer = Buffer.from(await workbook.xlsx.writeBuffer())
  return {
    filename: `${filenameBase}.xlsx`,
    contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    buffer
  }
}

export async function listManagedQuestionBankRepos({ actor, query = {} }) {
  ensureQuestionBankActor(actor)
  const repos = await questionBankRepository.listRepos({
    ...normalizeRepoListQuery(query),
    ...resolveRepoScope(actor)
  })
  return repos.map(item => createQuestionBankRepoDto(item))
}

export async function createManagedQuestionBankRepo({ actor, body = {} }, options = {}) {
  ensureQuestionBankActor(actor)
  body = ensurePlainObjectPayload(body)
  const payload = normalizeRepoWritePayload(body, { requireName: true })

  return runManagementTransaction(async db => {
    const repo = await questionBankRepository.createRepo({
      creator_id: Number(actor.sub),
      ...payload
    }, { db })

    await recordManagementAction({
      actor,
      audit: {
        action: 'question_bank.repo.create',
        targetType: 'question_bank_repo',
        targetId: repo.id,
        detail: `Created question bank repo ${repo.name}`
      },
      message: {
        recipientId: actor.sub,
        title: 'Question bank repo created',
        content: `Question bank repo "${repo.name}" was created.`,
        entityType: 'question_bank_repo',
        entityId: repo.id
      }
    }, { db })

    return createQuestionBankRepoDto(repo)
  }, options)
}

export async function updateManagedQuestionBankRepo({ actor, repoId, body = {} }, options = {}) {
  ensureQuestionBankActor(actor)
  body = ensurePlainObjectPayload(body)
  return runManagementTransaction(async db => {
    const existing = await getRepoOrThrow(repoId, { db, ...resolveRepoScope(actor) })
    const payload = normalizeRepoWritePayload(mergeRepoForUpdate(existing, body), { requireName: true })
    const repo = await questionBankRepository.updateRepo(repoId, payload, { db })

    await recordManagementAction({
      actor,
      audit: {
        action: 'question_bank.repo.update',
        targetType: 'question_bank_repo',
        targetId: repo.id,
        detail: `Updated question bank repo ${repo.name}`
      },
      message: {
        recipientId: actor.sub,
        title: 'Question bank repo updated',
        content: `Question bank repo "${repo.name}" was updated.`,
        entityType: 'question_bank_repo',
        entityId: repo.id
      }
    }, { db })

    return createQuestionBankRepoDto(repo)
  }, options)
}

export async function deleteManagedQuestionBankRepo({ actor, repoId }, options = {}) {
  ensureQuestionBankActor(actor)
  await runManagementTransaction(async db => {
    const repo = await getRepoOrThrow(repoId, { db, ...resolveRepoScope(actor) })
    await questionBankRepository.deleteRepo(repoId, { db })
    await recordManagementAction({
      actor,
      audit: {
        action: 'question_bank.repo.delete',
        targetType: 'question_bank_repo',
        targetId: repo.id,
        detail: `Deleted question bank repo ${repo.name}`
      },
      message: {
        recipientId: actor.sub,
        title: 'Question bank repo deleted',
        content: `Question bank repo "${repo.name}" was deleted.`,
        entityType: 'question_bank_repo',
        entityId: repo.id
      }
    }, { db })
  }, options)
}

export async function exportManagedQuestionBankRepo({ actor, repoId, format = 'json', query = {} }) {
  ensureQuestionBankActor(actor)
  const normalizedFormat = String(format || '').trim().toLowerCase()
  if (!QUESTION_BANK_EXPORT_FORMATS.has(normalizedFormat)) {
    throwManagementError(400, MANAGEMENT_ERROR_CODES.INVALID_PAYLOAD, 'Unsupported export format')
  }

  await getRepoOrThrow(repoId, resolveRepoScope(actor))
  const payload = await buildRepoExportPayload(repoId, query)
  return buildRepoExportFile({
    ...payload,
    format: normalizedFormat
  })
}

export async function importManagedQuestionBankQuestions({ actor, repoId, body = {}, file }, options = {}) {
  ensureQuestionBankActor(actor)
  body = ensurePlainObjectPayload(body)

  let records = []
  try {
    records = await resolveImportRecords({ body, file })
  } catch (error) {
    throwManagementError(400, MANAGEMENT_ERROR_CODES.QUESTION_BANK_QUESTION_CONTENT_INVALID, error?.message || 'Failed to import questions')
  }

  return runManagementTransaction(async db => {
    const repo = await getRepoOrThrow(repoId, { db, ...resolveRepoScope(actor) })
    const createdQuestions = []
    const errors = []

    for (let index = 0; index < records.length; index += 1) {
      const record = records[index]
      try {
        const created = await questionBankRepository.createQuestion(createQuestionCreatePayload(repoId, record), { db })
        createdQuestions.push(createQuestionBankQuestionDto(created))
      } catch (error) {
        errors.push({
          index: index + 1,
          title: String(record?.title || ''),
          reason: error?.message || 'Unknown import error'
        })
      }
    }

    await recordManagementAction({
      actor,
      audit: {
        action: 'question_bank.question.import',
        targetType: 'question_bank_repo',
        targetId: repo.id,
        detail: `Imported ${createdQuestions.length}/${records.length} questions into repo ${repo.name}`
      },
      message: {
        recipientId: actor.sub,
        title: 'Question bank import completed',
        content: `Imported ${createdQuestions.length} questions into "${repo.name}".`,
        entityType: 'question_bank_repo',
        entityId: repo.id
      }
    }, { db })

    return {
      repo: createQuestionBankRepoDto(repo),
      totalCount: records.length,
      createdCount: createdQuestions.length,
      failedCount: errors.length,
      questions: createdQuestions,
      errors
    }
  }, options)
}

export async function listManagedQuestionBankQuestions({ actor, repoId, query = {} }) {
  ensureQuestionBankActor(actor)
  await getRepoOrThrow(repoId, resolveRepoScope(actor))
  const questions = await questionBankRepository.listQuestions(repoId, normalizeQuestionListQuery(query))
  return questions.map(item => createQuestionBankQuestionDto(item))
}

export async function createManagedQuestionBankQuestion({ actor, repoId, body = {} }, options = {}) {
  ensureQuestionBankActor(actor)
  body = ensurePlainObjectPayload(body)
  return runManagementTransaction(async db => {
    const repo = await getRepoOrThrow(repoId, { db, ...resolveRepoScope(actor) })
    const question = await questionBankRepository.createQuestion(createQuestionCreatePayload(repoId, body), { db })

    await recordManagementAction({
      actor,
      audit: {
        action: 'question_bank.question.create',
        targetType: 'question_bank_question',
        targetId: question.id,
        detail: `Created question "${question.title}" in repo ${repo.name}`
      },
      message: {
        recipientId: actor.sub,
        title: 'Question created',
        content: `Question "${question.title}" was added to "${repo.name}".`,
        entityType: 'question_bank_question',
        entityId: question.id
      }
    }, { db })

    return createQuestionBankQuestionDto(question)
  }, options)
}

export async function updateManagedQuestionBankQuestion({ actor, repoId, questionId, body = {} }, options = {}) {
  ensureQuestionBankActor(actor)
  body = ensurePlainObjectPayload(body)
  return runManagementTransaction(async db => {
    const repo = await getRepoOrThrow(repoId, { db, ...resolveRepoScope(actor) })
    const existing = await getQuestionOrThrow(repoId, questionId, { db })
    const payload = normalizeQuestionWritePayload(mergeQuestionForUpdate(existing, body), { requireTitle: true })
    const question = await questionBankRepository.updateQuestion(questionId, repoId, payload, { db })

    await recordManagementAction({
      actor,
      audit: {
        action: 'question_bank.question.update',
        targetType: 'question_bank_question',
        targetId: question.id,
        detail: `Updated question "${question.title}" in repo ${repo.name}`
      },
      message: {
        recipientId: actor.sub,
        title: 'Question updated',
        content: `Question "${question.title}" in "${repo.name}" was updated.`,
        entityType: 'question_bank_question',
        entityId: question.id
      }
    }, { db })

    return createQuestionBankQuestionDto(question)
  }, options)
}

export async function deleteManagedQuestionBankQuestion({ actor, repoId, questionId }, options = {}) {
  ensureQuestionBankActor(actor)
  await runManagementTransaction(async db => {
    const repo = await getRepoOrThrow(repoId, { db, ...resolveRepoScope(actor) })
    const question = await getQuestionOrThrow(repoId, questionId, { db })
    await questionBankRepository.deleteQuestion(questionId, repoId, { db })
    await recordManagementAction({
      actor,
      audit: {
        action: 'question_bank.question.delete',
        targetType: 'question_bank_question',
        targetId: question.id,
        detail: `Deleted question "${question.title}" from repo ${repo.name}`
      },
      message: {
        recipientId: actor.sub,
        title: 'Question deleted',
        content: `Question "${question.title}" was removed from "${repo.name}".`,
        entityType: 'question_bank_question',
        entityId: question.id
      }
    }, { db })
  }, options)
}
