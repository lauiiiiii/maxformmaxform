import { Router } from 'express'
import Dept from '../models/Dept.js'
import { authRequired, requireRole } from '../middlewares/auth.js'

const router = Router()

router.use(authRequired)

router.get('/', async (req, res, next) => {
  try {
    const list = await Dept.list()
    res.json({ success: true, data: list })
  } catch (e) { next(e) }
})

router.get('/tree', async (req, res, next) => {
  try {
    const tree = await Dept.tree()
    res.json({ success: true, data: tree })
  } catch (e) { next(e) }
})

router.post('/', requireRole('admin'), async (req, res, next) => {
  try {
    const { name, parent_id, sort_order } = req.body || {}
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: '部门名称不能为空' } })
    }
    const dept = await Dept.create({ name, parent_id, sort_order })
    res.json({ success: true, data: dept })
  } catch (e) { next(e) }
})

router.put('/:id', requireRole('admin'), async (req, res, next) => {
  try {
    const { name, parent_id, sort_order } = req.body || {}
    const dept = await Dept.update(req.params.id, { name, parent_id, sort_order })
    if (!dept) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '部门不存在' } })
    res.json({ success: true, data: dept })
  } catch (e) { next(e) }
})

router.delete('/:id', requireRole('admin'), async (req, res, next) => {
  try {
    await Dept.delete(req.params.id)
    res.json({ success: true })
  } catch (e) { next(e) }
})

export default router
