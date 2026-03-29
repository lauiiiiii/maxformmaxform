import knex from '../db/knex.js'
import bcrypt from 'bcryptjs'

const TABLE = 'users'

function getDb(options = {}) {
  return options.db || knex
}

const User = {
  async findById(id, options = {}) {
    const db = getDb(options)
    return db(TABLE).where('id', id).first()
  },

  async findByUsername(username, options = {}) {
    const db = getDb(options)
    return db(TABLE).where('username', username).first()
  },

  async findByEmail(email, options = {}) {
    const db = getDb(options)
    return db(TABLE).where('email', email).first()
  },

  async create({ username, email, password, role_id, dept_id, position_id }, options = {}) {
    const db = getDb(options)
    const hash = await bcrypt.hash(password, 10)
    const [id] = await db(TABLE).insert({
      username, email, password: hash, role_id, dept_id, position_id
    })
    return User.findById(id, options)
  },

  async update(id, fields, options = {}) {
    const db = getDb(options)
    const allowed = ['email', 'avatar', 'is_active', 'dept_id', 'role_id', 'position_id']
    const data = {}
    for (const k of allowed) {
      if (fields[k] !== undefined) data[k] = fields[k]
    }
    data.updated_at = db.fn.now()
    await db(TABLE).where('id', id).update(data)
    return User.findById(id, options)
  },

  async updatePassword(id, newPassword, options = {}) {
    const db = getDb(options)
    const hash = await bcrypt.hash(newPassword, 10)
    await db(TABLE).where('id', id).update({ password: hash, updated_at: db.fn.now() })
  },

  async updateLastLogin(id, options = {}) {
    const db = getDb(options)
    await db(TABLE).where('id', id).update({ last_login_at: db.fn.now() })
  },

  async verifyPassword(plaintext, hashed) {
    return bcrypt.compare(plaintext, hashed)
  },

  async list({ page = 1, pageSize = 20, dept_id, is_active } = {}, options = {}) {
    const db = getDb(options)
    let q = db(TABLE).select('id', 'username', 'email', 'role_id', 'dept_id', 'position_id', 'avatar', 'is_active', 'last_login_at', 'created_at')
    if (dept_id !== undefined) q = q.where('dept_id', dept_id)
    if (is_active !== undefined) q = q.where('is_active', is_active)
    const total = await q.clone().count('* as cnt').first().then(r => r.cnt)
    const list = await q.orderBy('created_at', 'desc').limit(pageSize).offset((page - 1) * pageSize)
    return { total, list }
  },

  async delete(id, options = {}) {
    const db = getDb(options)
    return db(TABLE).where('id', id).del()
  },

  toSafe(user) {
    if (!user) return null
    const { password, ...rest } = user
    return rest
  }
}

export default User
