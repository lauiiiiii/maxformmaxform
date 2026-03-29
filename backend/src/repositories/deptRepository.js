import Dept from '../models/Dept.js'

const deptRepository = {
  async findById(id, options = {}) {
    return Dept.findById(id, options)
  },

  async create(payload, options = {}) {
    return Dept.create(payload, options)
  },

  async update(id, fields, options = {}) {
    return Dept.update(id, fields, options)
  },

  async delete(id, options = {}) {
    return Dept.delete(id, options)
  },

  async countChildren(id, options = {}) {
    return Dept.countChildren(id, options)
  },

  async countUsers(id, options = {}) {
    return Dept.countUsers(id, options)
  },

  async clearUsersDept(id, options = {}) {
    return Dept.clearUsersDept(id, options)
  },

  async list(options = {}) {
    return Dept.list(options)
  },

  async tree(options = {}) {
    return Dept.tree(options)
  }
}

export default deptRepository
