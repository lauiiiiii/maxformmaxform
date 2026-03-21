import knex from '../db/knex.js'

const TABLE = 'roles'

function parseJson(row) {
  if (!row) return null
  if (typeof row.permissions === 'string') row.permissions = JSON.parse(row.permissions)
  return row
}

const Role = {
  async findById(id) {
    const row = await knex(TABLE).where('id', id).first()
    return parseJson(row)
  },

  async findByCode(code) {
    const row = await knex(TABLE).where('code', code).first()
    return parseJson(row)
  },

  async create({ name, code, permissions, remark }) {
    const [id] = await knex(TABLE).insert({
      name, code,
      permissions: permissions ? JSON.stringify(permissions) : null,
      remark
    })
    return Role.findById(id)
  },

  async update(id, fields) {
    const data = {}
    if (fields.name !== undefined) data.name = fields.name
    if (fields.permissions !== undefined) data.permissions = JSON.stringify(fields.permissions)
    if (fields.remark !== undefined) data.remark = fields.remark
    await knex(TABLE).where('id', id).update(data)
    return Role.findById(id)
  },

  async delete(id) {
    return knex(TABLE).where('id', id).del()
  },

  async list() {
    const rows = await knex(TABLE).orderBy('id', 'asc')
    return rows.map(parseJson)
  }
}

export default Role
