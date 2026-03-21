import { Router } from 'express'
import Survey from '../models/Survey.js'
import Answer from '../models/Answer.js'
import { authRequired } from '../middlewares/auth.js'

const router = Router()

router.get('/', authRequired, async (req, res, next) => {
  try {
    const { page = 1, pageSize = 20, status } = req.query
    const result = await Survey.list({
      page: Number(page), pageSize: Number(pageSize),
      creator_id: req.user.sub, status
    })
    res.json({ success: true, data: result })
  } catch (e) { next(e) }
})

router.post('/', authRequired, async (req, res, next) => {
  try {
    const { title, description, questions, settings, style } = req.body || {}
    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: '标题不能为空' } })
    }
    const survey = await Survey.create({
      title, description, creator_id: req.user.sub,
      questions: questions || [], settings, style
    })
    res.json({ success: true, data: survey })
  } catch (e) { next(e) }
})

router.get('/:id', async (req, res, next) => {
  try {
    const survey = await Survey.findById(req.params.id)
    if (!survey) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '问卷不存在' } })
    }
    res.json({ success: true, data: survey })
  } catch (e) { next(e) }
})

router.get('/share/:code', async (req, res, next) => {
  try {
    const survey = await Survey.findByShareCode(req.params.code)
    if (!survey) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '问卷不存在' } })
    }
    res.json({ success: true, data: survey })
  } catch (e) { next(e) }
})

router.put('/:id', authRequired, async (req, res, next) => {
  try {
    const { title, description, questions, settings, style } = req.body || {}
    const survey = await Survey.findById(req.params.id)
    if (!survey) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '问卷不存在' } })
    }
    const updated = await Survey.update(req.params.id, { title, description, questions, settings, style })
    res.json({ success: true, data: updated })
  } catch (e) { next(e) }
})

router.delete('/:id', authRequired, async (req, res, next) => {
  try {
    const survey = await Survey.findById(req.params.id)
    if (!survey) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '问卷不存在' } })
    }
    await Survey.delete(req.params.id)
    res.json({ success: true })
  } catch (e) { next(e) }
})

router.post('/:id/publish', authRequired, async (req, res, next) => {
  try {
    const survey = await Survey.findById(req.params.id)
    if (!survey) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '问卷不存在' } })
    }
    if (!survey.title || !survey.title.trim()) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: '标题不能为空' } })
    }
    const qs = Array.isArray(survey.questions) ? survey.questions : []
    if (qs.length === 0) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: '至少需要一道题目' } })
    }
    for (let i = 0; i < qs.length; i++) {
      if (!qs[i].title || !String(qs[i].title).trim()) {
        return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: `第${i + 1}题标题不能为空` } })
      }
      if (['radio', 'checkbox'].includes(qs[i].type)) {
        const opts = Array.isArray(qs[i].options) ? qs[i].options : []
        if (opts.length < 2) {
          return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: `第${i + 1}题至少需要2个选项` } })
        }
      }
    }
    const updated = await Survey.update(req.params.id, { status: 'published' })
    res.json({ success: true, data: updated })
  } catch (e) { next(e) }
})

router.post('/:id/close', authRequired, async (req, res, next) => {
  try {
    const survey = await Survey.findById(req.params.id)
    if (!survey) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '问卷不存在' } })
    }
    const updated = await Survey.update(req.params.id, { status: 'closed' })
    res.json({ success: true, data: updated })
  } catch (e) { next(e) }
})

router.post('/:id/responses', async (req, res, next) => {
  try {
    const survey = await Survey.findById(req.params.id)
    if (!survey) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '问卷不存在' } })
    }
    if (survey.status !== 'published') {
      return res.status(400).json({ success: false, error: { code: 'NOT_PUBLISHED', message: '问卷未发布或已关闭' } })
    }
    const answers = Array.isArray(req.body?.answers) ? req.body.answers : []
    const answer = await Answer.create({
      survey_id: survey.id,
      answers_data: answers,
      ip_address: req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '',
      user_agent: req.headers['user-agent'] || '',
      duration: req.body.duration || null
    })
    await Survey.incrementResponseCount(survey.id)
    res.json({ success: true, message: '提交成功，感谢您的参与！', data: { id: answer.id } })
  } catch (e) { next(e) }
})

router.get('/:id/results', async (req, res, next) => {
  try {
    const total = await Answer.count(req.params.id)
    const last = await Answer.lastSubmission(req.params.id)
    res.json({ success: true, data: { totalSubmissions: total, lastSubmitAt: last?.submitted_at || null } })
  } catch (e) { next(e) }
})

export default router
