import { throwManagementError, throwManagementPolicyError } from '../http/managementErrors.js'
import { getAdminPolicy } from '../policies/adminPolicy.js'
import roleRepository from '../repositories/roleRepository.js'
import { createRoleDto, MANAGEMENT_ERROR_CODES } from '../../../shared/management.contract.js'

function ensureAdmin(actor) {
  throwManagementPolicyError(getAdminPolicy(actor))
}

export async function listManagedRoles({ actor }) {
  ensureAdmin(actor)
  const roles = await roleRepository.list()
  return roles.map(item => createRoleDto(item))
}

export async function createManagedRole({ actor, body = {} }) {
  ensureAdmin(actor)

  const { name, code, permissions, remark } = body
  if (!name || !code) {
    throwManagementError(400, MANAGEMENT_ERROR_CODES.ROLE_REQUIRED_FIELDS, 'Role name and code are required')
  }

  const existing = await roleRepository.findByCode(code)
  if (existing) {
    throwManagementError(409, MANAGEMENT_ERROR_CODES.ROLE_EXISTS, 'Role code already exists')
  }

  const role = await roleRepository.create({ name, code, permissions, remark })
  return createRoleDto(role)
}

export async function updateManagedRole({ actor, roleId, body = {} }) {
  ensureAdmin(actor)

  const role = await roleRepository.update(roleId, {
    name: body.name,
    permissions: body.permissions,
    remark: body.remark
  })

  if (!role) {
    throwManagementError(404, MANAGEMENT_ERROR_CODES.ROLE_NOT_FOUND, 'Role not found')
  }

  return createRoleDto(role)
}

export async function deleteManagedRole({ actor, roleId }) {
  ensureAdmin(actor)
  await roleRepository.delete(roleId)
}
