import Knex from 'knex'
import config from '../config/index.js'

const knex = Knex({
  client: 'mysql2',
  connection: {
    host: config.db.host,
    port: config.db.port,
    user: config.db.user,
    password: config.db.password,
    database: config.db.database,
    charset: 'utf8mb4',
    timezone: '+08:00'
  },
  pool: { min: 2, max: 10 },
  acquireConnectionTimeout: 10000
})

export default knex
