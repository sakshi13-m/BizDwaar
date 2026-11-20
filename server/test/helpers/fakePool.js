// In-memory stand-in for the mysql2 pool, covering exactly the SQL shapes used by
// server/models/*.js. Lets the real routes and models run in tests without MySQL.
// It is deliberately strict: an unrecognised statement throws, so a model change
// that this fake does not understand fails loudly instead of passing silently.

const JSON_COLUMNS = new Set([
  'owner_input', 'ai_draft', 'approved_profile', 'approved_catalogue',
  'published_profile', 'published_catalogue'
])

const DEFAULTS = {
  businesses: () => ({
    category: null, location: null, status: 'draft', published_at: null,
    owner_session_hash: null, published_profile: null, published_catalogue: null
  }),
  enquiries: () => ({
    customer_email: null, customer_phone: null, product_name: null, status: 'new',
    notification_status: 'pending', notification_attempted_at: null
  })
}

// Mimic mysql2: JSON columns come back parsed, everything else as stored
function toRow(stored) {
  const row = {}
  for (const [k, v] of Object.entries(stored)) {
    row[k] = JSON_COLUMNS.has(k) && typeof v === 'string' ? JSON.parse(v) : v
  }
  return row
}

function parseConditions(where, params) {
  // "a = ? AND b = ?" or "1=1 AND a = ?"
  const conds = []
  for (const part of where.split(/\s+AND\s+/i)) {
    const p = part.trim()
    if (p === '1=1') continue
    let m = p.match(/^(\w+)\s*=\s*\?$/)
    if (m) { const col = m[1], value = params.shift(); conds.push(r => r[col] === value); continue }
    m = p.match(/^(\w+)\s+IN\s*\(([?,\s]+)\)$/i)
    if (m) {
      const n = m[2].split(',').length
      const values = params.splice(0, n)
      conds.push(r => values.includes(r[m[1]]))
      continue
    }
    throw new Error(`fakePool: unsupported condition "${p}"`)
  }
  return r => conds.every(c => c(r))
}

export function createFakePool() {
  const tables = { businesses: [], enquiries: [] }
  let tick = 0
  const now = () => new Date(Date.UTC(2026, 10, 20, 0, 0, tick++)) // strictly increasing

  async function execute(sqlIn, paramsIn = []) {
    const sql = sqlIn.replace(/\s+/g, ' ').trim()
    const params = [...paramsIn]
    let m

    if ((m = sql.match(/^INSERT INTO (\w+) \(([^)]+)\) VALUES/i))) {
      const table = m[1]
      const cols = m[2].split(',').map(c => c.trim())
      const t = now()
      const row = { ...DEFAULTS[table](), created_at: t, updated_at: t }
      cols.forEach((c, i) => { row[c] = params[i] })
      if (table === 'businesses' && tables.businesses.some(b => b.slug === row.slug)) {
        const err = new Error(`Duplicate entry '${row.slug}' for key 'slug'`)
        err.code = 'ER_DUP_ENTRY'
        throw err
      }
      tables[table].push(row)
      return [{ affectedRows: 1 }]
    }

    if ((m = sql.match(/^UPDATE (\w+) SET (.+) WHERE (.+)$/i))) {
      const [, table, setPart, where] = m
      const sets = setPart.split(',').map(s => s.trim().match(/^(\w+)\s*=\s*\?$/))
      if (sets.some(s => !s)) throw new Error(`fakePool: unsupported SET "${setPart}"`)
      const values = params.splice(0, sets.length)
      const match = parseConditions(where, params)
      let n = 0
      for (const row of tables[table]) {
        if (!match(row)) continue
        sets.forEach((s, i) => { row[s[1]] = values[i] instanceof Date ? values[i] : values[i] })
        row.updated_at = now()
        n++
      }
      return [{ affectedRows: n }]
    }

    if ((m = sql.match(/^DELETE FROM (\w+) WHERE (.+)$/i))) {
      const [, table, where] = m
      const match = parseConditions(where, params)
      const before = tables[table].length
      tables[table] = tables[table].filter(r => !match(r))
      return [{ affectedRows: before - tables[table].length }]
    }

    if ((m = sql.match(/^SELECT (.+?) FROM (\w+) WHERE (.+?)(?: ORDER BY (\w+) (ASC|DESC))?(?: LIMIT (\?|\d+))?$/i))) {
      const [, cols, table, where, orderCol, orderDir, limit] = m
      const match = parseConditions(where, params)
      let rows = tables[table].filter(match)
      if (orderCol) {
        rows = [...rows].sort((a, b) => (a[orderCol] - b[orderCol]) * (orderDir.toUpperCase() === 'DESC' ? -1 : 1))
      }
      if (limit) rows = rows.slice(0, Number(limit === '?' ? params.shift() : limit))
      let out = rows.map(toRow)
      if (cols.trim() !== '*') {
        const pick = cols.split(',').map(c => c.trim())
        out = out.map(r => Object.fromEntries(pick.map(c => [c, r[c]])))
      }
      return [out]
    }

    throw new Error(`fakePool: unsupported SQL "${sql}"`)
  }

  return {
    tables,
    execute,
    query: execute,
    async getConnection() { return { release() {} } },
    async end() {}
  }
}
