import { Router } from 'express'
import jwt from 'jsonwebtoken'
import config from '../config/index.js'
import User from '../models/User.js'
import Role from '../models/Role.js'
import { authRequired } from '../middlewares/auth.js'

const router = Router()

function signToken(user, roleCode) {
  return jwt.sign(
    { sub: user.id, username: user.username, roleCode },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  )
}

router.post('/register', async (req, res, next) => {
  try {
    const { username, email, password } = req.body || {}
    if (!username || !password) {
      return res.status(400).json({ success: false, error: { code: 'MISSING_FIELDS', message: '用户名和密码为必填项' } })
    }

    const existing = await User.findByUsername(username)
    if (existing) {
      return res.status(409).json({ success: false, error: { code: 'USER_EXISTS', message: '用户名已存在' } })
    }
    if (email) {
      const emailTaken = await User.findByEmail(email)
      if (emailTaken) {
        return res.status(409).json({ success: false, error: { code: 'EMAIL_EXISTS', message: '邮箱已被注册' } })
      }
    }

    const defaultRole = await Role.findByCode('user')
    const user = await User.create({ username, email, password, role_id: defaultRole?.id })
    const token = signToken(user, 'user')

    res.json({ success: true, data: { token, user: User.toSafe(user) } })
  } catch (e) { next(e) }
})

router.post('/login', async (req, res, next) => {
  try {
    const { username, password } = req.body || {}
    if (!username || !password) {
      return res.status(400).json({ success: false, error: { code: 'MISSING_FIELDS', message: '用户名和密码为必填项' } })
    }

    const user = await User.findByUsername(username)
    if (!user) {
      return res.status(401).json({ success: false, error: { code: 'AUTH_FAILED', message: '用户名或密码不正确' } })
    }
    if (!user.is_active) {
      return res.status(403).json({ success: false, error: { code: 'USER_DISABLED', message: '账号已被禁用' } })
    }

    const ok = await User.verifyPassword(password, user.password)
    if (!ok) {
      return res.status(401).json({ success: false, error: { code: 'AUTH_FAILED', message: '用户名或密码不正确' } })
    }

    await User.updateLastLogin(user.id)
    const role = user.role_id ? await Role.findById(user.role_id) : null
    const token = signToken(user, role?.code || 'user')

    res.json({ success: true, data: { token, user: User.toSafe(user) } })
  } catch (e) { next(e) }
})

router.get('/me', authRequired, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.sub)
    if (!user) {
      return res.status(401).json({ success: false, error: { code: 'INVALID_TOKEN', message: '用户不存在' } })
    }
    const role = user.role_id ? await Role.findById(user.role_id) : null
    res.json({ success: true, data: { user: User.toSafe(user), role } })
  } catch (e) { next(e) }
})

export default router
