import { Router } from 'express'
import { asyncRoute } from '../http/asyncRoute.js'
import { authRequired } from '../middlewares/auth.js'
import {
  createManagedFlow,
  deleteManagedFlow,
  listManagedFlows,
  updateManagedFlow
} from '../services/flowService.js'

const router = Router()

router.use(authRequired)

router.get('/', asyncRoute(async (req, res) => {
  const list = await listManagedFlows({ actor: req.user })
  res.json({ success: true, data: list })
}))

router.post('/', asyncRoute(async (req, res) => {
  const flow = await createManagedFlow({ actor: req.user, body: req.body })
  res.json({ success: true, data: flow })
}))

router.put('/:id', asyncRoute(async (req, res) => {
  const flow = await updateManagedFlow({ actor: req.user, flowId: req.params.id, body: req.body })
  res.json({ success: true, data: flow })
}))

router.delete('/:id', asyncRoute(async (req, res) => {
  await deleteManagedFlow({ actor: req.user, flowId: req.params.id })
  res.json({ success: true })
}))

export default router
