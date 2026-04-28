import User from '../models/User.js'

const userRepository = {
  async findById(id, options = {}) {
    return User.findById(id, options)
  },

  async findByUsername(username, options = {}) {
    return User.findByUsername(username, options)
  },

  async findByEmail(email, options = {}) {
    return User.findByEmail(email, options)
  },

  async findByIdentity(identity, options = {}) {
    if (/^\d+$/.test(String(identity))) {
      const user = await User.findById(identity, options)
      if (user) return user
    }

    return User.findByUsername(String(identity), options)
  },

  async create(payload, options = {}) {
    return User.create(payload, options)
  },

  async update(id, fields, options = {}) {
    return User.update(id, fields, options)
  },

  async updatePassword(id, password, options = {}) {
    return User.updatePassword(id, password, options)
  },

  async updateLastLogin(id, options = {}) {
    return User.updateLastLogin(id, options)
  },

  async verifyPassword(plaintext, hashed) {
    return User.verifyPassword(plaintext, hashed)
  },

  async list(payload = {}, options = {}) {
    return User.list(payload, options)
  },

  async delete(id, options = {}) {
    return User.delete(id, options)
  },

  toSafe(user) {
    return User.toSafe(user)
  }
}

export default userRepository
