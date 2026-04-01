import knex from '../db/knex.js'

const TABLE = 'question_bank_repos'
const QUESTION_TABLE = 'question_bank_questions'

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
    creator_id: row.creator_id == null ? null : Number(row.creator_id),
    creatorId: row.creator_id == null ? null : Number(row.creator_id),
    question_count: Number(row.question_count || 0),
    questionCount: Number(row.question_count || 0),
    content: parseJsonField(row.content, null),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

function baseListQuery(db = knex) {
  return db(`${TABLE} as r`)
    .select(
      'r.id',
      'r.creator_id',
      'r.name',
      'r.description',
      'r.content',
      'r.created_at',
      'r.updated_at'
    )
    .count({ question_count: 'q.id' })
    .leftJoin(`${QUESTION_TABLE} as q`, 'q.repo_id', 'r.id')
    .groupBy('r.id', 'r.creator_id', 'r.name', 'r.description', 'r.content', 'r.created_at', 'r.updated_at')
}

function applyCreatorScope(query, filters = {}, column = 'r.creator_id') {
  const creatorId = filters.creator_id == null ? undefined : Number(filters.creator_id)
  if (creatorId !== undefined) {
    query = query.andWhere(column, creatorId)
  }
  return query
}

function normalizeRepoMatches(item, filters = {}) {
  const keyword = String(filters.keyword || '').trim().toLowerCase()
  const category = String(filters.category || '').trim().toLowerCase()
  const repoType = String(filters.repoType || '').trim().toLowerCase()
  const creatorId = filters.creator_id == null ? undefined : Number(filters.creator_id)
  const content = item?.content && typeof item.content === 'object' ? item.content : {}
  const tags = Array.isArray(content.tags) ? content.tags.map(tag => String(tag).toLowerCase()) : []

  if (keyword) {
    const haystack = [
      item?.name,
      item?.description,
      content.category,
      content.repoType,
      ...tags
    ]
      .map(value => String(value || '').toLowerCase())
      .join(' ')

    if (!haystack.includes(keyword)) return false
  }

  if (creatorId !== undefined && Number(item?.creator_id ?? item?.creatorId ?? 0) !== creatorId) return false
  if (category && String(content.category || '').trim().toLowerCase() !== category) return false
  if (repoType && String(content.repoType || '').trim().toLowerCase() !== repoType) return false
  return true
}

const QuestionBankRepo = {
  async findById(id, options = {}) {
    const db = getDb(options)
    const row = await applyCreatorScope(
      baseListQuery(db).where('r.id', id),
      options
    ).first()
    return toDto(row)
  },

  async list(options = {}) {
    const db = getDb(options)
    const rows = await applyCreatorScope(baseListQuery(db), options).orderBy('r.id', 'asc')
    return rows
      .map(toDto)
      .filter(item => normalizeRepoMatches(item, options))
  },

  async create({ creator_id = null, name, description = null, content = null }, options = {}) {
    const db = getDb(options)
    const [id] = await db(TABLE).insert({
      creator_id,
      name,
      description,
      content: content ? JSON.stringify(content) : null,
      updated_at: db.fn.now()
    })
    return QuestionBankRepo.findById(id, options)
  },

  async update(id, fields, options = {}) {
    const db = getDb(options)
    const data = {}
    if (fields.name !== undefined) data.name = fields.name
    if (fields.description !== undefined) data.description = fields.description
    if (fields.content !== undefined) data.content = fields.content ? JSON.stringify(fields.content) : null
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
