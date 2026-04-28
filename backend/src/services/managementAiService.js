import { createHash } from 'crypto'
import {
  createManagementActionProtocol,
  createManagementAiExecutionPageResult,
  listManagementActionDefinitions,
  MANAGEMENT_ACTION_BOUNDARIES,
  MANAGEMENT_ACTION_KIND,
  MANAGEMENT_ACTION_PROTOCOL_VERSION,
  MANAGEMENT_BATCH_KIND,
  MANAGEMENT_ERROR_CODES,
  normalizeManagementAiExecutionListQuery
} from '../../../shared/management.contract.js'
import { throwManagementError, throwManagementPolicyError } from '../http/managementErrors.js'
import { getAdminPolicy } from '../policies/adminPolicy.js'
import {
  ensurePlainObjectPayload,
  normalizeOptionalBoolean,
  normalizeOptionalId,
  normalizeOptionalTrimmedString,
  normalizeRequiredTrimmedString
} from '../utils/managementPayload.js'
import managementAiExecutionRepository from '../repositories/managementAiExecutionRepository.js'
import roleRepository from '../repositories/roleRepository.js'
import {
  createManagedDept,
  deleteManagedDept,
  updateManagedDept
} from './deptService.js'
import {
  createManagedFlow,
  deleteManagedFlow,
  updateManagedFlow
} from './flowService.js'
import {
  createManagedPosition,
  deleteManagedPosition,
  updateManagedPosition
} from './positionService.js'
import {
  createManagedQuestionBankQuestion,
  createManagedQuestionBankRepo,
  deleteManagedQuestionBankQuestion,
  deleteManagedQuestionBankRepo,
  updateManagedQuestionBankRepo
} from './questionBankService.js'
import {
  createManagedRole,
  deleteManagedRole,
  updateManagedRole
} from './roleService.js'
import {
  createManagedUser,
  deleteManagedUser,
  resetManagedUserPassword,
  updateManagedUser
} from './userService.js'
import { recordAudit, runManagementTransaction } from './activity.js'

const ACTION_DEFINITION_MAP = new Map(
  listManagementActionDefinitions().map(definition => [definition.action, definition])
)
const MANAGEMENT_AI_PROTOCOL_PERMISSION_SET = new Set(
  listManagementActionDefinitions().flatMap(definition => Array.isArray(definition.requiredPermissions) ? definition.requiredPermissions : [])
)
const MANAGEMENT_AI_EXPORT_FORMATS = new Set(['json', 'csv'])
const MANAGEMENT_BATCH_MODES = new Set(['serial'])
const MANAGEMENT_AI_EXECUTION_SERVICE_OPTIONS = Object.freeze({
  skipAdminCheck: true
})

function ensureAdmin(actor) {
  throwManagementPolicyError(getAdminPolicy(actor))
}

async function getActorPermissionContext(actor) {
  const permissions = new Set()

  if (Array.isArray(actor?.permissions)) {
    actor.permissions
      .map(item => String(item || '').trim())
      .filter(Boolean)
      .forEach(item => permissions.add(item))
  }

  let role = null
  if (actor?.role_id != null) {
    role = await roleRepository.findById(actor.role_id)
  } else if (actor?.roleCode) {
    role = await roleRepository.findByCode(String(actor.roleCode))
  }

  if (Array.isArray(role?.permissions)) {
    role.permissions
      .map(item => String(item || '').trim())
      .filter(Boolean)
      .forEach(item => permissions.add(item))
  }

  const isAdmin = actor?.roleCode === 'admin' || permissions.has('*')
  return {
    actor,
    role,
    permissions,
    isAdmin
  }
}

function hasAllPermissions(context, requiredPermissions = []) {
  if (context?.isAdmin) return true
  return requiredPermissions.every(permission => context?.permissions?.has(permission))
}

function ensureDefinitionPermission(context, definition, options = {}) {
  const requiredPermissions = Array.isArray(definition?.requiredPermissions)
    ? definition.requiredPermissions.map(item => String(item || '').trim()).filter(Boolean)
    : []

  if (hasAllPermissions(context, requiredPermissions)) {
    return
  }

  const scope = options.stepId
    ? `batch step ${options.stepId} (${definition?.action || 'unknown'})`
    : `management action ${definition?.action || 'unknown'}`

  throwManagementError(
    403,
    MANAGEMENT_ERROR_CODES.ACCESS_FORBIDDEN,
    `Missing required permissions for ${scope}: ${requiredPermissions.join(', ')}`
  )
}

async function ensureManagementProtocolAccess(actor) {
  const context = await getActorPermissionContext(actor)
  if (context.isAdmin) return context

  const hasProtocolAccess = [...MANAGEMENT_AI_PROTOCOL_PERMISSION_SET].some(permission => context.permissions.has(permission))
  if (!hasProtocolAccess) {
    throwManagementError(
      403,
      MANAGEMENT_ERROR_CODES.ACCESS_FORBIDDEN,
      'Management AI protocol access requires at least one management action permission'
    )
  }

  return context
}

async function ensureRunPermissionContext(actor, normalized) {
  const context = await getActorPermissionContext(actor)

  if (normalized.kind === MANAGEMENT_BATCH_KIND) {
    normalized.envelope.actions.forEach(step => {
      ensureDefinitionPermission(context, step.action.definition, { stepId: step.stepId })
    })
    return context
  }

  ensureDefinitionPermission(context, normalized.envelope.definition)
  return context
}

function normalizeTarget(target) {
  if (target === undefined) return {}
  return ensurePlainObjectPayload(target, 'target')
}

function normalizePayloadObject(value, label) {
  if (value === undefined) return undefined
  return ensurePlainObjectPayload(value, label)
}

function parseStepResultReference(value) {
  if (typeof value !== 'string') return null
  const normalized = value.trim()
  if (!normalized) return null

  const compact = normalized.startsWith('$steps.') ? normalized.slice(7) : normalized
  const match = compact.match(/^([A-Za-z0-9_-]+)\.result(?:\.(.+))?$/)
  if (!match) return null

  return {
    raw: normalized,
    stepId: match[1],
    path: match[2] ? match[2].split('.').filter(Boolean) : []
  }
}

function normalizeActionEnvelope(body = {}, options = {}) {
  const nested = options.nested === true
  const payload = ensurePlainObjectPayload(body)
  const kind = payload.kind === undefined
    ? MANAGEMENT_ACTION_KIND
    : normalizeRequiredTrimmedString(payload.kind, {
        field: 'kind',
        code: MANAGEMENT_ERROR_CODES.INVALID_PAYLOAD,
        message: 'kind is required'
      })

  if (kind !== MANAGEMENT_ACTION_KIND) {
    throwManagementError(400, MANAGEMENT_ERROR_CODES.INVALID_PAYLOAD, 'kind must be management.action')
  }

  const version = payload.version === undefined
    ? MANAGEMENT_ACTION_PROTOCOL_VERSION
    : normalizeRequiredTrimmedString(payload.version, {
        field: 'version',
        code: MANAGEMENT_ERROR_CODES.INVALID_PAYLOAD,
        message: 'version is required'
      })

  const action = normalizeRequiredTrimmedString(payload.action, {
    field: 'action',
    code: MANAGEMENT_ERROR_CODES.INVALID_PAYLOAD,
    message: 'action is required'
  })
  const definition = ACTION_DEFINITION_MAP.get(action)
  if (!definition) {
    throwManagementError(400, MANAGEMENT_ERROR_CODES.INVALID_PAYLOAD, `Unsupported management action: ${action}`)
  }

  const target = normalizeTarget(payload.target)
  const input = normalizePayloadObject(payload.input, 'input')
  const changes = normalizePayloadObject(payload.changes, 'changes')
  const reason = normalizeOptionalTrimmedString(payload.reason, {
    field: 'reason',
    allowNull: true,
    emptyToNull: true
  })
  const meta = payload.meta === undefined ? undefined : ensurePlainObjectPayload(payload.meta, 'meta')
  const dryRun = nested
    ? (options.defaultDryRun ?? false)
    : (normalizeOptionalBoolean(payload.dryRun, { field: 'dryRun' }) ?? false)
  const idempotencyKey = nested
    ? null
    : normalizeOptionalTrimmedString(payload.idempotencyKey, {
        field: 'idempotencyKey',
        allowNull: false,
        emptyToNull: false
      })

  if (version !== MANAGEMENT_ACTION_PROTOCOL_VERSION) {
    throwManagementError(400, MANAGEMENT_ERROR_CODES.INVALID_PAYLOAD, `version must be ${MANAGEMENT_ACTION_PROTOCOL_VERSION}`)
  }

  definition.targetKeys.forEach(key => {
    const rawValue = target[key]
    if (nested && typeof rawValue === 'string' && parseStepResultReference(rawValue)) {
      target[key] = rawValue.trim()
      return
    }

    target[key] = normalizeOptionalId(rawValue, { field: `target.${key}` })
    if (!Number.isInteger(target[key]) || target[key] <= 0) {
      throwManagementError(400, MANAGEMENT_ERROR_CODES.INVALID_PAYLOAD, `target.${key} must be a positive integer`)
    }
  })

  if (definition.payloadField === 'input' && !input) {
    throwManagementError(400, MANAGEMENT_ERROR_CODES.INVALID_PAYLOAD, 'input is required for this action')
  }
  if (definition.payloadField === 'changes' && !changes) {
    throwManagementError(400, MANAGEMENT_ERROR_CODES.INVALID_PAYLOAD, 'changes is required for this action')
  }
  if (!nested && !dryRun && !idempotencyKey) {
    throwManagementError(400, MANAGEMENT_ERROR_CODES.AI_IDEMPOTENCY_REQUIRED, 'idempotencyKey is required when dryRun is false')
  }

  return {
    kind,
    version,
    action,
    dryRun,
    idempotencyKey,
    target,
    input,
    changes,
    reason,
    meta,
    definition
  }
}

function normalizeBatchEnvelope(body = {}) {
  const payload = ensurePlainObjectPayload(body)
  const kind = payload.kind === undefined
    ? MANAGEMENT_BATCH_KIND
    : normalizeRequiredTrimmedString(payload.kind, {
        field: 'kind',
        code: MANAGEMENT_ERROR_CODES.INVALID_PAYLOAD,
        message: 'kind is required'
      })

  if (kind !== MANAGEMENT_BATCH_KIND) {
    throwManagementError(400, MANAGEMENT_ERROR_CODES.INVALID_PAYLOAD, 'kind must be management.batch')
  }

  const version = payload.version === undefined
    ? MANAGEMENT_ACTION_PROTOCOL_VERSION
    : normalizeRequiredTrimmedString(payload.version, {
        field: 'version',
        code: MANAGEMENT_ERROR_CODES.INVALID_PAYLOAD,
        message: 'version is required'
      })
  if (version !== MANAGEMENT_ACTION_PROTOCOL_VERSION) {
    throwManagementError(400, MANAGEMENT_ERROR_CODES.INVALID_PAYLOAD, `version must be ${MANAGEMENT_ACTION_PROTOCOL_VERSION}`)
  }

  const dryRun = normalizeOptionalBoolean(payload.dryRun, { field: 'dryRun' }) ?? false
  const idempotencyKey = normalizeOptionalTrimmedString(payload.idempotencyKey, {
    field: 'idempotencyKey',
    allowNull: false,
    emptyToNull: false
  })
  if (!dryRun && !idempotencyKey) {
    throwManagementError(400, MANAGEMENT_ERROR_CODES.AI_IDEMPOTENCY_REQUIRED, 'idempotencyKey is required when dryRun is false')
  }

  const mode = payload.mode === undefined
    ? 'serial'
    : normalizeRequiredTrimmedString(payload.mode, {
        field: 'mode',
        code: MANAGEMENT_ERROR_CODES.INVALID_PAYLOAD,
        message: 'mode is required'
      })
  if (!MANAGEMENT_BATCH_MODES.has(mode)) {
    throwManagementError(400, MANAGEMENT_ERROR_CODES.INVALID_PAYLOAD, 'mode must be serial')
  }

  const continueOnError = normalizeOptionalBoolean(payload.continueOnError, { field: 'continueOnError' }) ?? false
  const batchId = normalizeOptionalTrimmedString(payload.batchId, {
    field: 'batchId',
    allowNull: true,
    emptyToNull: true
  }) || idempotencyKey || null
  const reason = normalizeOptionalTrimmedString(payload.reason, {
    field: 'reason',
    allowNull: true,
    emptyToNull: true
  })
  const meta = payload.meta === undefined ? undefined : ensurePlainObjectPayload(payload.meta, 'meta')
  if (!Array.isArray(payload.actions) || payload.actions.length === 0) {
    throwManagementError(400, MANAGEMENT_ERROR_CODES.INVALID_PAYLOAD, 'actions must be a non-empty array')
  }

  const actions = payload.actions.map((item, index) => {
    const step = ensurePlainObjectPayload(item, `actions[${index}]`)
    const stepId = normalizeOptionalTrimmedString(step.stepId, {
      field: `actions[${index}].stepId`,
      allowNull: true,
      emptyToNull: true
    }) || `step-${index + 1}`
    const actionPayload = step.action === undefined
      ? step
      : ensurePlainObjectPayload(step.action, `actions[${index}].action`)

    return {
      stepId,
      stepIndex: index + 1,
      action: normalizeActionEnvelope(actionPayload, {
        nested: true,
        defaultDryRun: dryRun
      })
    }
  })

  const uniqueStepIds = new Set(actions.map(item => item.stepId))
  if (uniqueStepIds.size !== actions.length) {
    throwManagementError(400, MANAGEMENT_ERROR_CODES.INVALID_PAYLOAD, 'stepId must be unique within a batch')
  }

  validateBatchStepReferences(actions)

  return {
    kind,
    version,
    batchId,
    dryRun,
    idempotencyKey,
    mode,
    continueOnError,
    reason,
    meta,
    actions
  }
}

function normalizeRequestEnvelope(body = {}) {
  const payload = ensurePlainObjectPayload(body)
  const kind = payload.kind === undefined
    ? MANAGEMENT_ACTION_KIND
    : normalizeRequiredTrimmedString(payload.kind, {
        field: 'kind',
        code: MANAGEMENT_ERROR_CODES.INVALID_PAYLOAD,
        message: 'kind is required'
      })

  if (kind === MANAGEMENT_ACTION_KIND) {
    return {
      kind,
      envelope: normalizeActionEnvelope(payload)
    }
  }

  if (kind === MANAGEMENT_BATCH_KIND) {
    return {
      kind,
      envelope: normalizeBatchEnvelope(payload)
    }
  }

  throwManagementError(400, MANAGEMENT_ERROR_CODES.INVALID_PAYLOAD, 'kind must be management.action or management.batch')
}

function collectStepReferences(value, refs = []) {
  const parsed = parseStepResultReference(value)
  if (parsed) {
    refs.push(parsed)
    return refs
  }

  if (Array.isArray(value)) {
    value.forEach(item => collectStepReferences(item, refs))
    return refs
  }

  if (value && typeof value === 'object') {
    Object.values(value).forEach(item => collectStepReferences(item, refs))
  }

  return refs
}

function validateBatchStepReferences(actions = []) {
  const stepIndexById = new Map(actions.map(step => [step.stepId, step.stepIndex]))

  actions.forEach(step => {
    const refs = [
      ...collectStepReferences(step.action.target),
      ...collectStepReferences(step.action.input),
      ...collectStepReferences(step.action.changes),
      ...collectStepReferences(step.action.meta)
    ]

    refs.forEach(ref => {
      const sourceStepIndex = stepIndexById.get(ref.stepId)
      if (!sourceStepIndex) {
        throwManagementError(400, MANAGEMENT_ERROR_CODES.INVALID_PAYLOAD, `Unknown batch step reference: ${ref.raw}`)
      }
      if (sourceStepIndex >= step.stepIndex) {
        throwManagementError(400, MANAGEMENT_ERROR_CODES.INVALID_PAYLOAD, `Batch step references must point to earlier steps: ${ref.raw}`)
      }
    })
  })
}

function toActionSummary({ action, target = {}, reason }) {
  const targetPairs = Object.keys(target).map(key => `${key}=${target[key]}`)
  const targetText = targetPairs.length ? ` (${targetPairs.join(', ')})` : ''
  const reasonText = reason ? `, reason: ${reason}` : ''
  return `${action}${targetText}${reasonText}`
}

function toBatchSummary({ batchId, mode = 'serial', actions = [], reason }) {
  const batchText = batchId ? `batch=${batchId}, ` : ''
  const reasonText = reason ? `, reason: ${reason}` : ''
  return `${MANAGEMENT_BATCH_KIND} (${batchText}mode=${mode}, steps=${actions.length}${reasonText})`
}

function stableJsonStringify(value) {
  if (value === null) return 'null'
  if (typeof value === 'number' || typeof value === 'boolean') return JSON.stringify(value)
  if (typeof value === 'string') return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map(item => stableJsonStringify(item)).join(',')}]`
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stableJsonStringify(value[key])}`).join(',')}}`
  }
  return JSON.stringify(value ?? null)
}

function createRequestHash(normalized) {
  return createHash('sha256').update(stableJsonStringify(normalized)).digest('hex')
}

function createDerivedIdempotencyKey(parentKey, stepId) {
  const hash = createHash('sha256').update(`${parentKey}:${stepId}`).digest('hex').slice(0, 16)
  const head = String(parentKey).slice(0, 96)
  return `${head}:${hash}`
}

function getActionTargetId(envelope) {
  const targetValues = Object.values(envelope.target || {})
  if (!targetValues.length) return null
  const first = targetValues[0]
  return first == null ? null : String(first)
}

function createBoundaryMetadata({ kind }) {
  return {
    ...MANAGEMENT_ACTION_BOUNDARIES,
    serviceDispatch: true,
    batchAllowed: true,
    orchestration: kind === MANAGEMENT_BATCH_KIND ? 'serial-step-orchestrator' : 'single-action-dispatch'
  }
}

function normalizeExecutionExportFormat(value) {
  const normalized = value == null || value === ''
    ? 'json'
    : String(value).trim().toLowerCase()

  if (!MANAGEMENT_AI_EXPORT_FORMATS.has(normalized)) {
    throwManagementError(400, MANAGEMENT_ERROR_CODES.INVALID_PAYLOAD, 'format must be json or csv')
  }

  return normalized
}

function createExportTimestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-')
}

function sanitizeExecutionExportFilters(query = {}) {
  return Object.fromEntries(
    Object.entries({
      action: query.action,
      status: query.status,
      actor_id: query.actor_id,
      created_from: query.created_from,
      created_to: query.created_to,
      batch_id: query.batch_id,
      parent_execution_id: query.parent_execution_id,
      step_id: query.step_id
    }).filter(([, value]) => value !== undefined)
  )
}

function escapeCsvValue(value) {
  const normalized = value == null ? '' : String(value)
  if (!/[",\r\n]/.test(normalized)) return normalized
  return `"${normalized.replace(/"/g, '""')}"`
}

function toCsvJson(value) {
  if (value == null) return ''
  return stableJsonStringify(value)
}

function createManagementAiExecutionsCsvBuffer(rows = []) {
  const columns = [
    'id',
    'actorId',
    'batchId',
    'parentExecutionId',
    'stepId',
    'stepIndex',
    'action',
    'status',
    'idempotencyKey',
    'errorCode',
    'errorStage',
    'errorClass',
    'retryable',
    'failedStepId',
    'failedAction',
    'errorMessage',
    'createdAt',
    'updatedAt',
    'requestPayload',
    'responsePayload'
  ]

  const lines = [
    columns.join(','),
    ...rows.map(row => columns.map(column => {
      if (column === 'requestPayload') return escapeCsvValue(toCsvJson(row.requestPayload))
      if (column === 'responsePayload') return escapeCsvValue(toCsvJson(row.responsePayload))
      return escapeCsvValue(row[column])
    }).join(','))
  ]

  return Buffer.from(`\uFEFF${lines.join('\r\n')}`, 'utf8')
}

async function recordManagementAiAudit({ actor, action, targetType, targetId, detail }) {
  await recordAudit({
    actor,
    action,
    targetType,
    targetId,
    detail
  })
}

function classifyManagementAiError(error, context = {}) {
  const code = String(error?.code || 'INTERNAL_ERROR')
  const status = Number(error?.status || 500)
  const failedStepId = context.failedStepId || null
  const failedAction = context.failedAction || null

  if (code === MANAGEMENT_ERROR_CODES.ACCESS_FORBIDDEN || status === 401 || status === 403) {
    return {
      errorCode: code,
      errorStage: 'policy',
      errorClass: 'permission_denied',
      retryable: false,
      failedStepId,
      failedAction,
      errorMessage: error?.message || 'Forbidden'
    }
  }

  if (code === MANAGEMENT_ERROR_CODES.AI_IDEMPOTENCY_REQUIRED || code === MANAGEMENT_ERROR_CODES.AI_IDEMPOTENCY_CONFLICT) {
    return {
      errorCode: code,
      errorStage: 'idempotency',
      errorClass: 'manual_intervention_required',
      retryable: false,
      failedStepId,
      failedAction,
      errorMessage: error?.message || 'Idempotency conflict'
    }
  }

  if (
    code === MANAGEMENT_ERROR_CODES.INVALID_PAYLOAD ||
    /_REQUIRED$/.test(code) ||
    /_REQUIRED_FIELDS$/.test(code) ||
    /_INVALID$/.test(code) ||
    /_TITLE_REQUIRED$/.test(code) ||
    /_NAME_REQUIRED$/.test(code)
  ) {
    return {
      errorCode: code,
      errorStage: 'validation',
      errorClass: 'user_fixable',
      retryable: false,
      failedStepId,
      failedAction,
      errorMessage: error?.message || 'Invalid payload'
    }
  }

  if (/_NOT_FOUND$/.test(code)) {
    return {
      errorCode: code,
      errorStage: 'execution',
      errorClass: 'target_not_found',
      retryable: false,
      failedStepId,
      failedAction,
      errorMessage: error?.message || 'Target not found'
    }
  }

  if (/_EXISTS$/.test(code) || /_HAS_CHILDREN$/.test(code) || /_SELF_PARENT$/.test(code) || /_PARENT_NOT_FOUND$/.test(code)) {
    return {
      errorCode: code,
      errorStage: 'execution',
      errorClass: 'dependency_conflict',
      retryable: false,
      failedStepId,
      failedAction,
      errorMessage: error?.message || 'Dependency conflict'
    }
  }

  if (code.startsWith('MGMT_')) {
    return {
      errorCode: code,
      errorStage: 'execution',
      errorClass: 'user_fixable',
      retryable: false,
      failedStepId,
      failedAction,
      errorMessage: error?.message || 'Management action failed'
    }
  }

  return {
    errorCode: code,
    errorStage: 'system',
    errorClass: 'service_exception',
    retryable: status >= 500 || !error?.status,
    failedStepId,
    failedAction,
    errorMessage: error?.message || 'Management AI action failed'
  }
}

async function createExecutionRecord({
  actor,
  action,
  idempotencyKey,
  batchId = null,
  parentExecutionId = null,
  stepId = null,
  stepIndex = null,
  requestHash,
  normalized
}) {
  return runManagementTransaction(async db => {
    return managementAiExecutionRepository.create({
      actor_id: actor.sub,
      idempotency_key: idempotencyKey,
      batch_id: batchId,
      parent_execution_id: parentExecutionId,
      step_id: stepId,
      step_index: stepIndex,
      action,
      request_hash: requestHash,
      status: 'pending',
      request_payload: normalized
    }, { db })
  })
}

async function updateExecutionRecord(executionId, fields) {
  return runManagementTransaction(async db => {
    return managementAiExecutionRepository.update(executionId, fields, { db })
  })
}

async function findExecutionRecord(actorId, idempotencyKey) {
  return managementAiExecutionRepository.findByActorAndKey(actorId, idempotencyKey)
}

function buildActionNormalized(envelope) {
  return {
    kind: envelope.kind,
    version: envelope.version,
    action: envelope.action,
    dryRun: envelope.dryRun,
    idempotencyKey: envelope.idempotencyKey,
    target: envelope.target,
    input: envelope.input,
    changes: envelope.changes,
    reason: envelope.reason,
    meta: envelope.meta
  }
}

function buildBatchNormalized(envelope) {
  return {
    kind: envelope.kind,
    version: envelope.version,
    batchId: envelope.batchId,
    dryRun: envelope.dryRun,
    idempotencyKey: envelope.idempotencyKey,
    mode: envelope.mode,
    continueOnError: envelope.continueOnError,
    reason: envelope.reason,
    meta: envelope.meta,
    actions: envelope.actions.map(step => ({
      stepId: step.stepId,
      action: {
        kind: step.action.kind,
        version: step.action.version,
        action: step.action.action,
        target: step.action.target,
        input: step.action.input,
        changes: step.action.changes,
        reason: step.action.reason,
        meta: step.action.meta
      }
    }))
  }
}

function buildActionResultEnvelope({ envelope, normalized, result, dryRun, executed, replayed = false, executionId = null }) {
  return {
    kind: MANAGEMENT_ACTION_KIND,
    adminOnly: true,
    dryRun,
    executed,
    replayed,
    idempotencyKey: normalized.idempotencyKey || null,
    executionId,
    boundaries: createBoundaryMetadata({ kind: MANAGEMENT_ACTION_KIND }),
    summary: toActionSummary(envelope),
    normalized,
    ...(result !== undefined ? { result } : {})
  }
}

function buildBatchResultEnvelope({ envelope, normalized, result, dryRun, executed, replayed = false, executionId = null }) {
  return {
    kind: MANAGEMENT_BATCH_KIND,
    adminOnly: true,
    dryRun,
    executed,
    replayed,
    batchId: normalized.batchId || null,
    idempotencyKey: normalized.idempotencyKey || null,
    executionId,
    boundaries: createBoundaryMetadata({ kind: MANAGEMENT_BATCH_KIND }),
    summary: toBatchSummary(envelope),
    normalized,
    ...(result !== undefined ? { result } : {})
  }
}

async function resolveIdempotentActionExecution({ actor, envelope, normalized, requestHash }) {
  const existing = await findExecutionRecord(actor.sub, envelope.idempotencyKey)
  if (!existing) return null

  if (existing.requestHash !== requestHash) {
    throwManagementError(409, MANAGEMENT_ERROR_CODES.AI_IDEMPOTENCY_CONFLICT, 'idempotencyKey has already been used for a different management action payload')
  }

  if (existing.status === 'completed') {
    await recordManagementAiAudit({
      actor,
      action: 'management_ai.replay',
      targetType: envelope.action,
      targetId: envelope.idempotencyKey || getActionTargetId(envelope),
      detail: `replayed: ${toActionSummary(envelope)}`
    })
    return buildActionResultEnvelope({
      envelope,
      normalized,
      result: existing.responsePayload ?? null,
      dryRun: false,
      executed: true,
      replayed: true,
      executionId: existing.id
    })
  }

  if (existing.status === 'failed') {
    throwManagementError(409, MANAGEMENT_ERROR_CODES.AI_IDEMPOTENCY_CONFLICT, `idempotencyKey previously failed: ${existing.errorMessage || 'request failed'}`)
  }

  throwManagementError(409, MANAGEMENT_ERROR_CODES.AI_IDEMPOTENCY_CONFLICT, 'idempotencyKey is already in progress or outcome is not yet finalized')
}

async function resolveIdempotentBatchExecution({ actor, envelope, normalized, requestHash }) {
  const existing = await findExecutionRecord(actor.sub, envelope.idempotencyKey)
  if (!existing) return null

  if (existing.requestHash !== requestHash) {
    throwManagementError(409, MANAGEMENT_ERROR_CODES.AI_IDEMPOTENCY_CONFLICT, 'idempotencyKey has already been used for a different management batch payload')
  }

  if (existing.status === 'completed') {
    await recordManagementAiAudit({
      actor,
      action: 'management_ai.batch.replay',
      targetType: MANAGEMENT_BATCH_KIND,
      targetId: envelope.batchId || envelope.idempotencyKey,
      detail: `replayed: ${toBatchSummary(envelope)}`
    })
    return buildBatchResultEnvelope({
      envelope,
      normalized,
      result: existing.responsePayload ?? null,
      dryRun: false,
      executed: true,
      replayed: true,
      executionId: existing.id
    })
  }

  if (existing.status === 'failed') {
    throwManagementError(409, MANAGEMENT_ERROR_CODES.AI_IDEMPOTENCY_CONFLICT, `idempotencyKey previously failed: ${existing.errorMessage || 'request failed'}`)
  }

  throwManagementError(409, MANAGEMENT_ERROR_CODES.AI_IDEMPOTENCY_CONFLICT, 'idempotencyKey is already in progress or outcome is not yet finalized')
}

async function executeAction(actor, envelope, options = MANAGEMENT_AI_EXECUTION_SERVICE_OPTIONS) {
  switch (envelope.action) {
    case 'user.create':
      return createManagedUser({ actor, body: envelope.input }, options)
    case 'user.update':
      return updateManagedUser({ actor, userId: envelope.target.userId, body: envelope.changes }, options)
    case 'user.delete':
      await deleteManagedUser({ actor, userId: envelope.target.userId }, options)
      return { deleted: true, userId: envelope.target.userId }
    case 'user.password.reset':
      await resetManagedUserPassword({ actor, userId: envelope.target.userId, body: envelope.input }, options)
      return { reset: true, userId: envelope.target.userId }
    case 'role.create':
      return createManagedRole({ actor, body: envelope.input }, options)
    case 'role.update':
      return updateManagedRole({ actor, roleId: envelope.target.roleId, body: envelope.changes }, options)
    case 'role.delete':
      await deleteManagedRole({ actor, roleId: envelope.target.roleId }, options)
      return { deleted: true, roleId: envelope.target.roleId }
    case 'dept.create':
      return createManagedDept({ actor, body: envelope.input }, options)
    case 'dept.update':
      return updateManagedDept({ actor, deptId: envelope.target.deptId, body: envelope.changes }, options)
    case 'dept.delete':
      return deleteManagedDept({ actor, deptId: envelope.target.deptId }, options)
    case 'position.create':
      return createManagedPosition({ actor, body: envelope.input }, options)
    case 'position.update':
      return updateManagedPosition({ actor, positionId: envelope.target.positionId, body: envelope.changes }, options)
    case 'position.delete':
      await deleteManagedPosition({ actor, positionId: envelope.target.positionId }, options)
      return { deleted: true, positionId: envelope.target.positionId }
    case 'flow.create':
      return createManagedFlow({ actor, body: envelope.input }, options)
    case 'flow.update':
      return updateManagedFlow({ actor, flowId: envelope.target.flowId, body: envelope.changes }, options)
    case 'flow.delete':
      await deleteManagedFlow({ actor, flowId: envelope.target.flowId }, options)
      return { deleted: true, flowId: envelope.target.flowId }
    case 'question_bank.repo.create':
      return createManagedQuestionBankRepo({ actor, body: envelope.input }, options)
    case 'question_bank.repo.update':
      return updateManagedQuestionBankRepo({ actor, repoId: envelope.target.repoId, body: envelope.changes }, options)
    case 'question_bank.repo.delete':
      await deleteManagedQuestionBankRepo({ actor, repoId: envelope.target.repoId }, options)
      return { deleted: true, repoId: envelope.target.repoId }
    case 'question_bank.question.create':
      return createManagedQuestionBankQuestion({ actor, repoId: envelope.target.repoId, body: envelope.input }, options)
    case 'question_bank.question.delete':
      await deleteManagedQuestionBankQuestion({
        actor,
        repoId: envelope.target.repoId,
        questionId: envelope.target.questionId
      }, options)
      return {
        deleted: true,
        repoId: envelope.target.repoId,
        questionId: envelope.target.questionId
      }
    default:
      throwManagementError(400, MANAGEMENT_ERROR_CODES.INVALID_PAYLOAD, `Unsupported management action: ${envelope.action}`)
  }
}

async function runSingleAction({ actor, envelope }) {
  const normalized = buildActionNormalized(envelope)

  if (envelope.dryRun) {
    await recordManagementAiAudit({
      actor,
      action: 'management_ai.dry_run',
      targetType: envelope.action,
      targetId: envelope.idempotencyKey || getActionTargetId(envelope),
      detail: `validated: ${toActionSummary(envelope)}`
    })
    return buildActionResultEnvelope({
      envelope,
      normalized,
      dryRun: true,
      executed: false
    })
  }

  const requestHash = createRequestHash(normalized)
  const replay = await resolveIdempotentActionExecution({ actor, envelope, normalized, requestHash })
  if (replay) {
    return replay
  }

  let execution
  try {
    execution = await createExecutionRecord({
      actor,
      action: envelope.action,
      idempotencyKey: envelope.idempotencyKey,
      requestHash,
      normalized
    })
  } catch {
    const raceReplay = await resolveIdempotentActionExecution({ actor, envelope, normalized, requestHash })
    if (raceReplay) return raceReplay
    throwManagementError(409, MANAGEMENT_ERROR_CODES.AI_IDEMPOTENCY_CONFLICT, 'idempotencyKey is already reserved')
  }

  try {
    const result = await executeAction(actor, envelope)
    await updateExecutionRecord(execution.id, {
      status: 'completed',
      response_payload: result ?? null,
      error_code: null,
      error_message: null
    })
    await recordManagementAiAudit({
      actor,
      action: 'management_ai.execute',
      targetType: envelope.action,
      targetId: envelope.idempotencyKey || getActionTargetId(envelope),
      detail: `completed: ${toActionSummary(envelope)}`
    })
    return buildActionResultEnvelope({
      envelope,
      normalized,
      result: result ?? null,
      dryRun: false,
      executed: true,
      executionId: execution.id
    })
  } catch (error) {
    const classified = classifyManagementAiError(error, {
      failedAction: envelope.action
    })
    await updateExecutionRecord(execution.id, {
      status: 'failed',
      error_code: classified.errorCode,
      error_stage: classified.errorStage,
      error_class: classified.errorClass,
      retryable: classified.retryable,
      failed_step_id: classified.failedStepId,
      failed_action: classified.failedAction,
      error_message: classified.errorMessage,
      response_payload: null
    }).catch(() => {})
    await recordManagementAiAudit({
      actor,
      action: 'management_ai.failed',
      targetType: envelope.action,
      targetId: envelope.idempotencyKey || getActionTargetId(envelope),
      detail: `failed: ${toActionSummary(envelope)}; error=${classified.errorCode}`
    }).catch(() => {})
    throw error
  }
}

function createBatchStepRequest(step, parentIdempotencyKey, stepResultsById) {
  const idempotencyKey = createDerivedIdempotencyKey(parentIdempotencyKey, step.stepId)
  const resolvedAction = resolveBatchReferenceValue(step.action, stepResultsById)
  const envelope = normalizeActionEnvelope({
    ...resolvedAction,
    dryRun: false,
    idempotencyKey
  })
  const normalized = buildActionNormalized(envelope)
  return {
    envelope,
    normalized,
    requestHash: createRequestHash(normalized)
  }
}

function buildSkippedBatchStepResult(step) {
  return {
    stepId: step.stepId,
    stepIndex: step.stepIndex,
    action: step.action.action,
    status: 'skipped',
    executionId: null
  }
}

function getNestedReferenceValue(source, path = []) {
  return path.reduce((current, segment) => {
    if (current == null || typeof current !== 'object') return undefined
    return current[segment]
  }, source)
}

function cloneResolvedReferenceValue(value) {
  if (Array.isArray(value)) {
    return value.map(item => cloneResolvedReferenceValue(item))
  }
  if (value && typeof value === 'object') {
    return JSON.parse(JSON.stringify(value))
  }
  return value
}

function resolveBatchReferenceValue(value, stepResultsById) {
  const parsed = parseStepResultReference(value)
  if (parsed) {
    const source = stepResultsById.get(parsed.stepId)
    if (!source || source.status !== 'completed') {
      throwManagementError(400, MANAGEMENT_ERROR_CODES.INVALID_PAYLOAD, `Referenced batch step is not available: ${parsed.raw}`)
    }
    const resolved = parsed.path.length ? getNestedReferenceValue(source.result, parsed.path) : source.result
    if (resolved === undefined) {
      throwManagementError(400, MANAGEMENT_ERROR_CODES.INVALID_PAYLOAD, `Referenced batch result path is missing: ${parsed.raw}`)
    }
    return cloneResolvedReferenceValue(resolved)
  }

  if (Array.isArray(value)) {
    return value.map(item => resolveBatchReferenceValue(item, stepResultsById))
  }

  if (value && typeof value === 'object') {
    return Object.keys(value).reduce((result, key) => {
      result[key] = resolveBatchReferenceValue(value[key], stepResultsById)
      return result
    }, {})
  }

  return value
}

function buildBatchExecutionResult(envelope, steps, parentExecutionId) {
  const completedCount = steps.filter(step => step.status === 'completed').length
  const failedCount = steps.filter(step => step.status === 'failed').length
  const skippedCount = steps.filter(step => step.status === 'skipped').length

  return {
    batchId: envelope.batchId || null,
    mode: envelope.mode,
    continueOnError: envelope.continueOnError,
    executionId: parentExecutionId,
    counts: {
      total: steps.length,
      completed: completedCount,
      failed: failedCount,
      skipped: skippedCount
    },
    steps
  }
}

async function runBatch({ actor, envelope }) {
  const normalized = buildBatchNormalized(envelope)

  if (envelope.dryRun) {
    await recordManagementAiAudit({
      actor,
      action: 'management_ai.batch.dry_run',
      targetType: MANAGEMENT_BATCH_KIND,
      targetId: envelope.batchId || envelope.idempotencyKey,
      detail: `validated: ${toBatchSummary(envelope)}`
    })
    return buildBatchResultEnvelope({
      envelope,
      normalized,
      dryRun: true,
      executed: false,
      result: buildBatchExecutionResult(envelope, normalized.actions.map((step, index) => ({
        stepId: step.stepId,
        stepIndex: index + 1,
        action: step.action.action,
        status: 'validated',
        executionId: null
      })), null)
    })
  }

  const requestHash = createRequestHash(normalized)
  const replay = await resolveIdempotentBatchExecution({ actor, envelope, normalized, requestHash })
  if (replay) {
    return replay
  }

  let batchExecution
  try {
    batchExecution = await createExecutionRecord({
      actor,
      action: MANAGEMENT_BATCH_KIND,
      idempotencyKey: envelope.idempotencyKey,
      batchId: envelope.batchId || envelope.idempotencyKey,
      requestHash,
      normalized
    })
  } catch {
    const raceReplay = await resolveIdempotentBatchExecution({ actor, envelope, normalized, requestHash })
    if (raceReplay) return raceReplay
    throwManagementError(409, MANAGEMENT_ERROR_CODES.AI_IDEMPOTENCY_CONFLICT, 'idempotencyKey is already reserved')
  }

  const stepResults = []
  const stepResultsById = new Map()
  let firstFailure = null

  try {
    for (let index = 0; index < envelope.actions.length; index += 1) {
      const step = envelope.actions[index]
      const stepRequest = createBatchStepRequest(step, envelope.idempotencyKey, stepResultsById)
      const stepExecution = await createExecutionRecord({
        actor,
        action: step.action.action,
        idempotencyKey: stepRequest.envelope.idempotencyKey,
        batchId: envelope.batchId || envelope.idempotencyKey,
        parentExecutionId: batchExecution.id,
        stepId: step.stepId,
        stepIndex: step.stepIndex,
        requestHash: stepRequest.requestHash,
        normalized: stepRequest.normalized
      })

      try {
        const result = await executeAction(actor, stepRequest.envelope)
        await updateExecutionRecord(stepExecution.id, {
          status: 'completed',
          response_payload: result ?? null,
          error_code: null,
          error_message: null
        })
        stepResults.push({
          stepId: step.stepId,
          stepIndex: step.stepIndex,
          action: step.action.action,
          status: 'completed',
          executionId: stepExecution.id,
          result: result ?? null
        })
        stepResultsById.set(step.stepId, stepResults[stepResults.length - 1])
      } catch (error) {
        const classified = classifyManagementAiError(error, {
          failedStepId: step.stepId,
          failedAction: step.action.action
        })

        await updateExecutionRecord(stepExecution.id, {
          status: 'failed',
          response_payload: null,
          error_code: classified.errorCode,
          error_stage: classified.errorStage,
          error_class: classified.errorClass,
          retryable: classified.retryable,
          failed_step_id: classified.failedStepId,
          failed_action: classified.failedAction,
          error_message: classified.errorMessage
        }).catch(() => {})

        const failedStep = {
          stepId: step.stepId,
          stepIndex: step.stepIndex,
          action: step.action.action,
          status: 'failed',
          executionId: stepExecution.id,
          error: {
            code: classified.errorCode,
            stage: classified.errorStage,
            class: classified.errorClass,
            retryable: classified.retryable,
            message: classified.errorMessage
          },
          failedStepId: classified.failedStepId,
          failedAction: classified.failedAction
        }
        stepResults.push(failedStep)
        if (!firstFailure) {
          firstFailure = failedStep
        }

        if (!envelope.continueOnError) {
          for (let restIndex = index + 1; restIndex < envelope.actions.length; restIndex += 1) {
            stepResults.push(buildSkippedBatchStepResult(envelope.actions[restIndex]))
          }
          break
        }
      }
    }

    const batchResult = buildBatchExecutionResult(envelope, stepResults, batchExecution.id)
    const failed = stepResults.some(step => step.status === 'failed')

    await updateExecutionRecord(batchExecution.id, {
      status: failed ? 'failed' : 'completed',
      response_payload: batchResult,
      error_code: failed ? firstFailure?.error?.code || 'INTERNAL_ERROR' : null,
      error_stage: failed ? firstFailure?.error?.stage || null : null,
      error_class: failed ? firstFailure?.error?.class || null : null,
      retryable: failed ? (firstFailure?.error?.retryable ?? null) : null,
      failed_step_id: failed ? firstFailure?.failedStepId || null : null,
      failed_action: failed ? firstFailure?.failedAction || null : null,
      error_message: failed ? firstFailure?.error?.message || 'Management AI batch failed' : null
    })

    await recordManagementAiAudit({
      actor,
      action: failed ? 'management_ai.batch.failed' : 'management_ai.batch.execute',
      targetType: MANAGEMENT_BATCH_KIND,
      targetId: envelope.batchId || envelope.idempotencyKey,
      detail: `${failed ? 'failed' : 'completed'}: ${toBatchSummary(envelope)}`
    })

    if (failed) {
      throwManagementError(409, firstFailure?.error?.code || MANAGEMENT_ERROR_CODES.INVALID_PAYLOAD, firstFailure?.error?.message || 'Management AI batch failed')
    }

    return buildBatchResultEnvelope({
      envelope,
      normalized,
      result: batchResult,
      dryRun: false,
      executed: true,
      executionId: batchExecution.id
    })
  } catch (error) {
    const classified = classifyManagementAiError(error)
    if (!stepResults.some(step => step.status === 'failed')) {
      await updateExecutionRecord(batchExecution.id, {
        status: 'failed',
        response_payload: buildBatchExecutionResult(envelope, stepResults, batchExecution.id),
        error_code: classified.errorCode,
        error_stage: classified.errorStage,
        error_class: classified.errorClass,
        retryable: classified.retryable,
        failed_step_id: classified.failedStepId,
        failed_action: classified.failedAction,
        error_message: classified.errorMessage
      }).catch(() => {})
      await recordManagementAiAudit({
        actor,
        action: 'management_ai.batch.failed',
        targetType: MANAGEMENT_BATCH_KIND,
        targetId: envelope.batchId || envelope.idempotencyKey,
        detail: `failed: ${toBatchSummary(envelope)}; error=${classified.errorCode}`
      }).catch(() => {})
    }
    throw error
  }
}

export async function getManagementAiProtocol({ actor }) {
  await ensureManagementProtocolAccess(actor)
  return createManagementActionProtocol()
}

export async function listManagementAiExecutions({ actor, query = {} }) {
  ensureAdmin(actor)
  const normalized = normalizeManagementAiExecutionListQuery(query)
  const result = await managementAiExecutionRepository.list(normalized)
  return createManagementAiExecutionPageResult({
    ...result,
    page: normalized.page,
    pageSize: normalized.pageSize
  })
}

export async function exportManagementAiExecutions({ actor, query = {} }) {
  ensureAdmin(actor)

  const format = normalizeExecutionExportFormat(query?.format)
  const normalized = normalizeManagementAiExecutionListQuery(query)
  const rows = await managementAiExecutionRepository.listAll(normalized)
  const exportedAt = new Date().toISOString()
  const filenameBase = `management-ai-executions-${createExportTimestamp()}`

  if (format === 'csv') {
    return {
      filename: `${filenameBase}.csv`,
      contentType: 'text/csv; charset=utf-8',
      buffer: createManagementAiExecutionsCsvBuffer(rows)
    }
  }

  return {
    filename: `${filenameBase}.json`,
    contentType: 'application/json; charset=utf-8',
    buffer: Buffer.from(JSON.stringify({
      exportedAt,
      total: rows.length,
      filters: sanitizeExecutionExportFilters(normalized),
      list: rows
    }, null, 2), 'utf8')
  }
}

export async function runManagementAiAction({ actor, body = {} }) {
  const normalized = normalizeRequestEnvelope(body)
  await ensureRunPermissionContext(actor, normalized)

  if (normalized.kind === MANAGEMENT_BATCH_KIND) {
    return runBatch({
      actor,
      envelope: normalized.envelope
    })
  }

  return runSingleAction({
    actor,
    envelope: normalized.envelope
  })
}
