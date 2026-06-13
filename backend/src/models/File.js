import getDb from '../db/getDb.js'

const TABLE = 'files'
const MAX_FILE_TYPE_LENGTH = 120

function normalizeFileType(type) {
  return String(type || '').slice(0, MAX_FILE_TYPE_LENGTH)
}

const File = {
  async findById(id, options = {}) {
    const db = getDb(options)
    return db(TABLE).where('id', id).first()
  },

  async findByIds(ids = [], options = {}) {
    if (!Array.isArray(ids) || ids.length === 0) return []
    const db = getDb(options)
    let q = db(TABLE).whereIn('id', ids)
    if (options.survey_id !== undefined) q = q.where('survey_id', options.survey_id)
    return q
  },

  async countPendingBySurveyQuestionSession(survey_id, question_order, submission_token, options = {}) {
    const db = getDb(options)
    return db(TABLE)
      .where('survey_id', survey_id)
      .where('question_order', question_order)
      .where('submission_token', submission_token)
      .whereNull('answer_id')
      .count('* as cnt')
      .first()
      .then(row => Number(row?.cnt || 0))
  },

  async listPendingBySurveyQuestionSession(survey_id, question_order, submission_token, options = {}) {
    const db = getDb(options)
    return db(TABLE)
      .where('survey_id', survey_id)
      .where('question_order', question_order)
      .where('submission_token', submission_token)
      .whereNull('answer_id')
      .orderBy('id', 'asc')
  },

  async create({ name, url, size, type, uploader_id, survey_id = null, public_token = null, question_order = null, submission_token = null, answer_id = null }, options = {}) {
    const db = getDb(options)
    const [id] = await db(TABLE).insert({ name, url, size, type: normalizeFileType(type), uploader_id, survey_id, public_token, question_order, submission_token, answer_id })
    return File.findById(id, options)
  },

  async attachToAnswer(ids = [], answer_id, options = {}) {
    const db = getDb(options)
    if (!Array.isArray(ids) || ids.length === 0) return 0
    return db(TABLE)
      .whereIn('id', ids)
      .update({ answer_id, submission_token: null })
  },

  async listExpiredPending(cutoff, options = {}) {
    const db = getDb(options)
    return db(TABLE)
      .whereNull('answer_id')
      .whereNotNull('submission_token')
      .where('created_at', '<', cutoff)
  },

  async listPendingBySubmission(survey_id, submission_token, options = {}) {
    if (!submission_token) return []
    const db = getDb(options)
    return db(TABLE)
      .where('survey_id', survey_id)
      .where('submission_token', submission_token)
      .whereNull('answer_id')
  },

  async listBySurveyIds(surveyIds = [], options = {}) {
    const db = getDb(options)
    if (!Array.isArray(surveyIds) || surveyIds.length === 0) return []
    return db(TABLE)
      .whereIn('survey_id', surveyIds)
      .orderBy([{ column: 'survey_id', order: 'asc' }, { column: 'id', order: 'asc' }])
  },

  async listByAnswerIds(answerIds = [], options = {}) {
    const db = getDb(options)
    if (!Array.isArray(answerIds) || answerIds.length === 0) return []
    return db(TABLE)
      .whereIn('answer_id', answerIds)
      .orderBy([{ column: 'answer_id', order: 'asc' }, { column: 'id', order: 'asc' }])
  },

  async deleteByIds(ids = [], options = {}) {
    const db = getDb(options)
    if (!Array.isArray(ids) || ids.length === 0) return 0
    return db(TABLE).whereIn('id', ids).del()
  },

  async deleteBySurveyIds(surveyIds = [], options = {}) {
    const db = getDb(options)
    if (!Array.isArray(surveyIds) || surveyIds.length === 0) return 0
    return db(TABLE).whereIn('survey_id', surveyIds).del()
  },

  async deleteByAnswerIds(answerIds = [], options = {}) {
    const db = getDb(options)
    if (!Array.isArray(answerIds) || answerIds.length === 0) return 0
    return db(TABLE).whereIn('answer_id', answerIds).del()
  },

  async delete(id, options = {}) {
    const db = getDb(options)
    return db(TABLE).where('id', id).del()
  },

  async list({ page = 1, pageSize = 20, uploader_id, survey_id } = {}, options = {}) {
    const db = getDb(options)
    let q = db(TABLE)
    if (uploader_id !== undefined) q = q.where('uploader_id', uploader_id)
    if (survey_id !== undefined) q = q.where('survey_id', survey_id)
    const total = await q.clone().count('* as cnt').first().then(r => r.cnt)
    const list = await q.orderBy('created_at', 'desc').limit(pageSize).offset((page - 1) * pageSize)
    return { total, list }
  },

  async listAnswerFilesBySurveyId(survey_id, options = {}) {
    const db = getDb(options)
    return db(TABLE)
      .where('survey_id', survey_id)
      .whereNotNull('answer_id')
      .orderBy([{ column: 'answer_id', order: 'asc' }, { column: 'id', order: 'asc' }])
  }
}

export default File
