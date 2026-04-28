import { MANAGEMENT_ERROR_CODES } from '../../../shared/management.contract.js'
import { isAdmin, isOwner } from './accessPolicy.js'

export function canManageFile(user, file) {
  return isAdmin(user) || isOwner(user, file?.uploader_id)
}

export function getManageFilePolicy(user, file) {
  if (canManageFile(user, file)) {
    return { allowed: true }
  }

  return {
    allowed: false,
    status: 403,
    body: {
      success: false,
      error: { code: MANAGEMENT_ERROR_CODES.ACCESS_FORBIDDEN, message: 'No permission to delete this file' }
    }
  }
}

export function resolveFileListUploaderId(user, requestedUploaderId) {
  if (isAdmin(user)) {
    return requestedUploaderId !== undefined ? Number(requestedUploaderId) : undefined
  }

  return user?.sub
}
