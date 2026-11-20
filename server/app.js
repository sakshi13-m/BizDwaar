import express from 'express'
import cookieParser from 'cookie-parser'
import path from 'path'
import { existsSync } from 'fs'
import { fileURLToPath } from 'url'
import aiRouter from './routes/ai.js'
import ownerRouter from './routes/owner.js'
import publicRouter from './routes/public.js'
import enquiryRouter from './routes/enquiry.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/**
 * Build the Express app without listening or connecting to the database,
 * so tests can mount it against an in-memory pool.
 */
export function createApp({ serveClient = true } = {}) {
  const app = express()

  // Trust proxy — 0 locally; set verified hop count in production
  const trustProxyHops = Number(process.env.TRUST_PROXY_HOPS ?? 0)
  app.set('trust proxy', trustProxyHops)
  app.disable('x-powered-by')

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

  // Unknown API routes return JSON 404 instead of the React page
  app.use('/api', (req, res) => {
    res.status(404).json({ error: 'not_found', message: 'API route not found.' })
  })

  // JSON error handler for API routes (async errors forwarded via next(err))
  app.use('/api', (err, req, res, next) => {
    if (res.headersSent) return next(err)
    // Client errors from body parsing (malformed JSON, payload too large)
    const status = Number(err.status || err.statusCode)
    if (status >= 400 && status < 500) {
      return res.status(status).json({
        error: status === 413 ? 'payload_too_large' : 'bad_request',
        message: status === 413 ? 'That request is too large.' : 'The request could not be read. Please try again.'
      })
    }
    console.error('API error:', err.message)
    res.status(500).json({ error: 'server_error', message: 'Something went wrong. Please try again.' })
  })

  // Serve React build when dist/ exists (production and GoDaddy hosting)
  const distDir = path.resolve(__dirname, '..', 'dist')
  if (serveClient && existsSync(distDir)) {
    app.use(express.static(distDir))
    app.get('*', (req, res) => {
      res.sendFile(path.join(distDir, 'index.html'))
    })
  }

  return app
}
