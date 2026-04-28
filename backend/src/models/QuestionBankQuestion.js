import knex from '../db/knex.js'

const TABLE = 'question_bank_questions'

function getDb(options = {}) {
  return options.db || knex
}

function parseJsonField(value, fallback = null) {
  if (value == null) return fallback
  if (typeof value === 'string') {
    try {
      return JSON.parse(value)
    } catch {
      return fallback
    }
  }
  return value
}

function toDto(row) {
  if (!row) return null
  return {
    ...row,
    repoId: row.repo_id,
    score: row.score == null ? null : Number(row.score),
    content: parseJsonField(row.content, null),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

function normalizeQuestionMatches(item, filters = {}) {
  const keyword = String(filters.keyword || '').trim().toLowerCase()
  const type = String(filters.type || '').trim().toLowerCase()
  const content = item?.content && typeof item.content === 'object' ? item.content : {}
  const tags = Array.isArray(content.tags) ? content.tags.map(tag => String(tag).toLowerCase()) : []

  if (keyword) {
    const haystack = [
      item?.title,
      item?.type,
      item?.difficulty,
      content.stem,
      content.analysis,
      ...tags
    ]
      .map(value => String(value || '').toLowerCase())
      .join(' ')

    if (!haystack.includes(keyword)) return false
  }

  if (type && String(item?.type || content.questionType || '').trim().toLowerCase() !== type) return false
  return true
}

const QuestionBankQuestion = {
  async findById(id, repoId, options = {}) {
    const db = getDb(options)
    let query = db(TABLE).where('id', id)
    if (repoId !== undefined) query = query.andWhere('repo_id', repoId)
    const row = await query.first()
    return toDto(row)
  },

  async listByRepoId(repoId, options = {}) {
    const db = getDb(options)
    const rows = await db(TABLE)
      .where('repo_id', repoId)
      .orderBy('id', 'asc')
    return rows
      .map(toDto)
      .filter(item => normalizeQuestionMatches(item, options))
  },

  async create({ repo_id, title, type = null, difficulty = null, score = null, content = null }, options = {}) {
    const db = getDb(options)
    const [id] = await db(TABLE).insert({
      repo_id,
      title,
      type,
      difficulty,
      score,
      content: content ? JSON.stringify(content) : null,
      updated_at: db.fn.now()
    })
    return QuestionBankQuestion.findById(id, repo_id, options)
  },

  async update(id, repoId, fields, options = {}) {
    const db = getDb(options)
    const data = {}
    if (fields.title !== undefined) data.title = fields.title
    if (fields.type !== undefined) data.type = fields.type
    if (fields.difficulty !== undefined) data.difficulty = fields.difficulty
    if (fields.score !== undefined) data.score = fields.score
    if (fields.content !== undefined) data.content = fields.content ? JSON.stringify(fields.content) : null
    data.updated_at = db.fn.now()

    let query = db(TABLE).where('id', id)
    if (repoId !== undefined) query = query.andWhere('repo_id', repoId)
    await query.update(data)
    return QuestionBankQuestion.findById(id, repoId, options)
  },

  async delete(id, repoId, options = {}) {
    const db = getDb(options)
    let query = db(TABLE).where('id', id)
    if (repoId !== undefined) query = query.andWhere('repo_id', repoId)
    return query.del()
  },

  async deleteByRepoId(repoId, options = {}) {
    const db = getDb(options)
    return db(TABLE).where('repo_id', repoId).del()
  }
}

export default QuestionBankQuestion
