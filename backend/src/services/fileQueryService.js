import { resolveFileListUploaderId } from '../policies/filePolicy.js'
import fileRepository from '../repositories/fileRepository.js'
import {
  createFilePageResult,
  normalizeFileListQuery
} from '../../../shared/management.contract.js'

export async function listManagedFiles({ actor, query = {} }) {
  const normalized = normalizeFileListQuery(query)
  const result = await fileRepository.list({
    page: normalized.page,
    pageSize: normalized.pageSize,
    uploader_id: resolveFileListUploaderId(actor, normalized.uploader_id),
    ...(normalized.survey_id !== undefined ? { survey_id: normalized.survey_id } : {})
  })

  return createFilePageResult({
    ...result,
    page: normalized.page,
    pageSize: normalized.pageSize
  })
}
