import Folder from '../models/Folder.js'

const folderRepository = {
  async findById(id, creatorId, options = {}) {
    return Folder.findById(id, creatorId, options)
  },

  async list(payload = {}, options = {}) {
    return Folder.list(payload, options)
  },

  async create(payload, options = {}) {
    return Folder.create(payload, options)
  },

  async update(id, creatorId, fields, options = {}) {
    return Folder.update(id, creatorId, fields, options)
  },

  async delete(id, creatorId, options = {}) {
    return Folder.delete(id, creatorId, options)
  },

  async countChildren(id, creatorId, options = {}) {
    return Folder.countChildren(id, creatorId, options)
  },

  async moveSurveysToRoot(id, creatorId, options = {}) {
    return Folder.moveSurveysToRoot(id, creatorId, options)
  }
}

export default folderRepository
