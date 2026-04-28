import knex from '../db/knex.js'

const TABLE = 'folders'
const SURVEY_TABLE = 'surveys'

function getDb(options = {}) {
  return options.db || knex
}

function toDto(row) {
  if (!row) return null
  return {
    ...row,
    parentId: row.parent_id ?? null,
    surveyCount: Number(row.survey_count || 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

const Folder = {
  async findById(id, creator_id, options = {}) {
    const db = getDb(options)
    let q = db(TABLE).where('id', id)
    if (creator_id !== undefined) q = q.andWhere('creator_id', creator_id)
    const row = await q.first()
    return toDto(row)
  },

  async list({ creator_id, parent_id } = {}, options = {}) {
    const db = getDb(options)
    let q = db(`${TABLE} as f`)
      .select(
        'f.id',
        'f.creator_id',
        'f.name',
        'f.parent_id',
        'f.sort_order',
        'f.created_at',
        'f.updated_at'
      )
      .count({ survey_count: 's.id' })
      .leftJoin(`${SURVEY_TABLE} as s`, function joinSurveys() {
        this.on('s.folder_id', '=', 'f.id').andOn(db.raw('?? is null', ['s.deleted_at']))
      })
      .groupBy('f.id', 'f.creator_id', 'f.name', 'f.parent_id', 'f.sort_order', 'f.created_at', 'f.updated_at')
      .orderBy('f.sort_order', 'asc')
      .orderBy('f.id', 'asc')

    if (creator_id !== undefined) q = q.where('f.creator_id', creator_id)
    if (parent_id === null) q = q.whereNull('f.parent_id')
    else if (parent_id !== undefined) q = q.where('f.parent_id', parent_id)

    const rows = await q
    return rows.map(toDto)
  },

  async create({ creator_id, name, parent_id = null, sort_order = 0 }, options = {}) {
    const db = getDb(options)
    const [id] = await db(TABLE).insert({
      creator_id,
      name,
      parent_id,
      sort_order,
      updated_at: db.fn.now()
    })
    return Folder.findById(id, creator_id, options)
  },

  async update(id, creator_id, fields, options = {}) {
    const db = getDb(options)
    const data = {}
    if (fields.name !== undefined) data.name = fields.name
    if (fields.parent_id !== undefined) data.parent_id = fields.parent_id
    if (fields.sort_order !== undefined) data.sort_order = fields.sort_order
    data.updated_at = db.fn.now()
    await db(TABLE).where({ id, creator_id }).update(data)
    return Folder.findById(id, creator_id, options)
  },

  async delete(id, creator_id, options = {}) {
    const db = getDb(options)
    return db(TABLE).where({ id, creator_id }).del()
  },

  async countChildren(id, creator_id, options = {}) {
    const db = getDb(options)
    const row = await db(TABLE)
      .where('parent_id', id)
      .andWhere('creator_id', creator_id)
      .count('* as cnt')
      .first()
    return Number(row?.cnt || 0)
  },

  async moveSurveysToRoot(id, creator_id, options = {}) {
    const db = getDb(options)
    return db(SURVEY_TABLE)
      .where({ folder_id: id, creator_id })
      .whereNull('deleted_at')
      .update({ folder_id: null, updated_at: db.fn.now() })
  }
}

export default Folder
