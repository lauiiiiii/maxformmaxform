import knex from '../db/knex.js'

const TABLE = 'positions'

function getDb(options = {}) {
  return options.db || knex
}

const Position = {
  async findById(id, options = {}) {
    const db = getDb(options)
    return db(TABLE).where('id', id).first()
  },

  async findByCode(code, options = {}) {
    if (!code) return null
    const db = getDb(options)
    return db(TABLE).where('code', code).first()
  },

  async list(options = {}) {
    const db = getDb(options)
    return db(TABLE).orderBy('id', 'asc')
  },

  async create({ name, code = null, is_virtual = false, remark = null }, options = {}) {
    const db = getDb(options)
    const [id] = await db(TABLE).insert({
      name,
      code,
      is_virtual,
      remark
    })
    return Position.findById(id, options)
  },

  async update(id, fields, options = {}) {
    const db = getDb(options)
    const data = {}
    for (const key of ['name', 'code', 'is_virtual', 'remark']) {
      if (fields[key] !== undefined) data[key] = fields[key]
    }
    data.updated_at = db.fn.now()
    await db(TABLE).where('id', id).update(data)
    return Position.findById(id, options)
  },

  async delete(id, options = {}) {
    const db = getDb(options)
    return db(TABLE).where('id', id).del()
  }
}

export default Position
