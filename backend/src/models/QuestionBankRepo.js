import knex from '../db/knex.js'

const TABLE = 'question_bank_repos'
const QUESTION_TABLE = 'question_bank_questions'

function toDto(row) {
  if (!row) return null
  return {
    ...row,
    question_count: Number(row.question_count || 0),
    questionCount: Number(row.question_count || 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

function baseListQuery() {
  return knex(`${TABLE} as r`)
    .select(
      'r.id',
      'r.name',
      'r.description',
      'r.created_at',
      'r.updated_at'
    )
    .count({ question_count: 'q.id' })
    .leftJoin(`${QUESTION_TABLE} as q`, 'q.repo_id', 'r.id')
    .groupBy('r.id', 'r.name', 'r.description', 'r.created_at', 'r.updated_at')
}

const QuestionBankRepo = {
  async findById(id) {
    const row = await baseListQuery().where('r.id', id).first()
    return toDto(row)
  },

  async list() {
    const rows = await baseListQuery().orderBy('r.id', 'asc')
    return rows.map(toDto)
  },

  async create({ name, description = null }) {
    const [id] = await knex(TABLE).insert({
      name,
      description,
      updated_at: knex.fn.now()
    })
    return QuestionBankRepo.findById(id)
  },

  async update(id, fields) {
    const data = {}
    if (fields.name !== undefined) data.name = fields.name
    if (fields.description !== undefined) data.description = fields.description
    data.updated_at = knex.fn.now()
    await knex(TABLE).where('id', id).update(data)
    return QuestionBankRepo.findById(id)
  },

  async delete(id) {
    return knex(TABLE).where('id', id).del()
  }
}

export default QuestionBankRepo
