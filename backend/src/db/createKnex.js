import Knex from 'knex'

export function createMysqlKnex({
  host,
  port,
  user,
  password,
  database,
  pool = { min: 2, max: 10 },
  ...connectionOverrides
} = {}) {
  return Knex({
    client: 'mysql2',
    connection: {
      host,
      port,
      user,
      password,
      database,
      charset: 'utf8mb4',
      timezone: '+08:00',
      ...connectionOverrides
    },
    pool,
    acquireConnectionTimeout: 10000
  })
}
