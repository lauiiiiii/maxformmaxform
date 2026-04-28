import knex from '../db/knex.js'

const TABLE = 'depts'
const USER_TABLE = 'users'

function getDb(options = {}) {
  return options.db || knex
}

const Dept = {
  async findById(id, options = {}) {
    const db = getDb(options)
    return db(TABLE).where('id', id).first()
  },

  async create({ name, parent_id, sort_order = 0 }, options = {}) {
    const db = getDb(options)
    const [id] = await db(TABLE).insert({ name, parent_id, sort_order })
    return Dept.findById(id, options)
  },

  async update(id, fields, options = {}) {
    const db = getDb(options)
    const data = {}
    if (fields.name !== undefined) data.name = fields.name
    if (fields.parent_id !== undefined) data.parent_id = fields.parent_id
    if (fields.sort_order !== undefined) data.sort_order = fields.sort_order
    await db(TABLE).where('id', id).update(data)
    return Dept.findById(id, options)
  },

  async delete(id, options = {}) {
    const db = getDb(options)
    return db(TABLE).where('id', id).del()
  },

  async countChildren(id, options = {}) {
    const db = getDb(options)
    const row = await db(TABLE).where('parent_id', id).count('* as cnt').first()
    return Number(row?.cnt || 0)
  },

  async countUsers(id, options = {}) {
    const db = getDb(options)
    const row = await db(USER_TABLE).where('dept_id', id).count('* as cnt').first()
    return Number(row?.cnt || 0)
  },

  async clearUsersDept(id, options = {}) {
    const db = getDb(options)
    await db(USER_TABLE).where('dept_id', id).update({ dept_id: null, updated_at: db.fn.now() })
  },

  async list(options = {}) {
    const db = getDb(options)
    return db(TABLE).orderBy('sort_order', 'asc').orderBy('id', 'asc')
  },

  async tree(options = {}) {
    const all = await Dept.list(options)
    const map = new Map()
    all.forEach(d => map.set(d.id, { ...d, children: [] }))
    const roots = []
    for (const node of map.values()) {
      if (node.parent_id && map.has(node.parent_id)) {
        map.get(node.parent_id).children.push(node)
      } else {
        roots.push(node)
      }
    }
    return roots
  }
}

export default Dept
