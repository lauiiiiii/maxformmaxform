import { throwManagementError, throwManagementPolicyError } from '../http/managementErrors.js'
import { getAdminPolicy } from '../policies/adminPolicy.js'
import flowRepository from '../repositories/flowRepository.js'
import { createFlowDto, MANAGEMENT_ERROR_CODES } from '../../../shared/management.contract.js'

const FLOW_STATUSES = new Set(['draft', 'active', 'disabled'])

function ensureAdmin(actor) {
  throwManagementPolicyError(getAdminPolicy(actor))
}

function normalizeFlowName(name, { required = false } = {}) {
  if (name === undefined) {
    if (required) {
      throwManagementError(400, MANAGEMENT_ERROR_CODES.FLOW_NAME_REQUIRED, 'Flow name is required')
    }
    return undefined
  }

  const normalized = String(name || '').trim()
  if (!normalized) {
    throwManagementError(400, MANAGEMENT_ERROR_CODES.FLOW_NAME_REQUIRED, 'Flow name is required')
  }

  return normalized
}

function normalizeFlowStatus(status, { required = false, defaultValue } = {}) {
  if (status === undefined) {
    if (defaultValue !== undefined) return defaultValue
    if (required) {
      throwManagementError(400, MANAGEMENT_ERROR_CODES.FLOW_STATUS_REQUIRED, 'Flow status is required')
    }
    return undefined
  }

  const normalized = String(status || '').trim()
  if (!FLOW_STATUSES.has(normalized)) {
    throwManagementError(400, MANAGEMENT_ERROR_CODES.FLOW_STATUS_INVALID, 'Flow status is invalid')
  }

  return normalized
}

function normalizeFlowDescription(description) {
  if (description === undefined) return undefined
  return description == null ? null : (String(description).trim() || null)
}

async function getManagedFlowOrThrow(flowId) {
  const flow = await flowRepository.findById(flowId)
  if (!flow) {
    throwManagementError(404, MANAGEMENT_ERROR_CODES.FLOW_NOT_FOUND, 'Flow not found')
  }
  return flow
}

export async function listManagedFlows({ actor }) {
  ensureAdmin(actor)
  const flows = await flowRepository.list()
  return flows.map(item => createFlowDto(item))
}

export async function createManagedFlow({ actor, body = {} }) {
  ensureAdmin(actor)

  const flow = await flowRepository.create({
    name: normalizeFlowName(body.name, { required: true }),
    status: normalizeFlowStatus(body.status, { defaultValue: 'draft' }),
    description: normalizeFlowDescription(body.description)
  })

  return createFlowDto(flow)
}

export async function updateManagedFlow({ actor, flowId, body = {} }) {
  ensureAdmin(actor)
  await getManagedFlowOrThrow(flowId)

  const flow = await flowRepository.update(flowId, {
    name: normalizeFlowName(body.name),
    status: normalizeFlowStatus(body.status),
    description: normalizeFlowDescription(body.description)
  })

  return createFlowDto(flow)
}

export async function deleteManagedFlow({ actor, flowId }) {
  ensureAdmin(actor)
  await getManagedFlowOrThrow(flowId)
  await flowRepository.delete(flowId)
}
