import pg from "pg"
import 'dotenv/config'

// Sanitize DATABASE_URL in case it's wrapped in quotes in the env file
const rawConnectionString = process.env.DATABASE_URL || null
const connectionString = rawConnectionString ? rawConnectionString.replace(/^['"]|['"]$/g, '') : null
const isRender = !!process.env.RENDER || !!process.env.RENDER_SERVICE_ID
const isProduction = process.env.NODE_ENV === 'production' || isRender

// Use SSL when a remote connection string is provided (Neon via Render).
const ssl = connectionString ? { rejectUnauthorized: false } : false

const poolConfig = connectionString
  ? {
      connectionString,
      ssl,
      max: Number(process.env.DB_MAX_CLIENTS) || 10,
      idleTimeoutMillis: Number(process.env.DB_IDLE_TIMEOUT_MS) || 30000,
      connectionTimeoutMillis: Number(process.env.DB_CONN_TIMEOUT_MS) || 15000
    }
  : {
      user: process.env.DB_USER || "postgres",
      host: process.env.DB_HOST || "localhost",
      
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || "Observatory",
      port: Number(process.env.DB_PORT) || 5432
    }

export const pool = new pg.Pool(poolConfig)

// Helper: determine target host for clearer error messages
function getTargetHost() {
  if (connectionString) {
    try {
      const url = new URL(connectionString)
      return url.hostname || null
    } catch (e) {
      return null
    }
  }
  return poolConfig.host || null
}


pool.on('error', (err) => {
  
  if (err && (err.code === 'ENOTFOUND' || err.errno === -3008)) {
    const host = getTargetHost()
    console.error(`Database host not found${host ? `: ${host}` : ''}. Check your DATABASE_URL or DB_HOST environment variable.`)
    console.error('Error details:', err.message || err)
    return
  }
  
  console.error('Unexpected database error:', err && (err.message || err))
})


if (!isProduction && process.env.DB_CHECK_ON_START === 'true') {
  pool.connect()
    .then(client => client.release())
    .catch(err => {
      
      if (err && (err.code === 'ENOTFOUND' || err.errno === -3008)) {
        const host = getTargetHost()
        console.error(`Dev DB connection failed - host not found${host ? `: ${host}` : ''}. Check .env and environment variables.`)
      } else {
        console.error('Dev DB connection warning:', err && (err.message || err))
      }
    })
}



