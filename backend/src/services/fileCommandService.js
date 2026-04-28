import { throwManagementError, throwManagementPolicyError } from '../http/managementErrors.js'
import { getManageFilePolicy } from '../policies/filePolicy.js'
import fileRepository from '../repositories/fileRepository.js'
import { buildUploadedFileUrl, removeUploadedFile } from '../utils/uploadStorage.js'
import { createFileDto, MANAGEMENT_ERROR_CODES } from '../../../shared/management.contract.js'

function ensureUploadedFile(file) {
  if (file) return
  throwManagementError(400, MANAGEMENT_ERROR_CODES.FILE_REQUIRED, 'File is required')
}

async function createManagedFileRecord({ actor, file }) {
  ensureUploadedFile(file)

  const url = buildUploadedFileUrl(file)
  const saved = await fileRepository.create({
    name: file.originalname || file.filename,
    url,
    size: file.size,
    type: file.mimetype,
    uploader_id: actor.sub
  })

  return createFileDto(saved)
}

export async function uploadManagedFile({ actor, file }) {
  return createManagedFileRecord({ actor, file })
}

export async function uploadManagedImage({ actor, file }) {
  const saved = await createManagedFileRecord({ actor, file })
  return {
    id: saved.id,
    url: saved.url,
    filename: saved.name
  }
}

export async function deleteManagedFile({ actor, fileId }) {
  const file = await fileRepository.findById(fileId)
  if (!file) {
    throwManagementError(404, MANAGEMENT_ERROR_CODES.FILE_NOT_FOUND, 'File not found')
  }

  throwManagementPolicyError(getManageFilePolicy(actor, file))

  removeUploadedFile(file)
  await fileRepository.delete(fileId)
}
