import knex from './knex.js'

const transactionManager = {
  async run(callback, options = {}) {
    if (options?.db) {
      return callback(options.db)
    }
    return knex.transaction(async trx => callback(trx))
  }
}

export default transactionManager
