import { Router } from 'express'
import Answer from '../models/Answer.js'
import { authRequired } from '../middlewares/auth.js'
import ExcelJS from 'exceljs'

const router = Router()

router.get('/', authRequired, async (req, res, next) => {
  try {
    const { survey_id, page = 1, pageSize = 20, startTime, endTime } = req.query
    const result = await Answer.list({
      survey_id, page: Number(page), pageSize: Number(pageSize), startTime, endTime
    })
    res.json({ success: true, data: result })
  } catch (e) { next(e) }
})

router.get('/count', authRequired, async (req, res, next) => {
  try {
    const { survey_id } = req.query
    if (!survey_id) return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: '缺少 survey_id' } })
    const count = await Answer.count(survey_id)
    res.json({ success: true, data: { count } })
  } catch (e) { next(e) }
})

router.get('/:id', authRequired, async (req, res, next) => {
  try {
    const answer = await Answer.findById(req.params.id)
    if (!answer) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '答卷不存在' } })
    res.json({ success: true, data: answer })
  } catch (e) { next(e) }
})

router.delete('/batch', authRequired, async (req, res, next) => {
  try {
    const { ids = [] } = req.body || {}
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: '缺少要删除的 ID 列表' } })
    }
    const deleted = await Answer.deleteBatch(ids)
    res.json({ success: true, data: { deleted } })
  } catch (e) { next(e) }
})

router.post('/download/survey', authRequired, async (req, res, next) => {
  try {
    const { survey_id } = req.body || {}
    if (!survey_id) return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: '缺少 survey_id' } })

    const answers = await Answer.findBySurveyId(survey_id)
    const workbook = new ExcelJS.Workbook()
    const sheet = workbook.addWorksheet('答卷数据')

    sheet.columns = [
      { header: 'ID', key: 'id', width: 10 },
      { header: '提交时间', key: 'submitted_at', width: 20 },
      { header: 'IP', key: 'ip_address', width: 16 },
      { header: '耗时(秒)', key: 'duration', width: 10 },
      { header: '状态', key: 'status', width: 12 },
      { header: '答题数据', key: 'answers_data', width: 60 }
    ]
    for (const a of answers) {
      sheet.addRow({
        ...a,
        answers_data: JSON.stringify(a.answers_data)
      })
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.setHeader('Content-Disposition', `attachment; filename="survey-${survey_id}.xlsx"`)
    const buffer = await workbook.xlsx.writeBuffer()
    res.send(buffer)
  } catch (e) { next(e) }
})

export default router
