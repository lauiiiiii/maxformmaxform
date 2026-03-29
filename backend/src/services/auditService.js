import { throwManagementPolicyError } from '../http/managementErrors.js'
import { getAdminPolicy } from '../policies/adminPolicy.js'
import auditRepository from '../repositories/auditRepository.js'
import { createAuditPageResult, normalizeAuditListQuery } from '../../../shared/management.contract.js'

function ensureAdmin(actor) {
  throwManagementPolicyError(getAdminPolicy(actor))
}

export async function listManagedAudits({ actor, query = {} }) {
  ensureAdmin(actor)

  const normalized = normalizeAuditListQuery(query)
  const result = await auditRepository.list(normalized)
  return createAuditPageResult({
    ...result,
    page: normalized.page,
    pageSize: normalized.pageSize
  })
}
