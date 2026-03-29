import knex from '../db/knex.js'

const TABLE = 'flows'

function getDb(options = {}) {
  return options.db || knex
}

const Flow = {
  async findById(id, options = {}) {
    const db = getDb(options)
    return db(TABLE).where('id', id).first()
  },

  async list(options = {}) {
    const db = getDb(options)
    return db(TABLE).orderBy('id', 'asc')
  },

  async create({ name, status = 'draft', description = null }, options = {}) {
    const db = getDb(options)
    const [id] = await db(TABLE).insert({
      name,
      status,
      description,
      updated_at: db.fn.now()
    })
    return Flow.findById(id, options)
  },

  async update(id, fields, options = {}) {
    const db = getDb(options)
    const data = {}
    if (fields.name !== undefined) data.name = fields.name
    if (fields.status !== undefined) data.status = fields.status
    if (fields.description !== undefined) data.description = fields.description
    data.updated_at = db.fn.now()
    await db(TABLE).where('id', id).update(data)
    return Flow.findById(id, options)
  },

  async delete(id, options = {}) {
    const db = getDb(options)
    return db(TABLE).where('id', id).del()
  }
}

export default Flow
