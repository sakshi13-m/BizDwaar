import { randomUUID } from 'crypto'
import { getPool } from '../db.js'

// Owner accounts (email login), their login sessions and one-time login codes.
// Queries stay simple (equality filters only); time comparisons happen in JS.

export function normaliseEmail(email) {
  return String(email || '').trim().toLowerCase()
}

const Owner = {
  async findByEmail(email) {
    const [rows] = await getPool().execute('SELECT * FROM owners WHERE email = ? LIMIT 1', [normaliseEmail(email)])
    return rows[0] ? { id: rows[0].id, email: rows[0].email } : null
  },

  async findById(id) {
    if (!id) return null
    const [rows] = await getPool().execute('SELECT * FROM owners WHERE id = ? LIMIT 1', [id])
    return rows[0] ? { id: rows[0].id, email: rows[0].email } : null
  },

  async findOrCreate(email) {
    const clean = normaliseEmail(email)
    const existing = await Owner.findByEmail(clean)
    if (existing) return existing
    const id = randomUUID()
    try {
      await getPool().execute('INSERT INTO owners (id, email, created_at) VALUES (?, ?, ?)', [id, clean, new Date()])
    } catch (err) {
      // Two simultaneous first logins for the same email: the other insert won
      if (err.code !== 'ER_DUP_ENTRY') throw err
      return Owner.findByEmail(clean)
    }
    return { id, email: clean }
  },

  async touchLogin(id) {
    await getPool().execute('UPDATE owners SET last_login_at = ? WHERE id = ?', [new Date(), id])
  },

  // For the admin list: id → email
  async emailMap(limit = 5000) {
    const [rows] = await getPool().query('SELECT id, email FROM owners WHERE 1=1 LIMIT ?', [Number(limit)])
    return new Map(rows.map(r => [r.id, r.email]))
  }
}

export const OwnerSession = {
  async create(sessionHash, ownerId, maxAgeMs) {
    const now = new Date()
    await getPool().execute(
      'INSERT INTO owner_sessions (session_hash, owner_id, created_at, expires_at) VALUES (?, ?, ?, ?)',
      [sessionHash, ownerId, now, new Date(now.getTime() + maxAgeMs)]
    )
  },

  // Returns the owner id for a live session, or null
  async ownerIdFor(sessionHash) {
    if (!sessionHash) return null
    const [rows] = await getPool().execute(
      'SELECT owner_id, expires_at FROM owner_sessions WHERE session_hash = ? LIMIT 1', [sessionHash]
    )
    const row = rows[0]
    if (!row || new Date(row.expires_at).getTime() <= Date.now()) return null
    return row.owner_id
  },

  async remove(sessionHash) {
    if (!sessionHash) return
    await getPool().execute('DELETE FROM owner_sessions WHERE session_hash = ?', [sessionHash])
  }
}

export const LoginCode = {
  async create({ email, codeHash, salt, ttlMs }) {
    const now = new Date()
    await getPool().execute(
      `INSERT INTO login_codes (id, email, code_hash, salt, attempts, expires_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [randomUUID(), normaliseEmail(email), codeHash, salt, 0, new Date(now.getTime() + ttlMs), now]
    )
  },

  // Most recent codes for an email (newest first)
  async recent(email, limit = 10) {
    const [rows] = await getPool().query(
      'SELECT * FROM login_codes WHERE email = ? ORDER BY created_at DESC LIMIT ?',
      [normaliseEmail(email), Number(limit)]
    )
    return rows
  },

  async recordFailedAttempt(id, attempts) {
    await getPool().execute('UPDATE login_codes SET attempts = ? WHERE id = ?', [attempts, id])
  },

  async consume(id) {
    await getPool().execute('UPDATE login_codes SET consumed_at = ? WHERE id = ?', [new Date(), id])
  }
}

export default Owner
