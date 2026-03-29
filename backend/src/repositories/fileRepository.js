import FileModel from '../models/File.js'

const fileRepository = {
  async findById(id, options = {}) {
    return FileModel.findById(id, options)
  },

  async create(payload, options = {}) {
    return FileModel.create(payload, options)
  },

  async delete(id, options = {}) {
    return FileModel.delete(id, options)
  },

  async list(payload = {}, options = {}) {
    return FileModel.list(payload, options)
  },

  async listAnswerFilesBySurveyId(surveyId, options = {}) {
    return FileModel.listAnswerFilesBySurveyId(surveyId, options)
  }
}

export default fileRepository
