import { throwManagementError, throwManagementPolicyError } from '../http/managementErrors.js'
import { getAdminPolicy } from '../policies/adminPolicy.js'
import { getAuthenticatedActorPolicy } from '../policies/actorPolicy.js'
import positionRepository from '../repositories/positionRepository.js'
import { createPositionDto, MANAGEMENT_ERROR_CODES } from '../../../shared/management.contract.js'

function ensureAdmin(actor) {
  throwManagementPolicyError(getAdminPolicy(actor))
}

function ensureAuthenticated(actor) {
  throwManagementPolicyError(getAuthenticatedActorPolicy(actor))
}

export async function listManagedPositions({ actor }) {
  ensureAuthenticated(actor)
  const positions = await positionRepository.list()
  return positions.map(item => createPositionDto(item))
}

export async function createManagedPosition({ actor, body = {} }) {
  ensureAdmin(actor)

  const normalizedName = String(body.name || '').trim()
  const normalizedCode = String(body.code || '').trim() || null

  if (!normalizedName) {
    throwManagementError(400, MANAGEMENT_ERROR_CODES.POSITION_NAME_REQUIRED, 'Position name is required')
  }

  if (normalizedCode) {
    const existing = await positionRepository.findByCode(normalizedCode)
    if (existing) {
      throwManagementError(409, MANAGEMENT_ERROR_CODES.POSITION_EXISTS, 'Position code already exists')
    }
  }

  const position = await positionRepository.create({
    name: normalizedName,
    code: normalizedCode,
    is_virtual: Boolean(body.is_virtual ?? body.isVirtual),
    remark: body.remark == null ? null : String(body.remark)
  })
  return createPositionDto(position)
}

export async function updateManagedPosition({ actor, positionId, body = {} }) {
  ensureAdmin(actor)

  const existing = await positionRepository.findById(positionId)
  if (!existing) {
    throwManagementError(404, MANAGEMENT_ERROR_CODES.POSITION_NOT_FOUND, 'Position not found')
  }

  const normalizedCode = body.code === undefined ? undefined : (String(body.code || '').trim() || null)
  if (normalizedCode) {
    const duplicate = await positionRepository.findByCode(normalizedCode)
    if (duplicate && Number(duplicate.id) !== Number(existing.id)) {
      throwManagementError(409, MANAGEMENT_ERROR_CODES.POSITION_EXISTS, 'Position code already exists')
    }
  }

  const position = await positionRepository.update(positionId, {
    name: body.name === undefined ? undefined : String(body.name || '').trim(),
    code: normalizedCode,
    is_virtual: body.is_virtual === undefined && body.isVirtual === undefined
      ? undefined
      : Boolean(body.is_virtual ?? body.isVirtual),
    remark: body.remark === undefined ? undefined : (body.remark == null ? null : String(body.remark))
  })
  return createPositionDto(position)
}

export async function deleteManagedPosition({ actor, positionId }) {
  ensureAdmin(actor)

  const existing = await positionRepository.findById(positionId)
  if (!existing) {
    throwManagementError(404, MANAGEMENT_ERROR_CODES.POSITION_NOT_FOUND, 'Position not found')
  }

  await positionRepository.delete(positionId)
}
