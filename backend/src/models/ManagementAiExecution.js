import knex from '../db/knex.js'

const TABLE = 'management_ai_executions'

function getDb(options = {}) {
  return options.db || knex
}

function applyListFilters(query, filters = {}) {
  const { action, status, actor_id, created_from, created_to, batch_id, parent_execution_id, step_id, error_stage, error_class, retryable } = filters

  if (action) query.where('action', 'like', `%${action}%`)
  if (status) query.where('status', status)
  if (actor_id != null) query.where('actor_id', Number(actor_id))
  if (created_from) query.where('created_at', '>=', created_from)
  if (created_to) query.where('created_at', '<=', created_to)
  if (batch_id) query.where('batch_id', String(batch_id))
  if (parent_execution_id != null) query.where('parent_execution_id', Number(parent_execution_id))
  if (step_id) query.where('step_id', String(step_id))
  if (error_stage) query.where('error_stage', String(error_stage))
  if (error_class) query.where('error_class', String(error_class))
  if (retryable !== undefined) query.where('retryable', retryable ? 1 : 0)

  return query
}

function toDto(row) {
  if (!row) return null

  function parseJson(value) {
    if (value == null) return null
    if (typeof value === 'string') {
      try {
        return JSON.parse(value)
      } catch {
        return null
      }
    }
    return value
  }

  return {
    id: row.id,
    actorId: Number(row.actor_id),
    idempotencyKey: row.idempotency_key,
    batchId: row.batch_id ?? null,
    parentExecutionId: row.parent_execution_id == null ? null : Number(row.parent_execution_id),
    stepId: row.step_id ?? null,
    stepIndex: row.step_index == null ? null : Number(row.step_index),
    action: row.action,
    requestHash: row.request_hash,
    status: row.status,
    requestPayload: parseJson(row.request_payload),
    responsePayload: parseJson(row.response_payload),
    errorCode: row.error_code ?? null,
    errorStage: row.error_stage ?? null,
    errorClass: row.error_class ?? null,
    retryable: row.retryable == null ? null : Boolean(row.retryable),
    failedStepId: row.failed_step_id ?? null,
    failedAction: row.failed_action ?? null,
    errorMessage: row.error_message ?? null,
    createdAt: row.created_at ?? null,
    updatedAt: row.updated_at ?? null
  }
}

const ManagementAiExecution = {
  async findByActorAndKey(actorId, idempotencyKey, options = {}) {
    const db = getDb(options)
    const row = await db(TABLE)
      .where({
        actor_id: Number(actorId),
        idempotency_key: String(idempotencyKey)
      })
      .first()
    return toDto(row)
  },

  async create(payload, options = {}) {
    const db = getDb(options)
    const [id] = await db(TABLE).insert({
      actor_id: Number(payload.actor_id),
      idempotency_key: String(payload.idempotency_key),
      batch_id: payload.batch_id ?? null,
      parent_execution_id: payload.parent_execution_id ?? null,
      step_id: payload.step_id ?? null,
      step_index: payload.step_index ?? null,
      action: String(payload.action),
      request_hash: String(payload.request_hash),
      status: String(payload.status || 'pending'),
      request_payload: payload.request_payload ?? null,
      response_payload: payload.response_payload ?? null,
      error_code: payload.error_code ?? null,
      error_stage: payload.error_stage ?? null,
      error_class: payload.error_class ?? null,
      retryable: payload.retryable ?? null,
      failed_step_id: payload.failed_step_id ?? null,
      failed_action: payload.failed_action ?? null,
      error_message: payload.error_message ?? null,
      updated_at: db.fn.now()
    })
    return db(TABLE).where('id', id).first().then(toDto)
  },

  async update(id, fields = {}, options = {}) {
    const db = getDb(options)
    const patch = {
      updated_at: db.fn.now()
    }

    if (fields.status !== undefined) patch.status = String(fields.status)
    if (Object.prototype.hasOwnProperty.call(fields, 'response_payload')) patch.response_payload = fields.response_payload ?? null
    if (Object.prototype.hasOwnProperty.call(fields, 'error_code')) patch.error_code = fields.error_code ?? null
    if (Object.prototype.hasOwnProperty.call(fields, 'error_stage')) patch.error_stage = fields.error_stage ?? null
    if (Object.prototype.hasOwnProperty.call(fields, 'error_class')) patch.error_class = fields.error_class ?? null
    if (Object.prototype.hasOwnProperty.call(fields, 'retryable')) patch.retryable = fields.retryable ?? null
    if (Object.prototype.hasOwnProperty.call(fields, 'failed_step_id')) patch.failed_step_id = fields.failed_step_id ?? null
    if (Object.prototype.hasOwnProperty.call(fields, 'failed_action')) patch.failed_action = fields.failed_action ?? null
    if (Object.prototype.hasOwnProperty.call(fields, 'error_message')) patch.error_message = fields.error_message ?? null

    await db(TABLE).where('id', Number(id)).update(patch)
    return db(TABLE).where('id', Number(id)).first().then(toDto)
  },

  async list({ page = 1, pageSize = 20, action, status, actor_id, created_from, created_to, batch_id, parent_execution_id, step_id, error_stage, error_class, retryable } = {}, options = {}) {
    const db = getDb(options)
    const query = applyListFilters(db(TABLE), { action, status, actor_id, created_from, created_to, batch_id, parent_execution_id, step_id, error_stage, error_class, retryable })

    const total = await query.clone().count('* as cnt').first().then(row => Number(row?.cnt || 0))
    const rows = await query
      .orderBy('id', 'desc')
      .limit(pageSize)
      .offset((page - 1) * pageSize)

    return {
      total,
      list: rows.map(toDto)
    }
  },

  async listAll({ action, status, actor_id, created_from, created_to, batch_id, parent_execution_id, step_id, error_stage, error_class, retryable } = {}, options = {}) {
    const db = getDb(options)
    const rows = await applyListFilters(db(TABLE), { action, status, actor_id, created_from, created_to, batch_id, parent_execution_id, step_id, error_stage, error_class, retryable })
      .orderBy('id', 'desc')

    return rows.map(toDto)
  }
}

export default ManagementAiExecution
