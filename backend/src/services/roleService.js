import { throwManagementError, throwManagementPolicyError } from '../http/managementErrors.js'
import { getAdminPolicy } from '../policies/adminPolicy.js'
import roleRepository from '../repositories/roleRepository.js'
import { recordManagementAction, runManagementTransaction } from './activity.js'
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

  return runManagementTransaction(async db => {
    const { name, code, permissions, remark } = body
    if (!name || !code) {
      throwManagementError(400, MANAGEMENT_ERROR_CODES.ROLE_REQUIRED_FIELDS, 'Role name and code are required')
    }

    const existing = await roleRepository.findByCode(code, { db })
    if (existing) {
      throwManagementError(409, MANAGEMENT_ERROR_CODES.ROLE_EXISTS, 'Role code already exists')
    }

    const role = await roleRepository.create({ name, code, permissions, remark }, { db })
    await recordManagementAction({
      actor,
      audit: {
        action: 'role.create',
        targetType: 'role',
        targetId: role.id,
        detail: `Created role ${role.name}`
      },
      message: {
        recipientId: actor.sub,
        title: 'Role created',
        content: `Role "${role.name}" was created.`,
        entityType: 'role',
        entityId: role.id
      }
    }, { db })

    return createRoleDto(role)
  })
}

export async function updateManagedRole({ actor, roleId, body = {} }) {
  ensureAdmin(actor)

  return runManagementTransaction(async db => {
    const role = await roleRepository.update(roleId, {
      name: body.name,
      permissions: body.permissions,
      remark: body.remark
    }, { db })

    if (!role) {
      throwManagementError(404, MANAGEMENT_ERROR_CODES.ROLE_NOT_FOUND, 'Role not found')
    }

    await recordManagementAction({
      actor,
      audit: {
        action: 'role.update',
        targetType: 'role',
        targetId: role.id,
        detail: `Updated role ${role.name}`
      },
      message: {
        recipientId: actor.sub,
        title: 'Role updated',
        content: `Role "${role.name}" was updated.`,
        entityType: 'role',
        entityId: role.id
      }
    }, { db })

    return createRoleDto(role)
  })
}

export async function deleteManagedRole({ actor, roleId }) {
  ensureAdmin(actor)

  await runManagementTransaction(async db => {
    const role = await roleRepository.findById(roleId, { db })
    if (!role) {
      throwManagementError(404, MANAGEMENT_ERROR_CODES.ROLE_NOT_FOUND, 'Role not found')
    }

    await roleRepository.delete(roleId, { db })
    await recordManagementAction({
      actor,
      audit: {
        action: 'role.delete',
        targetType: 'role',
        targetId: role.id,
        detail: `Deleted role ${role.name}`
      },
      message: {
        recipientId: actor.sub,
        title: 'Role deleted',
        content: `Role "${role.name}" was deleted.`,
        entityType: 'role',
        entityId: role.id
      }
    }, { db })
  })
}
