import { Router } from 'express'
import { asyncRoute } from '../http/asyncRoute.js'
import { authRequired } from '../middlewares/auth.js'
import {
  getCurrentAuthSession,
  loginAuthUser,
  registerAuthUser
} from '../services/authService.js'

const router = Router()

router.post('/register', asyncRoute(async (req, res) => {
  const data = await registerAuthUser({ body: req.body })
  res.json({ success: true, data })
}))

router.post('/login', asyncRoute(async (req, res) => {
  const data = await loginAuthUser({ body: req.body })
  res.json({ success: true, data })
}))

router.get('/me', authRequired, asyncRoute(async (req, res) => {
  const data = await getCurrentAuthSession({ actor: req.user })
  res.json({ success: true, data })
}))

export default router
