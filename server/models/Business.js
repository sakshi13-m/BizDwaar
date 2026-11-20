import { randomUUID } from 'crypto'
import { getPool } from '../db.js'

// Row → JS object
function deserialise(row) {
  if (!row) return null
  return {
    _id:              row.id,
    id:               row.id,
    name:             row.name,
    slug:             row.slug,
    category:         row.category,
    location:         row.location,
    ownerInput:       typeof row.owner_input      === 'string' ? JSON.parse(row.owner_input)      : row.owner_input,
    aiDraft:          typeof row.ai_draft          === 'string' ? JSON.parse(row.ai_draft)          : row.ai_draft,
    approvedProfile:  typeof row.approved_profile  === 'string' ? JSON.parse(row.approved_profile)  : row.approved_profile,
    approvedCatalogue:typeof row.approved_catalogue=== 'string' ? JSON.parse(row.approved_catalogue): row.approved_catalogue,
    status:           row.status,
    // Internal only — strip with toOwnerView() / public allowlist before responding
    ownerSessionHash: row.owner_session_hash || null,
    publishedAt:      row.published_at,
    createdAt:        row.created_at,
    updatedAt:        row.updated_at,
  }
}

const Business = {
  async findOne({ slug, status } = {}) {
    const db = getPool()
    let sql = 'SELECT * FROM businesses WHERE 1=1'
    const params = []
    if (slug   !== undefined) { sql += ' AND slug = ?';   params.push(slug) }
    if (status !== undefined) { sql += ' AND status = ?'; params.push(status) }
    sql += ' LIMIT 1'
    const [rows] = await db.execute(sql, params)
    return deserialise(rows[0])
  },

  async findById(id) {
    const db = getPool()
    const [rows] = await db.execute('SELECT * FROM businesses WHERE id = ? LIMIT 1', [id])
    return deserialise(rows[0])
  },

  // Lightweight list of businesses owned by an anonymous owner session
  async findByOwnerSessionHash(hash, limit = 50) {
    if (!hash) return []
    const db = getPool()
    const [rows] = await db.query(
      `SELECT id, name, slug, status, published_at, created_at, updated_at
         FROM businesses
        WHERE owner_session_hash = ?
        ORDER BY updated_at DESC
        LIMIT ?`,
      [hash, Number(limit)]
    )
    return rows.map(r => ({
      id:          r.id,
      name:        r.name,
      slug:        r.slug,
      status:      r.status,
      publishedAt: r.published_at,
      createdAt:   r.created_at,
      updatedAt:   r.updated_at
    }))
  },

  async create(data) {
    const db = getPool()
    const id = randomUUID()
    await db.execute(
      `INSERT INTO businesses
        (id, name, slug, category, location, owner_input, ai_draft, approved_profile, approved_catalogue, status, owner_session_hash)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.name,
        data.slug,
        data.category || null,
        data.location || null,
        JSON.stringify(data.ownerInput   || {}),
        JSON.stringify(data.aiDraft      || {}),
        JSON.stringify(data.approvedProfile   || {}),
        JSON.stringify(data.approvedCatalogue || []),
        data.status || 'draft',
        data.ownerSessionHash || null,
      ]
    )
    return Business.findById(id)
  },

  async findByIdAndUpdate(id, { $set } = {}, { new: returnNew } = {}) {
    const db = getPool()
    const fields = []
    const params = []

    if ($set.approvedProfile !== undefined) {
      fields.push('approved_profile = ?')
      params.push(JSON.stringify($set.approvedProfile))
    }
    if ($set.approvedCatalogue !== undefined) {
      fields.push('approved_catalogue = ?')
      params.push(JSON.stringify($set.approvedCatalogue))
    }
    if ($set.status !== undefined) {
      fields.push('status = ?')
      params.push($set.status)
    }
    if ($set.publishedAt !== undefined) {
      fields.push('published_at = ?')
      params.push($set.publishedAt)
    }

    if (fields.length === 0) return Business.findById(id)

    params.push(id)
    await db.execute(`UPDATE businesses SET ${fields.join(', ')} WHERE id = ?`, params)
    return returnNew ? Business.findById(id) : null
  },

  // Used in publish route — save() pattern
  async _save(obj) {
    return Business.findByIdAndUpdate(
      obj.id || obj._id,
      { $set: {
          status:      obj.status,
          publishedAt: obj.publishedAt,
          approvedProfile:   obj.approvedProfile,
          approvedCatalogue: obj.approvedCatalogue,
      }},
      { new: true }
    )
  },

  // Test-cleanup helpers (used by server/scripts). Delete one business by id or slug.
  // Requires an exact id/slug — never deletes without a filter.
  async deleteOne({ _id, id, slug } = {}) {
    const db = getPool()
    const key = _id || id
    if (key) {
      await db.execute('DELETE FROM businesses WHERE id = ?', [key])
    } else if (slug) {
      await db.execute('DELETE FROM businesses WHERE slug = ?', [slug])
    }
  },

  // Supports { slug: { $in: [...] } } only
  async deleteMany({ slug } = {}) {
    const slugs = slug?.$in
    if (!Array.isArray(slugs) || slugs.length === 0) return
    const db = getPool()
    await db.execute(`DELETE FROM businesses WHERE slug IN (${slugs.map(() => '?').join(',')})`, slugs)
  }
}

// Owner-facing representation — never includes the session hash
export function toOwnerView(business) {
  if (!business) return null
  const { ownerSessionHash, ...rest } = business
  return rest
}

export default Business
