import { Router } from 'express'
import Role from '../models/Role.js'
import { authRequired, requireRole } from '../middlewares/auth.js'

const router = Router()

router.use(authRequired, requireRole('admin'))

router.get('/', async (req, res, next) => {
  try {
    const list = await Role.list()
    res.json({ success: true, data: list })
  } catch (e) { next(e) }
})

router.post('/', async (req, res, next) => {
  try {
    const { name, code, permissions, remark } = req.body || {}
    if (!name || !code) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: '角色名称和编码为必填项' } })
    }
    const existing = await Role.findByCode(code)
    if (existing) return res.status(409).json({ success: false, error: { code: 'ROLE_EXISTS', message: '角色编码已存在' } })

    const role = await Role.create({ name, code, permissions, remark })
    res.json({ success: true, data: role })
  } catch (e) { next(e) }
})

router.put('/:id', async (req, res, next) => {
  try {
    const { name, permissions, remark } = req.body || {}
    const role = await Role.update(req.params.id, { name, permissions, remark })
    if (!role) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '角色不存在' } })
    res.json({ success: true, data: role })
  } catch (e) { next(e) }
})

router.delete('/:id', async (req, res, next) => {
  try {
    await Role.delete(req.params.id)
    res.json({ success: true })
  } catch (e) { next(e) }
})

export default router
