import knex from './knex.js'

export default function getDb(options = {}) {
  return options.db || knex
}
