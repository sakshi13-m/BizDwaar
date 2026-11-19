import { config } from 'dotenv'
import { fileURLToPath } from 'url'
import path from 'path'

// Resolve __dirname and load .env from repo root (works regardless of cwd)
const __dirname = path.dirname(fileURLToPath(import.meta.url))
config({ path: path.resolve(__dirname, '..', '.env') })

import express from 'express'
import cookieParser from 'cookie-parser'
import { connectDB } from './db.js'
import aiRouter from './routes/ai.js'
import ownerRouter from './routes/owner.js'
import publicRouter from './routes/public.js'
import enquiryRouter from './routes/enquiry.js'

const app = express()
const PORT = process.env.PORT || 3000

// Trust proxy — 0 locally; set verified hop count in production
const trustProxyHops = Number(process.env.TRUST_PROXY_HOPS ?? 0)
app.set('trust proxy', trustProxyHops)

// Body parsing
app.use(express.json({ limit: '100kb' }))
app.use(express.urlencoded({ extended: true, limit: '100kb' }))
app.use(cookieParser())

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// API routes
app.use('/api/ai', aiRouter)
app.use('/api/owner', ownerRouter)
app.use('/api/businesses', publicRouter) // Public GET /api/businesses/:slug
app.use('/api/enquiries', enquiryRouter)  // Public POST /api/enquiries

// Serve React build when dist/ exists (production and GoDaddy hosting)
import { existsSync } from 'fs'
const distDir = path.resolve(__dirname, '..', 'dist')
if (existsSync(distDir)) {
  app.use(express.static(distDir))
  app.get('*', (req, res) => {
    res.sendFile(path.join(distDir, 'index.html'))
  })
}

// Start server first so the platform health check passes, then connect DB
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Bizdwaar server running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`)
})

connectDB()
  .catch((err) => {
    console.error('Failed to connect to MySQL:', err.message)
    setTimeout(() => connectDB().catch(e => console.error('DB retry failed:', e.message)), 5000)
  })

export default app
