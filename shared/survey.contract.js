import { createPaginatedResult, normalizePaginationQuery } from './pagination.contract.js'

export const SURVEY_STATUS = Object.freeze({
  DRAFT: 'draft',
  PUBLISHED: 'published',
  CLOSED: 'closed'
})

export const SURVEY_ERROR_CODES = Object.freeze({
  NOT_FOUND: 'NOT_FOUND',
  FORBIDDEN: 'FORBIDDEN',
  VALIDATION: 'VALIDATION',
  NOT_PUBLISHED: 'NOT_PUBLISHED',
  SURVEY_EXPIRED: 'SURVEY_EXPIRED',
  NOT_IN_TRASH: 'NOT_IN_TRASH',
  FOLDER_NOT_FOUND: 'FOLDER_NOT_FOUND',
  UPLOAD_QUESTION_NOT_FOUND: 'UPLOAD_QUESTION_NOT_FOUND',
  UPLOAD_SESSION_REQUIRED: 'UPLOAD_SESSION_REQUIRED',
  UPLOAD_NOT_ENABLED: 'UPLOAD_NOT_ENABLED',
  UPLOAD_VALIDATION: 'UPLOAD_VALIDATION',
  DUPLICATE_SUBMISSION: 'DUPLICATE_SUBMISSION',
  NO_FILE: 'NO_FILE',
  SHARE_CODE_GENERATION_FAILED: 'SHARE_CODE_GENERATION_FAILED'
})

export const SURVEY_PAGINATION_DEFAULTS = Object.freeze({
  page: 1,
  pageSize: 20,
  trashPageSize: 100,
  answersPageSize: 20
})

function toNumberOrUndefined(value) {
  const normalized = Number(value)
  return Number.isFinite(normalized) ? normalized : undefined
}

function toNumberOrNull(value) {
  if (value === null || value === '' || value === 'null') return null
  return toNumberOrUndefined(value)
}

export function normalizeSurveyFolderId(folderId) {
  if (folderId === undefined) return undefined
  if (folderId === null || folderId === '' || folderId === 'null') return null

  const normalized = Number(folderId)
  return Number.isFinite(normalized) ? normalized : undefined
}

export function normalizeSurveyListQuery(query = {}) {
  const pagination = normalizePaginationQuery(query, SURVEY_PAGINATION_DEFAULTS)
  return {
    page: pagination.page,
    pageSize: pagination.pageSize,
    status: query?.status,
    creator_id: query?.creator_id,
    createdBy: query?.createdBy,
    folder_id: normalizeSurveyFolderId(query?.folder_id)
  }
}

export function normalizeSurveyTrashListQuery(query = {}) {
  const pagination = normalizePaginationQuery(query, {
    page: SURVEY_PAGINATION_DEFAULTS.page,
    pageSize: SURVEY_PAGINATION_DEFAULTS.trashPageSize
  })

  return {
    page: pagination.page,
    pageSize: pagination.pageSize,
    creator_id: query?.creator_id,
    createdBy: query?.createdBy
  }
}

export function normalizeAnswerListQuery(query = {}) {
  const pagination = normalizePaginationQuery(query, {
    page: SURVEY_PAGINATION_DEFAULTS.page,
    pageSize: SURVEY_PAGINATION_DEFAULTS.answersPageSize
  })

  return {
    page: pagination.page,
    pageSize: pagination.pageSize,
    survey_id: toNumberOrUndefined(query?.survey_id),
    startTime: query?.startTime ? String(query.startTime) : undefined,
    endTime: query?.endTime ? String(query.endTime) : undefined
  }
}

export function createSurveyPageResult({ list = [], total = 0, page, pageSize } = {}) {
  return createPaginatedResult({ list, total, page, pageSize })
}

export function createAnswerDto(answer) {
  if (!answer) return null

  const surveyId = toNumberOrUndefined(answer.survey_id ?? answer.surveyId)
  const duration = toNumberOrUndefined(answer.duration)
  const submittedAt = answer.submitted_at ?? answer.submittedAt

  return {
    ...answer,
    id: toNumberOrUndefined(answer.id),
    survey_id: surveyId,
    surveyId,
    duration,
    status: answer.status ? String(answer.status) : undefined,
    submitted_at: submittedAt,
    submittedAt,
    answers_data: Array.isArray(answer.answers_data) ? answer.answers_data : [],
    ip_address: answer.ip_address ? String(answer.ip_address) : undefined,
    user_agent: answer.user_agent ? String(answer.user_agent) : undefined
  }
}

export function createAnswerPageResult({ list = [], total = 0, page, pageSize } = {}) {
  return createPaginatedResult({
    list: Array.isArray(list) ? list.map(item => createAnswerDto(item)) : [],
    total,
    page,
    pageSize
  })
}

export function createSurveyUploadDto(file, surveyId) {
  return {
    id: Number(file?.id),
    name: file?.name || '',
    url: file?.url || '',
    size: Number(file?.size || 0),
    type: file?.type || '',
    surveyId: Number(file?.survey_id || surveyId || 0),
    uploadToken: String(file?.public_token || file?.uploadToken || '')
  }
}

export function createSurveySubmissionDto(answer) {
  return {
    id: Number(answer?.id || 0)
  }
}
