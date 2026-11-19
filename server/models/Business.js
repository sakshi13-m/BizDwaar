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

  async create(data) {
    const db = getPool()
    const id = randomUUID()
    await db.execute(
      `INSERT INTO businesses
        (id, name, slug, category, location, owner_input, ai_draft, approved_profile, approved_catalogue, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
  }
}

export default Business
