import app from './app.js'
import config from './src/config/index.js'
import knex from './src/db/knex.js'
import { migrate, seed } from './src/db/migrate.js'

async function start() {
  try {
    await knex.raw('SELECT 1')
    console.log('MySQL connected')
  } catch (e) {
    console.error('MySQL connection failed:', e.message)
    process.exit(1)
  }

  await migrate()
  await seed()

  const server = app.listen(config.port, () => {
    console.log(`Server running: http://127.0.0.1:${config.port}`)
  })

  const shutdown = async (signal) => {
    console.log(`\n${signal} received, shutting down...`)
    server.close(async () => {
      await knex.destroy()
      console.log('Database connections closed')
      process.exit(0)
    })
    setTimeout(() => process.exit(1), 5000)
  }
  process.on('SIGINT', () => shutdown('SIGINT'))
  process.on('SIGTERM', () => shutdown('SIGTERM'))
}

start()
