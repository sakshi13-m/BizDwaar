import { randomUUID } from 'crypto'
import { getPool } from '../db.js'

// mysql2 returns JSON columns as objects; tolerate strings too
const json = v => (typeof v === 'string' ? JSON.parse(v) : v ?? null)

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
    ownerInput:       json(row.owner_input),
    aiDraft:          json(row.ai_draft),
    // Owner's working copy (edited in the review screen, private)
    approvedProfile:  json(row.approved_profile),
    approvedCatalogue:json(row.approved_catalogue),
    // Snapshot taken at publish time — what customers see. NULL on rows published
    // before snapshots existed; publicSnapshot() falls back to approved_* for those.
    publishedProfile:   json(row.published_profile),
    publishedCatalogue: json(row.published_catalogue),
    status:           row.status,
    // Internal only — strip with toOwnerView() / public allowlist before responding
    ownerSessionHash: row.owner_session_hash || null,
    ownerId:          row.owner_id || null,
    publishedAt:      row.published_at,
    createdAt:        row.created_at,
    updatedAt:        row.updated_at,
  }
}

function toSummary(r) {
  return {
    id:          r.id,
    name:        r.name,
    slug:        r.slug,
    status:      r.status,
    ownerId:     r.owner_id || null,
    publishedAt: r.published_at,
    createdAt:   r.created_at,
    updatedAt:   r.updated_at
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
    const [rows] = await getPool().query(
      `SELECT id, name, slug, status, owner_id, published_at, created_at, updated_at
         FROM businesses
        WHERE owner_session_hash = ?
        ORDER BY updated_at DESC
        LIMIT ?`,
      [hash, Number(limit)]
    )
    return rows.map(toSummary)
  },

  // Businesses belonging to a logged-in owner account
  async findByOwnerId(ownerId, limit = 50) {
    if (!ownerId) return []
    const [rows] = await getPool().query(
      `SELECT id, name, slug, status, owner_id, published_at, created_at, updated_at
         FROM businesses
        WHERE owner_id = ?
        ORDER BY updated_at DESC
        LIMIT ?`,
      [ownerId, Number(limit)]
    )
    return rows.map(toSummary)
  },

  // Everything the caller can manage: their account's pages plus this browser's unclaimed pages
  async findForOwner({ ownerId, sessionHash }) {
    const [mine, browser] = await Promise.all([
      Business.findByOwnerId(ownerId),
      Business.findByOwnerSessionHash(sessionHash)
    ])
    const seen = new Set()
    return [...mine, ...browser]
      .filter(b => (seen.has(b.id) ? false : seen.add(b.id)))
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
  },

  // On login: attach pages created in this browser (and not yet owned by an account) to the owner
  async claimForOwner(sessionHash, ownerId) {
    const browser = await Business.findByOwnerSessionHash(sessionHash, 200)
    const unclaimed = browser.filter(b => !b.ownerId)
    for (const b of unclaimed) {
      await getPool().execute('UPDATE businesses SET owner_id = ? WHERE id = ?', [ownerId, b.id])
    }
    return unclaimed.length
  },

  // Admin overview of every page (hackathon scale; newest first)
  async listAll(limit = 500) {
    const [rows] = await getPool().query(
      `SELECT id, name, slug, status, owner_id, owner_session_hash, published_at, created_at, updated_at
         FROM businesses
        WHERE 1=1
        ORDER BY updated_at DESC
        LIMIT ?`,
      [Number(limit)]
    )
    return rows.map(r => ({ ...toSummary(r), hasBrowserSession: Boolean(r.owner_session_hash) }))
  },

  async create(data) {
    const db = getPool()
    const id = randomUUID()
    await db.execute(
      `INSERT INTO businesses
        (id, name, slug, category, location, owner_input, ai_draft, approved_profile, approved_catalogue, status, owner_session_hash, owner_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
        data.ownerId || null,
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
    if ($set.publishedProfile !== undefined) {
      fields.push('published_profile = ?')
      params.push(JSON.stringify($set.publishedProfile))
    }
    if ($set.publishedCatalogue !== undefined) {
      fields.push('published_catalogue = ?')
      params.push(JSON.stringify($set.publishedCatalogue))
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

  // Publish: copy the owner's approved working copy into the public snapshot
  async publish(business) {
    return Business.findByIdAndUpdate(
      business.id,
      { $set: {
          status:             'published',
          publishedAt:        new Date(),
          publishedProfile:   business.approvedProfile || {},
          publishedCatalogue: business.approvedCatalogue || []
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

/**
 * What customers see for a published business: the publish-time snapshot, or — for rows
 * published before snapshots existed — the approved fields, exactly as served before.
 */
export function publicSnapshot(business) {
  const hasSnapshot = business.publishedProfile !== null && business.publishedProfile !== undefined
  return {
    profile:   (hasSnapshot ? business.publishedProfile : business.approvedProfile) || {},
    catalogue: (hasSnapshot ? business.publishedCatalogue : business.approvedCatalogue) || []
  }
}

// True when the owner has saved edits that are not live yet
export function hasUnpublishedChanges(business) {
  if (business.status !== 'published') return false
  const live = publicSnapshot(business)
  return JSON.stringify(business.approvedProfile || {}) !== JSON.stringify(live.profile) ||
    JSON.stringify(business.approvedCatalogue || []) !== JSON.stringify(live.catalogue)
}

// Owner-facing representation — never includes the session hash or account id
export function toOwnerView(business) {
  if (!business) return null
  const { ownerSessionHash, ownerId, ...rest } = business
  return { ...rest, hasUnpublishedChanges: hasUnpublishedChanges(business) }
}

export default Business
