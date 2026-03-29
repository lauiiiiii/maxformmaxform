import knex from '../db/knex.js'

const TABLE = 'question_bank_questions'

function toDto(row) {
  if (!row) return null
  return {
    ...row,
    repoId: row.repo_id,
    score: row.score == null ? null : Number(row.score),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

const QuestionBankQuestion = {
  async findById(id, repoId) {
    let query = knex(TABLE).where('id', id)
    if (repoId !== undefined) query = query.andWhere('repo_id', repoId)
    const row = await query.first()
    return toDto(row)
  },

  async listByRepoId(repoId) {
    const rows = await knex(TABLE)
      .where('repo_id', repoId)
      .orderBy('id', 'asc')
    return rows.map(toDto)
  },

  async create({ repo_id, title, type = null, difficulty = null, score = null }) {
    const [id] = await knex(TABLE).insert({
      repo_id,
      title,
      type,
      difficulty,
      score,
      updated_at: knex.fn.now()
    })
    return QuestionBankQuestion.findById(id, repo_id)
  },

  async delete(id, repoId) {
    let query = knex(TABLE).where('id', id)
    if (repoId !== undefined) query = query.andWhere('repo_id', repoId)
    return query.del()
  },

  async deleteByRepoId(repoId) {
    return knex(TABLE).where('repo_id', repoId).del()
  }
}

export default QuestionBankQuestion
