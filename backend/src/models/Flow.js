import knex from '../db/knex.js'

const TABLE = 'flows'

const Flow = {
  async findById(id) {
    return knex(TABLE).where('id', id).first()
  },

  async list() {
    return knex(TABLE).orderBy('id', 'asc')
  },

  async create({ name, status = 'draft', description = null }) {
    const [id] = await knex(TABLE).insert({
      name,
      status,
      description,
      updated_at: knex.fn.now()
    })
    return Flow.findById(id)
  },

  async update(id, fields) {
    const data = {}
    if (fields.name !== undefined) data.name = fields.name
    if (fields.status !== undefined) data.status = fields.status
    if (fields.description !== undefined) data.description = fields.description
    data.updated_at = knex.fn.now()
    await knex(TABLE).where('id', id).update(data)
    return Flow.findById(id)
  },

  async delete(id) {
    return knex(TABLE).where('id', id).del()
  }
}

export default Flow
