import Flow from '../models/Flow.js'

const flowRepository = {
  async findById(id) {
    return Flow.findById(id)
  },

  async list() {
    return Flow.list()
  },

  async create(payload) {
    return Flow.create(payload)
  },

  async update(id, fields) {
    return Flow.update(id, fields)
  },

  async delete(id) {
    return Flow.delete(id)
  }
}

export default flowRepository
