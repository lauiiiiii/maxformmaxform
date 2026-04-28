import Flow from '../models/Flow.js'

const flowRepository = {
  async findById(id, options = {}) {
    return Flow.findById(id, options)
  },

  async list(options = {}) {
    return Flow.list(options)
  },

  async create(payload, options = {}) {
    return Flow.create(payload, options)
  },

  async update(id, fields, options = {}) {
    return Flow.update(id, fields, options)
  },

  async delete(id, options = {}) {
    return Flow.delete(id, options)
  }
}

export default flowRepository
