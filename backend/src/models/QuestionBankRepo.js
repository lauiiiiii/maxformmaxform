import knex from '../db/knex.js'

const TABLE = 'question_bank_repos'
const QUESTION_TABLE = 'question_bank_questions'

function getDb(options = {}) {
  return options.db || knex
}

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

function baseListQuery(db = knex) {
  return db(`${TABLE} as r`)
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
  async findById(id, options = {}) {
    const db = getDb(options)
    const row = await baseListQuery(db).where('r.id', id).first()
    return toDto(row)
  },

  async list(options = {}) {
    const db = getDb(options)
    const rows = await baseListQuery(db).orderBy('r.id', 'asc')
    return rows.map(toDto)
  },

  async create({ name, description = null }, options = {}) {
    const db = getDb(options)
    const [id] = await db(TABLE).insert({
      name,
      description,
      updated_at: db.fn.now()
    })
    return QuestionBankRepo.findById(id, options)
  },

  async update(id, fields, options = {}) {
    const db = getDb(options)
    const data = {}
    if (fields.name !== undefined) data.name = fields.name
    if (fields.description !== undefined) data.description = fields.description
    data.updated_at = db.fn.now()
    await db(TABLE).where('id', id).update(data)
    return QuestionBankRepo.findById(id, options)
  },

  async delete(id, options = {}) {
    const db = getDb(options)
    return db(TABLE).where('id', id).del()
  }
}

export default QuestionBankRepo
