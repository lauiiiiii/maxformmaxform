import { Router } from 'express'
import { asyncRoute } from '../http/asyncRoute.js'
import { authRequired } from '../middlewares/auth.js'
import {
  createManagedQuestionBankQuestion,
  createManagedQuestionBankRepo,
  deleteManagedQuestionBankQuestion,
  deleteManagedQuestionBankRepo,
  listManagedQuestionBankQuestions,
  listManagedQuestionBankRepos,
  updateManagedQuestionBankRepo
} from '../services/questionBankService.js'

const router = Router()

router.use(authRequired)

router.get('/', asyncRoute(async (req, res) => {
  const list = await listManagedQuestionBankRepos({ actor: req.user })
  res.json({ success: true, data: list })
}))

router.post('/', asyncRoute(async (req, res) => {
  const repo = await createManagedQuestionBankRepo({ actor: req.user, body: req.body })
  res.json({ success: true, data: repo })
}))

router.put('/:id', asyncRoute(async (req, res) => {
  const repo = await updateManagedQuestionBankRepo({ actor: req.user, repoId: req.params.id, body: req.body })
  res.json({ success: true, data: repo })
}))

router.delete('/:id', asyncRoute(async (req, res) => {
  await deleteManagedQuestionBankRepo({ actor: req.user, repoId: req.params.id })
  res.json({ success: true })
}))

router.get('/:id/questions', asyncRoute(async (req, res) => {
  const list = await listManagedQuestionBankQuestions({ actor: req.user, repoId: req.params.id })
  res.json({ success: true, data: list })
}))

router.post('/:id/questions', asyncRoute(async (req, res) => {
  const question = await createManagedQuestionBankQuestion({ actor: req.user, repoId: req.params.id, body: req.body })
  res.json({ success: true, data: question })
}))

router.delete('/:id/questions/:questionId', asyncRoute(async (req, res) => {
  await deleteManagedQuestionBankQuestion({
    actor: req.user,
    repoId: req.params.id,
    questionId: req.params.questionId
  })
  res.json({ success: true })
}))

export default router
