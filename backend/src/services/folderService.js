import { throwManagementError, throwManagementPolicyError } from '../http/managementErrors.js'
import { getAuthenticatedActorPolicy } from '../policies/actorPolicy.js'
import folderRepository from '../repositories/folderRepository.js'
import { createAuditMessage, recordAudit } from './activity.js'
import {
  createFolderDto,
  MANAGEMENT_ERROR_CODES,
  normalizeFolderListQuery,
  normalizeFolderParentId
} from '../../../shared/management.contract.js'

function hasOwn(source, key) {
  return Object.prototype.hasOwnProperty.call(source || {}, key)
}

function getFolderParentFromBody(body = {}) {
  const hasParent = hasOwn(body, 'parentId') || hasOwn(body, 'parent_id')
  return {
    hasParent,
    parentId: hasParent ? normalizeFolderParentId(body.parentId ?? body.parent_id ?? null) : undefined
  }
}

function ensureAuthenticated(actor) {
  throwManagementPolicyError(getAuthenticatedActorPolicy(actor))
}

async function ensureParentFolder(parentId, creatorId) {
  if (parentId == null) return null

  const parent = await folderRepository.findById(parentId, creatorId)
  if (!parent) {
    throwManagementError(404, MANAGEMENT_ERROR_CODES.FOLDER_PARENT_NOT_FOUND, 'Folder parent not found')
  }

  return parent
}

async function getManagedFolderOrThrow(folderId, actor) {
  const folder = await folderRepository.findById(folderId, actor.sub)
  if (!folder) {
    throwManagementError(404, MANAGEMENT_ERROR_CODES.FOLDER_NOT_FOUND, 'Folder not found')
  }

  return folder
}

export async function listManagedFolders({ actor, query = {} }) {
  ensureAuthenticated(actor)
  const normalized = normalizeFolderListQuery(query)

  const list = await folderRepository.list({
    creator_id: actor.sub,
    parent_id: normalized.hasParent ? normalized.parentId : undefined
  })
  return list.map(item => createFolderDto(item))
}

export async function listAllManagedFolders({ actor }) {
  ensureAuthenticated(actor)
  const list = await folderRepository.list({ creator_id: actor.sub })
  return list.map(item => createFolderDto(item))
}

export async function createManagedFolder({ actor, body = {} }) {
  ensureAuthenticated(actor)
  const name = String(body.name || '').trim()
  const parent_id = normalizeFolderParentId(body.parentId ?? body.parent_id ?? null)

  if (!name) {
    throwManagementError(400, MANAGEMENT_ERROR_CODES.FOLDER_NAME_REQUIRED, 'Folder name is required')
  }

  await ensureParentFolder(parent_id, actor.sub)
  const folder = await folderRepository.create({
    creator_id: actor.sub,
    name,
    parent_id
  })

  await recordAudit({
    actor,
    action: 'folder.create',
    targetType: 'folder',
    targetId: folder.id,
    detail: `Created folder ${name}`
  })
  await createAuditMessage({
    recipientId: actor.sub,
    createdBy: actor.sub,
    title: 'Folder created',
    content: `Folder "${name}" is ready.`,
    entityType: 'folder',
    entityId: folder.id
  })

  return createFolderDto(folder)
}

export async function updateManagedFolder({ actor, folderId, body = {} }) {
  ensureAuthenticated(actor)
  const existing = await getManagedFolderOrThrow(folderId, actor)
  const { hasParent, parentId } = getFolderParentFromBody(body)

  if (hasParent && parentId !== null && Number(parentId) === Number(existing.id)) {
    throwManagementError(400, MANAGEMENT_ERROR_CODES.FOLDER_SELF_PARENT, 'Folder cannot be its own parent')
  }

  if (hasParent) {
    await ensureParentFolder(parentId, actor.sub)
  }

  const name = body.name === undefined ? undefined : String(body.name || '').trim()
  if (name !== undefined && !name) {
    throwManagementError(400, MANAGEMENT_ERROR_CODES.FOLDER_NAME_REQUIRED, 'Folder name is required')
  }

  const folder = await folderRepository.update(existing.id, actor.sub, {
    name,
    parent_id: hasParent ? parentId : undefined
  })

  await recordAudit({
    actor,
    action: 'folder.update',
    targetType: 'folder',
    targetId: folder?.id || existing.id,
    detail: `Updated folder ${folder?.name || existing.name}`
  })

  return createFolderDto(folder)
}

export async function deleteManagedFolder({ actor, folderId }) {
  ensureAuthenticated(actor)
  const existing = await getManagedFolderOrThrow(folderId, actor)

  const childCount = await folderRepository.countChildren(existing.id, actor.sub)
  if (childCount > 0) {
    throwManagementError(409, MANAGEMENT_ERROR_CODES.FOLDER_HAS_CHILDREN, 'Delete child folders first')
  }

  const movedSurveys = await folderRepository.moveSurveysToRoot(existing.id, actor.sub)
  await folderRepository.delete(existing.id, actor.sub)
  await recordAudit({
    actor,
    action: 'folder.delete',
    targetType: 'folder',
    targetId: existing.id,
    detail: `Deleted folder ${existing.name}`
  })
  await createAuditMessage({
    recipientId: actor.sub,
    createdBy: actor.sub,
    title: 'Folder deleted',
    content: movedSurveys > 0
      ? `Folder "${existing.name}" was deleted and ${movedSurveys} surveys were moved to root.`
      : `Folder "${existing.name}" was deleted.`,
    entityType: 'folder',
    entityId: existing.id
  })

  return { movedSurveys }
}
