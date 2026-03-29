import { throwManagementError, throwManagementPolicyError } from '../http/managementErrors.js'
import { getAdminPolicy } from '../policies/adminPolicy.js'
import { getAuthenticatedActorPolicy } from '../policies/actorPolicy.js'
import deptRepository from '../repositories/deptRepository.js'
import { recordManagementAction, runManagementTransaction } from './activity.js'
import { createDeptDto, MANAGEMENT_ERROR_CODES } from '../../../shared/management.contract.js'

function ensureAdmin(actor) {
  throwManagementPolicyError(getAdminPolicy(actor))
}

function ensureAuthenticated(actor) {
  throwManagementPolicyError(getAuthenticatedActorPolicy(actor))
}

export async function listManagedDepts({ actor }) {
  ensureAuthenticated(actor)
  const list = await deptRepository.list()
  return list.map(item => createDeptDto(item))
}

export async function getManagedDeptTree({ actor }) {
  ensureAuthenticated(actor)
  const tree = await deptRepository.tree()
  return tree.map(item => createDeptDto(item))
}

export async function createManagedDept({ actor, body = {} }) {
  ensureAdmin(actor)

  return runManagementTransaction(async db => {
    const name = String(body.name || '').trim()
    if (!name) {
      throwManagementError(400, MANAGEMENT_ERROR_CODES.DEPT_NAME_REQUIRED, 'Department name is required')
    }

    const dept = await deptRepository.create({
      name,
      parent_id: body.parent_id,
      sort_order: body.sort_order
    }, { db })

    await recordManagementAction({
      actor,
      audit: {
        action: 'dept.create',
        targetType: 'dept',
        targetId: dept.id,
        detail: `Created department ${dept.name}`
      },
      message: {
        recipientId: actor.sub,
        title: 'Department created',
        content: `Department "${dept.name}" was created.`,
        entityType: 'dept',
        entityId: dept.id
      }
    }, { db })

    return createDeptDto(dept)
  })
}

export async function updateManagedDept({ actor, deptId, body = {} }) {
  ensureAdmin(actor)

  return runManagementTransaction(async db => {
    const dept = await deptRepository.update(deptId, {
      name: body.name === undefined ? undefined : String(body.name).trim(),
      parent_id: body.parent_id,
      sort_order: body.sort_order
    }, { db })

    if (!dept) {
      throwManagementError(404, MANAGEMENT_ERROR_CODES.DEPT_NOT_FOUND, 'Department not found')
    }

    await recordManagementAction({
      actor,
      audit: {
        action: 'dept.update',
        targetType: 'dept',
        targetId: dept.id,
        detail: `Updated department ${dept.name}`
      },
      message: {
        recipientId: actor.sub,
        title: 'Department updated',
        content: `Department "${dept.name}" was updated.`,
        entityType: 'dept',
        entityId: dept.id
      }
    }, { db })

    return createDeptDto(dept)
  })
}

export async function deleteManagedDept({ actor, deptId }) {
  ensureAdmin(actor)

  return runManagementTransaction(async db => {
    const dept = await deptRepository.findById(deptId, { db })
    if (!dept) {
      throwManagementError(404, MANAGEMENT_ERROR_CODES.DEPT_NOT_FOUND, 'Department not found')
    }

    const childCount = await deptRepository.countChildren(deptId, { db })
    if (childCount > 0) {
      throwManagementError(409, MANAGEMENT_ERROR_CODES.DEPT_HAS_CHILDREN, 'Delete child departments first')
    }

    const userCount = await deptRepository.countUsers(deptId, { db })
    if (userCount > 0) {
      await deptRepository.clearUsersDept(deptId, { db })
    }

    await deptRepository.delete(deptId, { db })
    await recordManagementAction({
      actor,
      audit: {
        action: 'dept.delete',
        targetType: 'dept',
        targetId: dept.id,
        detail: `Deleted department ${dept.name}`
      },
      message: {
        recipientId: actor.sub,
        title: 'Department deleted',
        content: userCount > 0
          ? `Department "${dept.name}" was deleted and ${userCount} users were detached.`
          : `Department "${dept.name}" was deleted.`,
        entityType: 'dept',
        entityId: dept.id
      }
    }, { db })

    return { clearedUsers: userCount }
  })
}
