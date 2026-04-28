import knex from '../db/knex.js'

const TABLE = 'roles'

function getDb(options = {}) {
  return options.db || knex
}

function parseJson(row) {
  if (!row) return null
  if (typeof row.permissions === 'string') row.permissions = JSON.parse(row.permissions)
  return row
}

const Role = {
  async findById(id, options = {}) {
    const db = getDb(options)
    const row = await db(TABLE).where('id', id).first()
    return parseJson(row)
  },

  async findByCode(code, options = {}) {
    const db = getDb(options)
    const row = await db(TABLE).where('code', code).first()
    return parseJson(row)
  },

  async create({ name, code, permissions, remark }, options = {}) {
    const db = getDb(options)
    const [id] = await db(TABLE).insert({
      name, code,
      permissions: permissions ? JSON.stringify(permissions) : null,
      remark
    })
    return Role.findById(id, options)
  },

  async update(id, fields, options = {}) {
    const db = getDb(options)
    const data = {}
    if (fields.name !== undefined) data.name = fields.name
    if (fields.permissions !== undefined) data.permissions = JSON.stringify(fields.permissions)
    if (fields.remark !== undefined) data.remark = fields.remark
    await db(TABLE).where('id', id).update(data)
    return Role.findById(id, options)
  },

  async delete(id, options = {}) {
    const db = getDb(options)
    return db(TABLE).where('id', id).del()
  },

  async list(options = {}) {
    const db = getDb(options)
    const rows = await db(TABLE).orderBy('id', 'asc')
    return rows.map(parseJson)
  }
}

export default Role
