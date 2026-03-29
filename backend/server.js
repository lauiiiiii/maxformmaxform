import app from './app.js'
import config from './src/config/index.js'
import knex from './src/db/knex.js'

async function start() {
  try {
    await knex.raw('SELECT 1')
    console.log('MySQL connected')
  } catch (e) {
    console.error('MySQL connection failed:', e.message)
    process.exit(1)
  }

  const requestedPort = config.port
  const server = app.listen(requestedPort, () => {
    const address = server.address()
    const actualPort = typeof address === 'object' && address ? address.port : requestedPort
    console.log(`Server running: http://127.0.0.1:${actualPort}`)
  })

  server.on('error', error => {
    console.error('Server failed to start:', error)
    process.exit(1)
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
