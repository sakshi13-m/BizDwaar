import { config } from 'dotenv'
import { fileURLToPath } from 'url'
import path from 'path'

// Resolve __dirname and load .env from repo root (works regardless of cwd).
// Must run before the app modules are imported, because services read env at import time.
const __dirname = path.dirname(fileURLToPath(import.meta.url))
config({ path: path.resolve(__dirname, '..', '.env') })

const { createApp } = await import('./app.js')
const { connectDB } = await import('./db.js')
const { adminTokenStatus } = await import('./middleware/ownerAuth.js')

const app = createApp()
const PORT = process.env.PORT || 3000

const admin = adminTokenStatus()
if (admin === 'weak') {
  console.warn('OWNER_ADMIN_TOKEN is shorter than 32 characters — admin fallback is disabled until it is rotated.')
}

// Start server first so the platform health check passes, then connect DB
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Bizdwaar server running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`)
})

// Keep retrying the database with backoff instead of giving up after one retry
async function connectWithRetry(attempt = 1) {
  try {
    await connectDB()
  } catch (err) {
    const delay = Math.min(60_000, 5_000 * attempt)
    console.error(`Failed to connect to MySQL (attempt ${attempt}): ${err.message} — retrying in ${delay / 1000}s`)
    setTimeout(() => connectWithRetry(attempt + 1), delay)
  }
}
connectWithRetry()

export default app
