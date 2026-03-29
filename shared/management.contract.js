import { createPaginatedResult, normalizePaginationQuery } from './pagination.contract.js'

export const MANAGEMENT_ERROR_PREFIX = 'MGMT'

export const MANAGEMENT_ERROR_FAMILIES = Object.freeze({
  ACCESS: `${MANAGEMENT_ERROR_PREFIX}_ACCESS`,
  USER: `${MANAGEMENT_ERROR_PREFIX}_USER`,
  ROLE: `${MANAGEMENT_ERROR_PREFIX}_ROLE`,
  DEPT: `${MANAGEMENT_ERROR_PREFIX}_DEPT`,
  POSITION: `${MANAGEMENT_ERROR_PREFIX}_POSITION`,
  FOLDER: `${MANAGEMENT_ERROR_PREFIX}_FOLDER`,
  MESSAGE: `${MANAGEMENT_ERROR_PREFIX}_MESSAGE`,
  FLOW: `${MANAGEMENT_ERROR_PREFIX}_FLOW`,
  QUESTION_BANK_REPO: `${MANAGEMENT_ERROR_PREFIX}_QUESTION_BANK_REPO`,
  QUESTION_BANK_QUESTION: `${MANAGEMENT_ERROR_PREFIX}_QUESTION_BANK_QUESTION`
})

function createManagementErrorCode(family, reason) {
  return `${family}_${reason}`
}

export const MANAGEMENT_ERROR_CODES = Object.freeze({
  ACCESS_FORBIDDEN: createManagementErrorCode(MANAGEMENT_ERROR_FAMILIES.ACCESS, 'FORBIDDEN'),
  USER_NOT_FOUND: createManagementErrorCode(MANAGEMENT_ERROR_FAMILIES.USER, 'NOT_FOUND'),
  USER_REQUIRED_FIELDS: createManagementErrorCode(MANAGEMENT_ERROR_FAMILIES.USER, 'REQUIRED_FIELDS'),
  USER_EXISTS: createManagementErrorCode(MANAGEMENT_ERROR_FAMILIES.USER, 'EXISTS'),
  USER_IMPORT_PAYLOAD_INVALID: createManagementErrorCode(MANAGEMENT_ERROR_FAMILIES.USER, 'IMPORT_PAYLOAD_INVALID'),
  USER_PASSWORD_REQUIRED: createManagementErrorCode(MANAGEMENT_ERROR_FAMILIES.USER, 'PASSWORD_REQUIRED'),
  ROLE_NOT_FOUND: createManagementErrorCode(MANAGEMENT_ERROR_FAMILIES.ROLE, 'NOT_FOUND'),
  ROLE_REQUIRED_FIELDS: createManagementErrorCode(MANAGEMENT_ERROR_FAMILIES.ROLE, 'REQUIRED_FIELDS'),
  ROLE_EXISTS: createManagementErrorCode(MANAGEMENT_ERROR_FAMILIES.ROLE, 'EXISTS'),
  DEPT_NAME_REQUIRED: createManagementErrorCode(MANAGEMENT_ERROR_FAMILIES.DEPT, 'NAME_REQUIRED'),
  DEPT_NOT_FOUND: createManagementErrorCode(MANAGEMENT_ERROR_FAMILIES.DEPT, 'NOT_FOUND'),
  DEPT_HAS_CHILDREN: createManagementErrorCode(MANAGEMENT_ERROR_FAMILIES.DEPT, 'HAS_CHILDREN'),
  POSITION_NAME_REQUIRED: createManagementErrorCode(MANAGEMENT_ERROR_FAMILIES.POSITION, 'NAME_REQUIRED'),
  POSITION_NOT_FOUND: createManagementErrorCode(MANAGEMENT_ERROR_FAMILIES.POSITION, 'NOT_FOUND'),
  POSITION_EXISTS: createManagementErrorCode(MANAGEMENT_ERROR_FAMILIES.POSITION, 'EXISTS'),
  FOLDER_NOT_FOUND: createManagementErrorCode(MANAGEMENT_ERROR_FAMILIES.FOLDER, 'NOT_FOUND'),
  FOLDER_NAME_REQUIRED: createManagementErrorCode(MANAGEMENT_ERROR_FAMILIES.FOLDER, 'NAME_REQUIRED'),
  FOLDER_PARENT_NOT_FOUND: createManagementErrorCode(MANAGEMENT_ERROR_FAMILIES.FOLDER, 'PARENT_NOT_FOUND'),
  FOLDER_SELF_PARENT: createManagementErrorCode(MANAGEMENT_ERROR_FAMILIES.FOLDER, 'SELF_PARENT'),
  FOLDER_HAS_CHILDREN: createManagementErrorCode(MANAGEMENT_ERROR_FAMILIES.FOLDER, 'HAS_CHILDREN'),
  MESSAGE_NOT_FOUND: createManagementErrorCode(MANAGEMENT_ERROR_FAMILIES.MESSAGE, 'NOT_FOUND'),
  FLOW_NAME_REQUIRED: createManagementErrorCode(MANAGEMENT_ERROR_FAMILIES.FLOW, 'NAME_REQUIRED'),
  FLOW_STATUS_REQUIRED: createManagementErrorCode(MANAGEMENT_ERROR_FAMILIES.FLOW, 'STATUS_REQUIRED'),
  FLOW_STATUS_INVALID: createManagementErrorCode(MANAGEMENT_ERROR_FAMILIES.FLOW, 'STATUS_INVALID'),
  FLOW_NOT_FOUND: createManagementErrorCode(MANAGEMENT_ERROR_FAMILIES.FLOW, 'NOT_FOUND'),
  QUESTION_BANK_REPO_NAME_REQUIRED: createManagementErrorCode(MANAGEMENT_ERROR_FAMILIES.QUESTION_BANK_REPO, 'NAME_REQUIRED'),
  QUESTION_BANK_REPO_NOT_FOUND: createManagementErrorCode(MANAGEMENT_ERROR_FAMILIES.QUESTION_BANK_REPO, 'NOT_FOUND'),
  QUESTION_BANK_QUESTION_TITLE_REQUIRED: createManagementErrorCode(MANAGEMENT_ERROR_FAMILIES.QUESTION_BANK_QUESTION, 'TITLE_REQUIRED'),
  QUESTION_BANK_QUESTION_SCORE_INVALID: createManagementErrorCode(MANAGEMENT_ERROR_FAMILIES.QUESTION_BANK_QUESTION, 'SCORE_INVALID'),
  QUESTION_BANK_QUESTION_NOT_FOUND: createManagementErrorCode(MANAGEMENT_ERROR_FAMILIES.QUESTION_BANK_QUESTION, 'NOT_FOUND')
})

export const MANAGEMENT_PAGINATION_DEFAULTS = Object.freeze({
  page: 1,
  pageSize: 20,
  usersPageSize: 20,
  auditsPageSize: 20,
  messagesPageSize: 50
})

function toNumberOrUndefined(value) {
  const normalized = Number(value)
  return Number.isFinite(normalized) ? normalized : undefined
}

function toNumberOrNull(value) {
  if (value === null || value === '' || value === 'null') return null
  return toNumberOrUndefined(value)
}

function toBooleanOrUndefined(value) {
  if (value === undefined || value === null || value === '') return undefined
  if (typeof value === 'boolean') return value
  if (value === 1 || value === '1' || value === 'true') return true
  if (value === 0 || value === '0' || value === 'false') return false
  return undefined
}

function toStringArray(value) {
  if (Array.isArray(value)) {
    return value.map(item => String(item).trim()).filter(Boolean)
  }

  if (typeof value === 'string') {
    return value.split(',').map(item => item.trim()).filter(Boolean)
  }

  return undefined
}

function mapChildren(children) {
  if (!Array.isArray(children)) return undefined
  return children.map(child => createDeptDto(child))
}

export function normalizeUserListQuery(query = {}) {
  const pagination = normalizePaginationQuery(query, {
    page: MANAGEMENT_PAGINATION_DEFAULTS.page,
    pageSize: MANAGEMENT_PAGINATION_DEFAULTS.usersPageSize
  })

  return {
    page: pagination.page,
    pageSize: pagination.pageSize,
    dept_id: toNumberOrUndefined(query?.dept_id),
    is_active: toBooleanOrUndefined(query?.is_active)
  }
}

export function createUserDto(user) {
  if (!user) return null

  const roleId = toNumberOrUndefined(user.role_id ?? user.roleId)
  const deptId = toNumberOrUndefined(user.dept_id ?? user.deptId)
  const positionId = toNumberOrUndefined(user.position_id ?? user.positionId)
  const isActive = Boolean(user.is_active ?? user.isActive)
  const lastLoginAt = user.last_login_at ?? user.lastLoginAt
  const createdAt = user.created_at ?? user.createdAt
  const updatedAt = user.updated_at ?? user.updatedAt

  return {
    ...user,
    role_id: roleId,
    dept_id: deptId,
    position_id: positionId,
    is_active: isActive,
    last_login_at: lastLoginAt,
    created_at: createdAt,
    updated_at: updatedAt,
    roleId,
    deptId,
    positionId,
    isActive,
    lastLoginAt,
    createdAt,
    updatedAt
  }
}

export function createUserPageResult({ list = [], total = 0, page, pageSize } = {}) {
  return createPaginatedResult({
    list: Array.isArray(list) ? list.map(item => createUserDto(item)) : [],
    total,
    page,
    pageSize
  })
}

export function createUserImportResult(result = {}) {
  return {
    created: Number(result.created || 0),
    skipped: Number(result.skipped || 0),
    errors: Array.isArray(result.errors) ? result.errors.map(item => ({
      index: toNumberOrUndefined(item?.index),
      row: toNumberOrUndefined(item?.row),
      username: item?.username ? String(item.username) : '',
      reason: String(item?.reason || '')
    })) : []
  }
}

export function createDeptDto(dept) {
  if (!dept) return null

  const parentId = toNumberOrNull(dept.parent_id ?? dept.parentId)
  const sortOrder = Number(dept.sort_order ?? dept.sortOrder ?? 0)
  const createdAt = dept.created_at ?? dept.createdAt

  return {
    ...dept,
    parent_id: parentId,
    sort_order: sortOrder,
    created_at: createdAt,
    parentId,
    sortOrder,
    createdAt,
    children: mapChildren(dept.children)
  }
}

export function createRoleDto(role) {
  if (!role) return null

  const createdAt = role.created_at ?? role.createdAt
  return {
    ...role,
    created_at: createdAt,
    createdAt
  }
}

export function createPositionDto(position) {
  if (!position) return null

  const isVirtual = Boolean(position.is_virtual ?? position.isVirtual)
  const createdAt = position.created_at ?? position.createdAt
  const updatedAt = position.updated_at ?? position.updatedAt

  return {
    ...position,
    is_virtual: isVirtual,
    created_at: createdAt,
    updated_at: updatedAt,
    isVirtual,
    createdAt,
    updatedAt
  }
}

export function createFlowDto(flow) {
  if (!flow) return null

  const id = toNumberOrUndefined(flow.id)
  const createdAt = flow.created_at ?? flow.createdAt
  const updatedAt = flow.updated_at ?? flow.updatedAt

  return {
    ...flow,
    id,
    name: String(flow.name || ''),
    status: flow.status ? String(flow.status) : undefined,
    description: flow.description ? String(flow.description) : undefined,
    created_at: createdAt,
    updated_at: updatedAt,
    createdAt,
    updatedAt
  }
}

export function createQuestionBankRepoDto(repo) {
  if (!repo) return null

  const id = toNumberOrUndefined(repo.id)
  const questionCount = Number(repo.questionCount ?? repo.question_count ?? 0)
  const createdAt = repo.created_at ?? repo.createdAt
  const updatedAt = repo.updated_at ?? repo.updatedAt

  return {
    ...repo,
    id,
    name: String(repo.name || ''),
    description: repo.description ? String(repo.description) : undefined,
    question_count: questionCount,
    questionCount,
    created_at: createdAt,
    updated_at: updatedAt,
    createdAt,
    updatedAt
  }
}

export function createQuestionBankQuestionDto(question) {
  if (!question) return null

  const id = toNumberOrUndefined(question.id)
  const repoId = toNumberOrUndefined(question.repo_id ?? question.repoId)
  const score = toNumberOrUndefined(question.score)
  const createdAt = question.created_at ?? question.createdAt
  const updatedAt = question.updated_at ?? question.updatedAt

  return {
    ...question,
    id,
    repo_id: repoId,
    repoId,
    title: String(question.title || ''),
    type: question.type ? String(question.type) : undefined,
    difficulty: question.difficulty ? String(question.difficulty) : undefined,
    score,
    created_at: createdAt,
    updated_at: updatedAt,
    createdAt,
    updatedAt
  }
}

export function normalizeFolderParentId(parentId) {
  if (parentId === undefined) return undefined
  return toNumberOrNull(parentId)
}

export function normalizeFolderListQuery(query = {}) {
  return {
    hasParent: Object.prototype.hasOwnProperty.call(query || {}, 'parentId'),
    parentId: normalizeFolderParentId(query?.parentId)
  }
}

export function createFolderDto(folder) {
  if (!folder) return null

  const parentId = toNumberOrNull(folder.parentId ?? folder.parent_id)
  const surveyCount = Number(folder.surveyCount ?? folder.survey_count ?? 0)
  const createdAt = folder.createdAt ?? folder.created_at
  const updatedAt = folder.updatedAt ?? folder.updated_at

  return {
    ...folder,
    parent_id: parentId,
    parentId,
    surveyCount,
    createdAt,
    updatedAt
  }
}

export function normalizeMessageListQuery(query = {}) {
  const pagination = normalizePaginationQuery(query, {
    page: MANAGEMENT_PAGINATION_DEFAULTS.page,
    pageSize: MANAGEMENT_PAGINATION_DEFAULTS.messagesPageSize
  })

  return {
    page: pagination.page,
    pageSize: pagination.pageSize,
    unread: toBooleanOrUndefined(query?.unread),
    types: toStringArray(query?.types)
  }
}

export function createMessageDto(message) {
  if (!message) return null

  return {
    ...message,
    id: Number(message.id || 0),
    entityId: message.entityId == null ? null : Number(message.entityId),
    read: Boolean(message.read),
    readAt: message.readAt || null,
    createdAt: message.createdAt || null
  }
}

export function normalizeAuditListQuery(query = {}) {
  const pagination = normalizePaginationQuery(query, {
    page: MANAGEMENT_PAGINATION_DEFAULTS.page,
    pageSize: MANAGEMENT_PAGINATION_DEFAULTS.auditsPageSize
  })

  return {
    page: pagination.page,
    pageSize: pagination.pageSize,
    username: query?.username ? String(query.username) : undefined,
    action: query?.action ? String(query.action) : undefined,
    targetType: query?.targetType ? String(query.targetType) : undefined
  }
}

export function createAuditLogDto(audit) {
  if (!audit) return null

  return {
    ...audit,
    id: Number(audit.id || 0),
    actorId: audit.actorId == null ? null : Number(audit.actorId),
    targetId: audit.targetId == null ? '' : String(audit.targetId),
    username: audit.username || '',
    actor: audit.actor || audit.username || '-',
    action: audit.action || '',
    targetType: audit.targetType || '',
    detail: audit.detail || '',
    time: audit.time || null
  }
}

export function createAuditPageResult({ list = [], total = 0, page, pageSize } = {}) {
  return createPaginatedResult({
    list: Array.isArray(list) ? list.map(item => createAuditLogDto(item)) : [],
    total,
    page,
    pageSize
  })
}
