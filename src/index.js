import 'dotenv/config'
import app from './app.js'
import { PORT } from './config.js'
import { pool } from './db.js'

const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})

const shutdown = async (signal) => {
  console.log(`${signal} received - shutting down gracefully`)
  server.close(async () => {
    await pool.end()
    console.log('Database pool closed. Process exit.')
    process.exit(0)
  })
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT',  () => shutdown('SIGINT'))
