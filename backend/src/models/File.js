import knex from '../db/knex.js'

const TABLE = 'files'

const File = {
  async findById(id) {
    return knex(TABLE).where('id', id).first()
  },

  async create({ name, url, size, type, uploader_id }) {
    const [id] = await knex(TABLE).insert({ name, url, size, type, uploader_id })
    return File.findById(id)
  },

  async delete(id) {
    return knex(TABLE).where('id', id).del()
  },

  async list({ page = 1, pageSize = 20, uploader_id } = {}) {
    let q = knex(TABLE)
    if (uploader_id) q = q.where('uploader_id', uploader_id)
    const total = await q.clone().count('* as cnt').first().then(r => r.cnt)
    const list = await q.orderBy('created_at', 'desc').limit(pageSize).offset((page - 1) * pageSize)
    return { total, list }
  }
}

export default File
