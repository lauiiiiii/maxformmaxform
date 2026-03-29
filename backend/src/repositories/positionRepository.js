import Position from '../models/Position.js'

const positionRepository = {
  async findById(id, options = {}) {
    return Position.findById(id, options)
  },

  async findByCode(code, options = {}) {
    return Position.findByCode(code, options)
  },

  async list(options = {}) {
    return Position.list(options)
  },

  async create(payload, options = {}) {
    return Position.create(payload, options)
  },

  async update(id, fields, options = {}) {
    return Position.update(id, fields, options)
  },

  async delete(id, options = {}) {
    return Position.delete(id, options)
  }
}

export default positionRepository
