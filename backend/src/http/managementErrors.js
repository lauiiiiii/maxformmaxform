import { MANAGEMENT_ERROR_CODES } from '../../../shared/management.contract.js'
import { createResponseError, throwPolicyError } from './errors.js'

export function createManagementError(status, code, message) {
  return createResponseError(status, {
    success: false,
    error: { code, message }
  })
}

export function throwManagementError(status, code, message) {
  throw createManagementError(status, code, message)
}

export function throwManagementPolicyError(policy) {
  if (policy?.allowed) return

  const status = Number(policy?.status) || 403
  if (status === 401) {
    throwPolicyError(policy)
  }

  throwManagementError(
    status,
    MANAGEMENT_ERROR_CODES.ACCESS_FORBIDDEN,
    policy?.body?.error?.message || 'Forbidden'
  )
}
