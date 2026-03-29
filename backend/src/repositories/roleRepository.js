import Role from '../models/Role.js'

const roleRepository = {
  async findById(id, options = {}) {
    return Role.findById(id, options)
  },

  async findByCode(code, options = {}) {
    return Role.findByCode(code, options)
  },

  async create(payload, options = {}) {
    return Role.create(payload, options)
  },

  async update(id, fields, options = {}) {
    return Role.update(id, fields, options)
  },

  async delete(id, options = {}) {
    return Role.delete(id, options)
  },

  async list(options = {}) {
    return Role.list(options)
  }
}

export default roleRepository
