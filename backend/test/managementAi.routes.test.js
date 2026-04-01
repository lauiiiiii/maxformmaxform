import test from 'node:test'
import assert from 'node:assert/strict'
import jwt from 'jsonwebtoken'
import config from '../src/config/index.js'
import AuditLog from '../src/models/AuditLog.js'
import Flow from '../src/models/Flow.js'
import ManagementAiExecution from '../src/models/ManagementAiExecution.js'
import Message from '../src/models/Message.js'
import QuestionBankRepo from '../src/models/QuestionBankRepo.js'
import Role from '../src/models/Role.js'
import User from '../src/models/User.js'
import { registerApiRouteHarness } from './helpers/apiRouteHarness.js'

const { request, requestRaw, requestPublic } = registerApiRouteHarness()

function createToken(payload = {}) {
  return jwt.sign(
    { sub: 2, username: 'user', roleCode: 'user', ...payload },
    config.jwt.secret,
    { expiresIn: '1h' }
  )
}

function stubAuthenticatedUsers() {
  User.findById = async id => {
    if (Number(id) === 1) return { id: 1, is_active: true, role_id: 1 }
    if (Number(id) === 2) return { id: 2, is_active: true, role_id: 2 }
    if (Number(id) === 3) return { id: 3, is_active: true, role_id: 3 }
    if (Number(id) === 4) return { id: 4, is_active: true, role_id: 4 }
    return null
  }
}

function stubRolePermissions(overrides = {}) {
  const roles = {
    1: { id: 1, code: 'admin', permissions: ['*'] },
    2: { id: 2, code: 'user', permissions: ['survey:create', 'survey:edit', 'survey:view', 'answer:view'] },
    3: { id: 3, code: 'flow_operator', permissions: ['management_ai.flow.create'] },
    4: { id: 4, code: 'flow_editor', permissions: ['management_ai.flow.update'] },
    ...overrides
  }

  Role.findById = async id => roles[Number(id)] || null
  Role.findByCode = async code => Object.values(roles).find(item => item.code === String(code)) || null
}

function stubAiBoundaryAudit() {
  AuditLog.create = async payload => ({ id: 1, ...payload })
}

function stubExecutionLedger() {
  const rows = new Map()
  let nextId = 1
  const filterRows = ({ action, status, actor_id, created_from, created_to, batch_id, parent_execution_id, step_id, error_stage, error_class, retryable } = {}) => {
    return [...rows.values()]
      .filter(item => !action || String(item.action).includes(String(action)))
      .filter(item => !status || String(item.status) === String(status))
      .filter(item => actor_id == null || Number(item.actorId) === Number(actor_id))
      .filter(item => !created_from || String(item.createdAt || '') >= String(created_from))
      .filter(item => !created_to || String(item.createdAt || '') <= String(created_to))
      .filter(item => !batch_id || String(item.batchId || '') === String(batch_id))
      .filter(item => parent_execution_id == null || Number(item.parentExecutionId) === Number(parent_execution_id))
      .filter(item => !step_id || String(item.stepId || '') === String(step_id))
      .filter(item => !error_stage || String(item.errorStage || '') === String(error_stage))
      .filter(item => !error_class || String(item.errorClass || '') === String(error_class))
      .filter(item => retryable === undefined || Boolean(item.retryable) === Boolean(retryable))
  }

  ManagementAiExecution.list = async ({ page = 1, pageSize = 20, action, status, actor_id, created_from, created_to, batch_id, parent_execution_id, step_id, error_stage, error_class, retryable } = {}) => {
    const filtered = filterRows({ action, status, actor_id, created_from, created_to, batch_id, parent_execution_id, step_id, error_stage, error_class, retryable })
    const list = filtered
      .sort((a, b) => Number(b.id) - Number(a.id))
      .slice((page - 1) * pageSize, page * pageSize)
    return {
      total: filtered.length,
      list
    }
  }
  ManagementAiExecution.listAll = async query => filterRows(query).sort((a, b) => Number(b.id) - Number(a.id))
  ManagementAiExecution.findByActorAndKey = async (actorId, idempotencyKey) => {
    return rows.get(`${actorId}:${idempotencyKey}`) || null
  }
  ManagementAiExecution.create = async payload => {
    const key = `${payload.actor_id}:${payload.idempotency_key}`
    if (rows.has(key)) {
      throw new Error('duplicate execution key')
    }
    const row = {
      id: nextId++,
      actorId: Number(payload.actor_id),
      idempotencyKey: String(payload.idempotency_key),
      batchId: payload.batch_id ?? null,
      parentExecutionId: payload.parent_execution_id == null ? null : Number(payload.parent_execution_id),
      stepId: payload.step_id ?? null,
      stepIndex: payload.step_index == null ? null : Number(payload.step_index),
      action: String(payload.action),
      requestHash: String(payload.request_hash),
      status: String(payload.status || 'pending'),
      requestPayload: payload.request_payload ?? null,
      responsePayload: payload.response_payload ?? null,
      errorCode: payload.error_code ?? null,
      errorStage: payload.error_stage ?? null,
      errorClass: payload.error_class ?? null,
      retryable: payload.retryable ?? null,
      failedStepId: payload.failed_step_id ?? null,
      failedAction: payload.failed_action ?? null,
      errorMessage: payload.error_message ?? null,
      createdAt: payload.created_at ?? '2026-03-31T00:00:00.000Z',
      updatedAt: payload.updated_at ?? '2026-03-31T00:00:00.000Z'
    }
    rows.set(key, row)
    return row
  }
  ManagementAiExecution.update = async (id, fields) => {
    const row = [...rows.values()].find(item => Number(item.id) === Number(id))
    if (!row) return null
    Object.assign(row, {
      status: fields.status ?? row.status,
      responsePayload: Object.prototype.hasOwnProperty.call(fields, 'response_payload') ? fields.response_payload : row.responsePayload,
      errorCode: Object.prototype.hasOwnProperty.call(fields, 'error_code') ? fields.error_code : row.errorCode,
      errorStage: Object.prototype.hasOwnProperty.call(fields, 'error_stage') ? fields.error_stage : row.errorStage,
      errorClass: Object.prototype.hasOwnProperty.call(fields, 'error_class') ? fields.error_class : row.errorClass,
      retryable: Object.prototype.hasOwnProperty.call(fields, 'retryable') ? fields.retryable : row.retryable,
      failedStepId: Object.prototype.hasOwnProperty.call(fields, 'failed_step_id') ? fields.failed_step_id : row.failedStepId,
      failedAction: Object.prototype.hasOwnProperty.call(fields, 'failed_action') ? fields.failed_action : row.failedAction,
      errorMessage: Object.prototype.hasOwnProperty.call(fields, 'error_message') ? fields.error_message : row.errorMessage
    })
    return row
  }
}

test('GET /api/management-ai/protocol returns the action-level permission protocol', async () => {
  stubAuthenticatedUsers()
  stubRolePermissions()
  const { response, json } = await request('/management-ai/protocol')

  assert.equal(response.status, 200)
  assert.equal(json.success, true)
  assert.equal(json.data.kind, 'management.action.protocol')
  assert.equal(json.data.adminOnly, false)
  assert.ok(Array.isArray(json.data.actions))
  assert.equal(json.data.batch.kind, 'management.batch')
  assert.ok(json.data.actions.some(item => item.action === 'flow.create'))
  assert.deepEqual(
    json.data.actions.find(item => item.action === 'flow.create')?.requiredPermissions,
    ['management_ai.flow.create']
  )
  assert.equal(json.data.boundaries.auth, 'authenticated-role-with-action-permissions')
})

test('GET /api/management-ai/protocol rejects actors without management action permissions', async () => {
  stubAuthenticatedUsers()
  stubRolePermissions()
  const { response, json } = await requestPublic('/management-ai/protocol', {
    headers: { Authorization: `Bearer ${createToken()}` }
  })

  assert.equal(response.status, 403)
  assert.equal(json.success, false)
  assert.equal(json.error.code, 'MGMT_ACCESS_FORBIDDEN')
})

test('GET /api/management-ai/protocol allows actors with at least one action permission', async () => {
  stubAuthenticatedUsers()
  stubRolePermissions()

  const { response, json } = await requestPublic('/management-ai/protocol', {
    headers: { Authorization: `Bearer ${createToken({ sub: 3, roleCode: 'flow_operator' })}` }
  })

  assert.equal(response.status, 200)
  assert.equal(json.success, true)
  assert.ok(json.data.actions.some(item => item.action === 'flow.create'))
})

test('GET /api/management-ai/executions returns paginated execution ledger for admins', async () => {
  stubAuthenticatedUsers()
  stubRolePermissions()
  stubExecutionLedger()

  await ManagementAiExecution.create({
    actor_id: 1,
    idempotency_key: 'ledger-001',
    action: 'flow.create',
    request_hash: 'hash-1',
    status: 'completed',
    request_payload: { action: 'flow.create' },
    response_payload: { id: 11, name: 'Security review' }
  })

  const { response, json } = await request('/management-ai/executions?page=1&pageSize=5&action=flow')

  assert.equal(response.status, 200)
  assert.equal(json.success, true)
  assert.equal(json.data.total, 1)
  assert.equal(json.data.list[0].idempotencyKey, 'ledger-001')
  assert.equal(json.data.list[0].status, 'completed')
})

test('GET /api/management-ai/executions filters by actor and created time range', async () => {
  stubAuthenticatedUsers()
  stubRolePermissions()
  stubExecutionLedger()

  await ManagementAiExecution.create({
    actor_id: 1,
    idempotency_key: 'ledger-actor-1',
    action: 'flow.create',
    request_hash: 'hash-a',
    status: 'completed',
    request_payload: { action: 'flow.create' },
    response_payload: { id: 21 },
    created_at: '2026-03-31T08:00:00.000Z'
  })
  await ManagementAiExecution.create({
    actor_id: 2,
    idempotency_key: 'ledger-actor-2',
    action: 'flow.update',
    request_hash: 'hash-b',
    status: 'failed',
    request_payload: { action: 'flow.update' },
    response_payload: null,
    created_at: '2026-03-29T08:00:00.000Z'
  })

  const { response, json } = await request('/management-ai/executions?actor_id=1&created_from=2026-03-31T00:00:00.000Z&created_to=2026-03-31T23:59:59.000Z')

  assert.equal(response.status, 200)
  assert.equal(json.success, true)
  assert.equal(json.data.total, 1)
  assert.equal(json.data.list[0].actorId, 1)
  assert.equal(json.data.list[0].idempotencyKey, 'ledger-actor-1')
})

test('GET /api/management-ai/executions filters by batch, parent execution, and step id', async () => {
  stubAuthenticatedUsers()
  stubRolePermissions()
  stubExecutionLedger()

  await ManagementAiExecution.create({
    actor_id: 1,
    idempotency_key: 'batch-parent-001',
    batch_id: 'batch-ledger-001',
    action: 'management.batch',
    request_hash: 'hash-parent',
    status: 'completed',
    request_payload: { kind: 'management.batch' },
    response_payload: { counts: { total: 2 } }
  })
  await ManagementAiExecution.create({
    actor_id: 1,
    idempotency_key: 'batch-child-001',
    batch_id: 'batch-ledger-001',
    parent_execution_id: 1,
    step_id: 'step-1',
    step_index: 1,
    action: 'flow.create',
    request_hash: 'hash-child-1',
    status: 'completed',
    request_payload: { action: 'flow.create' },
    response_payload: { id: 51 }
  })
  await ManagementAiExecution.create({
    actor_id: 1,
    idempotency_key: 'batch-child-002',
    batch_id: 'batch-ledger-001',
    parent_execution_id: 1,
    step_id: 'step-2',
    step_index: 2,
    action: 'flow.update',
    request_hash: 'hash-child-2',
    status: 'failed',
    request_payload: { action: 'flow.update' },
    response_payload: null
  })

  const { response, json } = await request('/management-ai/executions?batch_id=batch-ledger-001&parent_execution_id=1&step_id=step-2')

  assert.equal(response.status, 200)
  assert.equal(json.success, true)
  assert.equal(json.data.total, 1)
  assert.equal(json.data.list[0].batchId, 'batch-ledger-001')
  assert.equal(json.data.list[0].parentExecutionId, 1)
  assert.equal(json.data.list[0].stepId, 'step-2')
})

test('GET /api/management-ai/executions filters by error stage, class, and retryable', async () => {
  stubAuthenticatedUsers()
  stubRolePermissions()
  stubExecutionLedger()

  await ManagementAiExecution.create({
    actor_id: 1,
    idempotency_key: 'ledger-error-1',
    action: 'flow.update',
    request_hash: 'hash-error-1',
    status: 'failed',
    error_code: 'FLOW_FAIL',
    error_stage: 'system',
    error_class: 'service_exception',
    retryable: true,
    error_message: 'temporary downstream failure'
  })
  await ManagementAiExecution.create({
    actor_id: 1,
    idempotency_key: 'ledger-error-2',
    action: 'flow.update',
    request_hash: 'hash-error-2',
    status: 'failed',
    error_code: 'MGMT_INVALID_PAYLOAD',
    error_stage: 'validation',
    error_class: 'user_fixable',
    retryable: false,
    error_message: 'invalid input'
  })

  const { response, json } = await request('/management-ai/executions?status=failed&error_stage=system&error_class=service_exception&retryable=true')

  assert.equal(response.status, 200)
  assert.equal(json.success, true)
  assert.equal(json.data.total, 1)
  assert.equal(json.data.list[0].idempotencyKey, 'ledger-error-1')
  assert.equal(json.data.list[0].errorStage, 'system')
  assert.equal(json.data.list[0].errorClass, 'service_exception')
  assert.equal(json.data.list[0].retryable, true)
})

test('GET /api/management-ai/executions/export downloads the filtered ledger as JSON', async () => {
  stubAuthenticatedUsers()
  stubRolePermissions()
  stubExecutionLedger()

  await ManagementAiExecution.create({
    actor_id: 1,
    idempotency_key: 'ledger-export-json',
    action: 'flow.create',
    request_hash: 'hash-json',
    status: 'completed',
    request_payload: { action: 'flow.create', input: { name: 'Export flow' } },
    response_payload: { id: 31, name: 'Export flow' },
    created_at: '2026-03-31T08:00:00.000Z'
  })

  const { response, buffer } = await requestRaw('/management-ai/executions/export?format=json&action=flow.create')
  const body = JSON.parse(buffer.toString('utf8'))

  assert.equal(response.status, 200)
  assert.equal(response.headers.get('content-type'), 'application/json; charset=utf-8')
  assert.match(String(response.headers.get('content-disposition')), /management-ai-executions-.*\.json/)
  assert.equal(body.total, 1)
  assert.equal(body.filters.action, 'flow.create')
  assert.equal(body.list[0].idempotencyKey, 'ledger-export-json')
})

test('GET /api/management-ai/executions/export downloads the filtered ledger as CSV', async () => {
  stubAuthenticatedUsers()
  stubRolePermissions()
  stubExecutionLedger()

  await ManagementAiExecution.create({
    actor_id: 1,
    idempotency_key: 'ledger-export-csv',
    action: 'flow.update',
    request_hash: 'hash-csv',
    status: 'failed',
    request_payload: { action: 'flow.update', changes: { status: 'disabled' } },
    response_payload: null,
    error_code: 'FLOW_FAIL',
    error_message: 'flow update failed',
    created_at: '2026-03-31T10:00:00.000Z'
  })

  const { response, buffer } = await requestRaw('/management-ai/executions/export?format=csv&status=failed')
  const body = buffer.toString('utf8')

  assert.equal(response.status, 200)
  assert.equal(response.headers.get('content-type'), 'text/csv; charset=utf-8')
  assert.match(String(response.headers.get('content-disposition')), /management-ai-executions-.*\.csv/)
  assert.match(body, /id,actorId,batchId,parentExecutionId,stepId,stepIndex,action,status,idempotencyKey/)
  assert.match(body, /ledger-export-csv/)
  assert.match(body, /FLOW_FAIL/)
})

test('GET /api/management-ai/executions/export rejects unsupported export formats', async () => {
  stubAuthenticatedUsers()
  stubRolePermissions()

  const { response, json } = await request('/management-ai/executions/export?format=xlsx')

  assert.equal(response.status, 400)
  assert.equal(json.success, false)
  assert.equal(json.error.code, 'MGMT_INVALID_PAYLOAD')
  assert.match(json.error.message, /format must be json or csv/i)
})

test('POST /api/management-ai/actions supports dry-run validation', async () => {
  stubAuthenticatedUsers()
  stubRolePermissions()
  stubAiBoundaryAudit()
  const { response, json } = await request('/management-ai/actions', {
    method: 'POST',
    body: {
      kind: 'management.action',
      version: '2026-03-31',
      action: 'flow.create',
      dryRun: true,
      input: {
        name: 'Security review',
        status: 'active',
        description: '2-step'
      },
      reason: 'Validate AI-generated management JSON'
    }
  })

  assert.equal(response.status, 200)
  assert.equal(json.success, true)
  assert.equal(json.data.dryRun, true)
  assert.equal(json.data.executed, false)
  assert.equal(json.data.normalized.action, 'flow.create')
})

test('POST /api/management-ai/actions supports serial batch dry-run validation', async () => {
  stubAuthenticatedUsers()
  stubRolePermissions()
  stubAiBoundaryAudit()

  const { response, json } = await request('/management-ai/actions', {
    method: 'POST',
    body: {
      kind: 'management.batch',
      version: '2026-03-31',
      batchId: 'batch-dryrun-001',
      dryRun: true,
      mode: 'serial',
      actions: [
        {
          stepId: 'step-1',
          action: {
            kind: 'management.action',
            version: '2026-03-31',
            action: 'flow.create',
            input: {
              name: 'Batch flow A',
              status: 'active'
            }
          }
        },
        {
          stepId: 'step-2',
          action: {
            kind: 'management.action',
            version: '2026-03-31',
            action: 'flow.create',
            input: {
              name: 'Batch flow B',
              status: 'draft'
            }
          }
        }
      ]
    }
  })

  assert.equal(response.status, 200)
  assert.equal(json.success, true)
  assert.equal(json.data.kind, 'management.batch')
  assert.equal(json.data.dryRun, true)
  assert.equal(json.data.executed, false)
  assert.equal(json.data.normalized.actions.length, 2)
  assert.equal(json.data.result.counts.total, 2)
  assert.equal(json.data.result.steps[0].status, 'validated')
})

test('POST /api/management-ai/actions executes supported management actions through existing services', async () => {
  stubAuthenticatedUsers()
  stubRolePermissions()
  stubExecutionLedger()
  const auditActions = []
  let messagePayload = null

  Flow.create = async payload => ({
    id: 11,
    ...payload,
    created_at: '2026-03-31T00:00:00.000Z',
    updated_at: '2026-03-31T00:00:00.000Z'
  })
  AuditLog.create = async payload => {
    auditActions.push(payload.action)
    return { id: 1 }
  }
  Message.create = async payload => {
    messagePayload = payload
    return { id: 2 }
  }

  const { response, json } = await request('/management-ai/actions', {
    method: 'POST',
    body: {
      kind: 'management.action',
      version: '2026-03-31',
      action: 'flow.create',
      idempotencyKey: 'flow-create-001',
      input: {
        name: 'Security review',
        status: 'active',
        description: '2-step'
      },
      reason: 'Create a new admin flow'
    }
  })

  assert.equal(response.status, 200)
  assert.equal(json.success, true)
  assert.equal(json.data.executed, true)
  assert.equal(json.data.idempotencyKey, 'flow-create-001')
  assert.equal(json.data.result.name, 'Security review')
  assert.ok(auditActions.includes('flow.create'))
  assert.ok(auditActions.includes('management_ai.execute'))
  assert.equal(messagePayload.title, 'Flow created')
})

test('POST /api/management-ai/actions executes serial batches and writes parent-child execution rows', async () => {
  stubAuthenticatedUsers()
  stubRolePermissions()
  stubExecutionLedger()
  const createdNames = []

  Flow.create = async payload => {
    createdNames.push(payload.name)
    return {
      id: createdNames.length + 10,
      ...payload,
      created_at: '2026-03-31T00:00:00.000Z',
      updated_at: '2026-03-31T00:00:00.000Z'
    }
  }
  AuditLog.create = async payload => ({ id: 1, ...payload })
  Message.create = async payload => ({ id: createdNames.length, ...payload })

  const { response, json } = await request('/management-ai/actions', {
    method: 'POST',
    body: {
      kind: 'management.batch',
      version: '2026-03-31',
      batchId: 'batch-exec-001',
      idempotencyKey: 'batch-exec-001',
      mode: 'serial',
      actions: [
        {
          stepId: 'step-a',
          action: {
            kind: 'management.action',
            version: '2026-03-31',
            action: 'flow.create',
            input: { name: 'Batch Flow A', status: 'active' }
          }
        },
        {
          stepId: 'step-b',
          action: {
            kind: 'management.action',
            version: '2026-03-31',
            action: 'flow.create',
            input: { name: 'Batch Flow B', status: 'draft' }
          }
        }
      ]
    }
  })

  const rows = await ManagementAiExecution.listAll({ batch_id: 'batch-exec-001' })
  const parent = rows.find(item => item.action === 'management.batch')
  const children = rows.filter(item => item.parentExecutionId === parent?.id).sort((a, b) => Number(a.stepIndex) - Number(b.stepIndex))

  assert.equal(response.status, 200)
  assert.equal(json.success, true)
  assert.equal(json.data.kind, 'management.batch')
  assert.equal(json.data.executed, true)
  assert.equal(json.data.executionId, parent?.id)
  assert.deepEqual(createdNames, ['Batch Flow A', 'Batch Flow B'])
  assert.equal(rows.length, 3)
  assert.equal(parent?.status, 'completed')
  assert.equal(parent?.batchId, 'batch-exec-001')
  assert.equal(children.length, 2)
  assert.equal(children[0].stepId, 'step-a')
  assert.equal(children[1].stepId, 'step-b')
  assert.equal(children[0].status, 'completed')
  assert.equal(children[1].status, 'completed')
})

test('POST /api/management-ai/actions resolves later step targets from earlier step results', async () => {
  stubAuthenticatedUsers()
  stubRolePermissions()
  stubExecutionLedger()
  let updatedFlowId = null

  Flow.create = async payload => ({
    id: 91,
    ...payload,
    created_at: '2026-03-31T00:00:00.000Z',
    updated_at: '2026-03-31T00:00:00.000Z'
  })
  Flow.findById = async id => ({
    id: Number(id),
    name: 'Referenced flow',
    status: 'active',
    description: null
  })
  Flow.update = async (id, fields) => {
    updatedFlowId = Number(id)
    return {
      id: Number(id),
      name: 'Referenced flow',
      status: fields.status || 'disabled',
      description: fields.description ?? null,
      created_at: '2026-03-31T00:00:00.000Z',
      updated_at: '2026-03-31T00:00:00.000Z'
    }
  }
  AuditLog.create = async payload => ({ id: 1, ...payload })
  Message.create = async payload => ({ id: 2, ...payload })

  const { response, json } = await request('/management-ai/actions', {
    method: 'POST',
    body: {
      kind: 'management.batch',
      version: '2026-03-31',
      batchId: 'batch-ref-001',
      idempotencyKey: 'batch-ref-001',
      mode: 'serial',
      actions: [
        {
          stepId: 'step-1',
          action: {
            kind: 'management.action',
            version: '2026-03-31',
            action: 'flow.create',
            input: { name: 'Referenced flow', status: 'active' }
          }
        },
        {
          stepId: 'step-2',
          action: {
            kind: 'management.action',
            version: '2026-03-31',
            action: 'flow.update',
            target: {
              flowId: '$steps.step-1.result.id'
            },
            changes: {
              status: 'disabled'
            }
          }
        }
      ]
    }
  })

  const rows = await ManagementAiExecution.listAll({ batch_id: 'batch-ref-001', step_id: 'step-2' })

  assert.equal(response.status, 200)
  assert.equal(json.success, true)
  assert.equal(updatedFlowId, 91)
  assert.equal(rows.length, 1)
  assert.equal(rows[0].requestPayload?.target?.flowId, 91)
})

test('POST /api/management-ai/actions stops serial batches after the first failed step', async () => {
  stubAuthenticatedUsers()
  stubRolePermissions()
  stubExecutionLedger()
  let createCount = 0

  Flow.create = async payload => {
    createCount += 1
    if (createCount === 2) {
      const error = new Error('second batch step failed')
      error.code = 'FLOW_FAIL'
      throw error
    }
    return {
      id: createCount + 20,
      ...payload,
      created_at: '2026-03-31T00:00:00.000Z',
      updated_at: '2026-03-31T00:00:00.000Z'
    }
  }
  AuditLog.create = async payload => ({ id: 1, ...payload })
  Message.create = async payload => ({ id: createCount, ...payload })

  const { response, json } = await request('/management-ai/actions', {
    method: 'POST',
    body: {
      kind: 'management.batch',
      version: '2026-03-31',
      batchId: 'batch-fail-001',
      idempotencyKey: 'batch-fail-001',
      mode: 'serial',
      actions: [
        {
          stepId: 'step-1',
          action: {
            kind: 'management.action',
            version: '2026-03-31',
            action: 'flow.create',
            input: { name: 'Batch Flow 1', status: 'active' }
          }
        },
        {
          stepId: 'step-2',
          action: {
            kind: 'management.action',
            version: '2026-03-31',
            action: 'flow.create',
            input: { name: 'Batch Flow 2', status: 'active' }
          }
        },
        {
          stepId: 'step-3',
          action: {
            kind: 'management.action',
            version: '2026-03-31',
            action: 'flow.create',
            input: { name: 'Batch Flow 3', status: 'active' }
          }
        }
      ]
    }
  })

  const rows = await ManagementAiExecution.listAll({ batch_id: 'batch-fail-001' })
  const parent = rows.find(item => item.action === 'management.batch')
  const children = rows.filter(item => item.parentExecutionId === parent?.id).sort((a, b) => Number(a.stepIndex) - Number(b.stepIndex))

  assert.equal(response.status, 409)
  assert.equal(json.success, false)
  assert.equal(json.error.code, 'FLOW_FAIL')
  assert.equal(createCount, 2)
  assert.equal(rows.length, 3)
  assert.equal(parent?.status, 'failed')
  assert.equal(parent?.errorStage, 'system')
  assert.equal(parent?.errorClass, 'service_exception')
  assert.equal(parent?.retryable, true)
  assert.equal(parent?.failedStepId, 'step-2')
  assert.equal(parent?.failedAction, 'flow.create')
  assert.equal(parent?.responsePayload?.counts?.skipped, 1)
  assert.equal(children.length, 2)
  assert.equal(children[0].status, 'completed')
  assert.equal(children[1].status, 'failed')
  assert.equal(children[1].errorStage, 'system')
  assert.equal(children[1].errorClass, 'service_exception')
  assert.equal(children[1].retryable, true)
})

test('POST /api/management-ai/actions rejects forward step references in serial batches', async () => {
  stubAuthenticatedUsers()
  stubRolePermissions()

  const { response, json } = await request('/management-ai/actions', {
    method: 'POST',
    body: {
      kind: 'management.batch',
      version: '2026-03-31',
      batchId: 'batch-invalid-ref-001',
      dryRun: true,
      mode: 'serial',
      actions: [
        {
          stepId: 'step-1',
          action: {
            kind: 'management.action',
            version: '2026-03-31',
            action: 'flow.update',
            target: {
              flowId: '$steps.step-2.result.id'
            },
            changes: {
              status: 'disabled'
            }
          }
        },
        {
          stepId: 'step-2',
          action: {
            kind: 'management.action',
            version: '2026-03-31',
            action: 'flow.create',
            input: { name: 'Late flow', status: 'active' }
          }
        }
      ]
    }
  })

  assert.equal(response.status, 400)
  assert.equal(json.success, false)
  assert.equal(json.error.code, 'MGMT_INVALID_PAYLOAD')
  assert.match(json.error.message, /earlier steps/i)
})

test('POST /api/management-ai/actions replays completed requests with the same idempotencyKey', async () => {
  stubAuthenticatedUsers()
  stubRolePermissions()
  stubExecutionLedger()
  let createCount = 0

  Flow.create = async payload => {
    createCount += 1
    return {
      id: 21,
      ...payload,
      created_at: '2026-03-31T00:00:00.000Z',
      updated_at: '2026-03-31T00:00:00.000Z'
    }
  }
  AuditLog.create = async payload => ({ id: 1, ...payload })
  Message.create = async payload => ({ id: 2, ...payload })

  const payload = {
    kind: 'management.action',
    version: '2026-03-31',
    action: 'flow.create',
    idempotencyKey: 'flow-create-002',
    input: {
      name: 'Risk review',
      status: 'draft'
    }
  }

  const first = await request('/management-ai/actions', {
    method: 'POST',
    body: payload
  })
  const second = await request('/management-ai/actions', {
    method: 'POST',
    body: payload
  })

  assert.equal(first.response.status, 200)
  assert.equal(second.response.status, 200)
  assert.equal(createCount, 1)
  assert.equal(second.json.data.replayed, true)
  assert.equal(second.json.data.result.name, 'Risk review')
})

test('POST /api/management-ai/actions rejects execute requests without idempotencyKey', async () => {
  stubAuthenticatedUsers()
  stubRolePermissions()
  const { response, json } = await request('/management-ai/actions', {
    method: 'POST',
    body: {
      kind: 'management.action',
      version: '2026-03-31',
      action: 'flow.create',
      input: { name: 'No key flow', status: 'draft' }
    }
  })

  assert.equal(response.status, 400)
  assert.equal(json.success, false)
  assert.equal(json.error.code, 'MGMT_AI_IDEMPOTENCY_REQUIRED')
  assert.match(json.error.message, /idempotencyKey/i)
})

test('POST /api/management-ai/actions rejects reusing idempotencyKey with a different payload', async () => {
  stubAuthenticatedUsers()
  stubRolePermissions()
  stubExecutionLedger()
  stubAiBoundaryAudit()

  await ManagementAiExecution.create({
    actor_id: 1,
    idempotency_key: 'conflict-001',
    action: 'flow.create',
    request_hash: 'hash-original',
    status: 'completed',
    request_payload: { action: 'flow.create' },
    response_payload: { id: 11 }
  })

  const { response, json } = await request('/management-ai/actions', {
    method: 'POST',
    body: {
      kind: 'management.action',
      version: '2026-03-31',
      action: 'flow.create',
      idempotencyKey: 'conflict-001',
      input: { name: 'Different flow', status: 'draft' }
    }
  })

  assert.equal(response.status, 409)
  assert.equal(json.success, false)
  assert.equal(json.error.code, 'MGMT_AI_IDEMPOTENCY_CONFLICT')
})

test('POST /api/management-ai/actions rejects unsupported actions', async () => {
  stubAuthenticatedUsers()
  stubRolePermissions()
  const { response, json } = await request('/management-ai/actions', {
    method: 'POST',
    body: {
      kind: 'management.action',
      version: '2026-03-31',
      action: 'survey.force_delete',
      target: { surveyId: 9 }
    }
  })

  assert.equal(response.status, 400)
  assert.equal(json.success, false)
  assert.equal(json.error.code, 'MGMT_INVALID_PAYLOAD')
})

test('POST /api/management-ai/actions rejects actors without the required action permission', async () => {
  stubAuthenticatedUsers()
  stubRolePermissions()

  const { response, json } = await requestPublic('/management-ai/actions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${createToken()}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      kind: 'management.action',
      version: '2026-03-31',
      action: 'flow.create',
      dryRun: true,
      input: {
        name: 'Denied flow',
        status: 'active'
      }
    })
  })

  assert.equal(response.status, 403)
  assert.equal(json.success, false)
  assert.equal(json.error.code, 'MGMT_ACCESS_FORBIDDEN')
  assert.match(json.error.message, /management_ai\.flow\.create/)
})

test('POST /api/management-ai/actions allows actors with the required action permission', async () => {
  stubAuthenticatedUsers()
  stubRolePermissions()
  stubExecutionLedger()
  const auditActions = []
  let messagePayload = null

  Flow.create = async payload => ({
    id: 41,
    ...payload,
    created_at: '2026-03-31T00:00:00.000Z',
    updated_at: '2026-03-31T00:00:00.000Z'
  })
  AuditLog.create = async payload => {
    auditActions.push(payload.action)
    return { id: 1, ...payload }
  }
  Message.create = async payload => {
    messagePayload = payload
    return { id: 2, ...payload }
  }

  const { response, json } = await requestPublic('/management-ai/actions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${createToken({ sub: 3, roleCode: 'flow_operator' })}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      kind: 'management.action',
      version: '2026-03-31',
      action: 'flow.create',
      idempotencyKey: 'flow-create-scope-001',
      input: {
        name: 'Scoped flow',
        status: 'active'
      }
    })
  })

  assert.equal(response.status, 200)
  assert.equal(json.success, true)
  assert.equal(json.data.executed, true)
  assert.equal(json.data.result.name, 'Scoped flow')
  assert.ok(auditActions.includes('flow.create'))
  assert.equal(messagePayload.title, 'Flow created')
})

test('GET /api/repos allows authenticated non-admin actors for question bank access', async () => {
  let listOptions = null
  QuestionBankRepo.list = async options => {
    listOptions = options
    return [{ id: 1, name: 'Repo 1' }]
  }

  const { response, json } = await requestPublic('/repos', {
    headers: { Authorization: `Bearer ${createToken()}` }
  })

  assert.equal(response.status, 200)
  assert.equal(json.success, true)
  assert.equal(json.data[0].name, 'Repo 1')
  assert.equal(listOptions.creator_id, 2)
})
