import AnswerModel from '../models/Answer.js'

const answerRepository = {
  async findById(id, options = {}) {
    return AnswerModel.findById(id, options)
  },

  async findByIds(ids = [], options = {}) {
    if (!Array.isArray(ids) || ids.length === 0) return []
    const rows = await Promise.all(ids.map(id => AnswerModel.findById(id, options)))
    return rows.filter(Boolean)
  },

  async list(payload = {}, options = {}) {
    return AnswerModel.list(payload, options)
  },

  async countBySurveyId(surveyId, options = {}) {
    const count = await AnswerModel.count(surveyId, options)
    return Number(count || 0)
  },

  async listBySurveyId(surveyId, options = {}) {
    return AnswerModel.findBySurveyId(surveyId, options)
  }
}

export default answerRepository
