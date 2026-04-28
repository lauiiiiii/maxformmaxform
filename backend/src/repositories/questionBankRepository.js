import QuestionBankQuestion from '../models/QuestionBankQuestion.js'
import QuestionBankRepo from '../models/QuestionBankRepo.js'

const questionBankRepository = {
  async listRepos(options = {}) {
    return QuestionBankRepo.list(options)
  },

  async findRepoById(id, options = {}) {
    return QuestionBankRepo.findById(id, options)
  },

  async createRepo(payload, options = {}) {
    return QuestionBankRepo.create(payload, options)
  },

  async updateRepo(id, fields, options = {}) {
    return QuestionBankRepo.update(id, fields, options)
  },

  async deleteRepo(id, options = {}) {
    await QuestionBankQuestion.deleteByRepoId(id, options)
    return QuestionBankRepo.delete(id, options)
  },

  async listQuestions(repoId, options = {}) {
    return QuestionBankQuestion.listByRepoId(repoId, options)
  },

  async findQuestionById(questionId, repoId, options = {}) {
    return QuestionBankQuestion.findById(questionId, repoId, options)
  },

  async createQuestion(payload, options = {}) {
    return QuestionBankQuestion.create(payload, options)
  },

  async updateQuestion(questionId, repoId, fields, options = {}) {
    return QuestionBankQuestion.update(questionId, repoId, fields, options)
  },

  async deleteQuestion(questionId, repoId, options = {}) {
    return QuestionBankQuestion.delete(questionId, repoId, options)
  }
}

export default questionBankRepository
