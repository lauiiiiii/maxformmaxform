import QuestionBankQuestion from '../models/QuestionBankQuestion.js'
import QuestionBankRepo from '../models/QuestionBankRepo.js'

const questionBankRepository = {
  async listRepos() {
    return QuestionBankRepo.list()
  },

  async findRepoById(id) {
    return QuestionBankRepo.findById(id)
  },

  async createRepo(payload) {
    return QuestionBankRepo.create(payload)
  },

  async updateRepo(id, fields) {
    return QuestionBankRepo.update(id, fields)
  },

  async deleteRepo(id) {
    await QuestionBankQuestion.deleteByRepoId(id)
    return QuestionBankRepo.delete(id)
  },

  async listQuestions(repoId) {
    return QuestionBankQuestion.listByRepoId(repoId)
  },

  async findQuestionById(questionId, repoId) {
    return QuestionBankQuestion.findById(questionId, repoId)
  },

  async createQuestion(payload) {
    return QuestionBankQuestion.create(payload)
  },

  async deleteQuestion(questionId, repoId) {
    return QuestionBankQuestion.delete(questionId, repoId)
  }
}

export default questionBankRepository
