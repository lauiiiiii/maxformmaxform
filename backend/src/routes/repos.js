import { Router } from 'express'
import multer from 'multer'
import { asyncRoute } from '../http/asyncRoute.js'
import { sendDownloadBuffer } from '../http/downloadResponse.js'
import { throwManagementError } from '../http/managementErrors.js'
import { authRequired } from '../middlewares/auth.js'
import {
  createManagedQuestionBankQuestion,
  createManagedQuestionBankRepo,
  deleteManagedQuestionBankQuestion,
  deleteManagedQuestionBankRepo,
  exportManagedQuestionBankRepo,
  importManagedQuestionBankQuestions,
  listManagedQuestionBankQuestions,
  listManagedQuestionBankRepos,
  updateManagedQuestionBankQuestion,
  updateManagedQuestionBankRepo
} from '../services/questionBankService.js'
import { normalizeRequiredIntegerParam } from '../utils/routeParams.js'
import { MANAGEMENT_ERROR_CODES } from '../../../shared/management.contract.js'

const router = Router()
const importUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }
})

router.use(authRequired)

router.get('/', asyncRoute(async (req, res) => {
  const list = await listManagedQuestionBankRepos({ actor: req.user, query: req.query })
  res.json({ success: true, data: list })
}))

router.post('/', asyncRoute(async (req, res) => {
  const repo = await createManagedQuestionBankRepo({ actor: req.user, body: req.body })
  res.json({ success: true, data: repo })
}))

router.put('/:id', asyncRoute(async (req, res) => {
  const repoId = normalizeRequiredIntegerParam(req.params.id, 'id', message => {
    throwManagementError(400, MANAGEMENT_ERROR_CODES.INVALID_PAYLOAD, message)
  })
  const repo = await updateManagedQuestionBankRepo({ actor: req.user, repoId, body: req.body })
  res.json({ success: true, data: repo })
}))

router.delete('/:id', asyncRoute(async (req, res) => {
  const repoId = normalizeRequiredIntegerParam(req.params.id, 'id', message => {
    throwManagementError(400, MANAGEMENT_ERROR_CODES.INVALID_PAYLOAD, message)
  })
  await deleteManagedQuestionBankRepo({ actor: req.user, repoId })
  res.json({ success: true })
}))

router.get('/:id/export', asyncRoute(async (req, res) => {
  const repoId = normalizeRequiredIntegerParam(req.params.id, 'id', message => {
    throwManagementError(400, MANAGEMENT_ERROR_CODES.INVALID_PAYLOAD, message)
  })
  const file = await exportManagedQuestionBankRepo({
    actor: req.user,
    repoId,
    format: req.query?.format,
    query: req.query
  })
  sendDownloadBuffer(res, file)
}))

router.post('/:id/import', importUpload.single('file'), asyncRoute(async (req, res) => {
  const repoId = normalizeRequiredIntegerParam(req.params.id, 'id', message => {
    throwManagementError(400, MANAGEMENT_ERROR_CODES.INVALID_PAYLOAD, message)
  })
  const result = await importManagedQuestionBankQuestions({
    actor: req.user,
    repoId,
    body: req.body,
    file: req.file
  })
  res.json({ success: true, data: result })
}))

router.get('/:id/questions', asyncRoute(async (req, res) => {
  const repoId = normalizeRequiredIntegerParam(req.params.id, 'id', message => {
    throwManagementError(400, MANAGEMENT_ERROR_CODES.INVALID_PAYLOAD, message)
  })
  const list = await listManagedQuestionBankQuestions({ actor: req.user, repoId, query: req.query })
  res.json({ success: true, data: list })
}))

router.post('/:id/questions', asyncRoute(async (req, res) => {
  const repoId = normalizeRequiredIntegerParam(req.params.id, 'id', message => {
    throwManagementError(400, MANAGEMENT_ERROR_CODES.INVALID_PAYLOAD, message)
  })
  const question = await createManagedQuestionBankQuestion({ actor: req.user, repoId, body: req.body })
  res.json({ success: true, data: question })
}))

router.put('/:id/questions/:questionId', asyncRoute(async (req, res) => {
  const repoId = normalizeRequiredIntegerParam(req.params.id, 'id', message => {
    throwManagementError(400, MANAGEMENT_ERROR_CODES.INVALID_PAYLOAD, message)
  })
  const questionId = normalizeRequiredIntegerParam(req.params.questionId, 'questionId', message => {
    throwManagementError(400, MANAGEMENT_ERROR_CODES.INVALID_PAYLOAD, message)
  })
  const question = await updateManagedQuestionBankQuestion({
    actor: req.user,
    repoId,
    questionId,
    body: req.body
  })
  res.json({ success: true, data: question })
}))

router.delete('/:id/questions/:questionId', asyncRoute(async (req, res) => {
  const repoId = normalizeRequiredIntegerParam(req.params.id, 'id', message => {
    throwManagementError(400, MANAGEMENT_ERROR_CODES.INVALID_PAYLOAD, message)
  })
  const questionId = normalizeRequiredIntegerParam(req.params.questionId, 'questionId', message => {
    throwManagementError(400, MANAGEMENT_ERROR_CODES.INVALID_PAYLOAD, message)
  })
  await deleteManagedQuestionBankQuestion({
    actor: req.user,
    repoId,
    questionId
  })
  res.json({ success: true })
}))

export default router
