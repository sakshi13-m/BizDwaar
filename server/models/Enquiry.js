import { randomUUID } from 'crypto'
import { getPool } from '../db.js'

function deserialise(row) {
  if (!row) return null
  return {
    _id:                     row.id,
    id:                      row.id,
    businessId:              row.business_id,
    customerName:            row.customer_name,
    customerEmail:           row.customer_email,
    customerPhone:           row.customer_phone,
    message:                 row.message,
    productName:             row.product_name || null,
    status:                  row.status || 'new',
    notificationStatus:      row.notification_status,
    notificationAttemptedAt: row.notification_attempted_at,
    createdAt:               row.created_at,
    updatedAt:               row.updated_at,
  }
}

const Enquiry = {
  async create(data) {
    const db = getPool()
    const id = randomUUID()
    await db.execute(
      `INSERT INTO enquiries
        (id, business_id, customer_name, customer_email, customer_phone, message, product_name, notification_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.businessId,
        data.customerName,
        data.customerEmail || null,
        data.customerPhone || null,
        data.message,
        data.productName || null,
        data.notificationStatus || 'pending',
      ]
    )
    // Return a saveable object
    const row = await Enquiry.findById(id)
    // Attach a save() method for the notification status update pattern
    row.save = async function () {
      const db = getPool()
      await db.execute(
        `UPDATE enquiries
            SET notification_status = ?, notification_attempted_at = ?
          WHERE id = ?`,
        [this.notificationStatus, this.notificationAttemptedAt || null, this.id]
      )
    }
    return row
  },

  async findById(id) {
    const db = getPool()
    const [rows] = await db.execute('SELECT * FROM enquiries WHERE id = ? LIMIT 1', [id])
    return deserialise(rows[0])
  },

  async findByBusinessId(businessId, limit = 50) {
    const db = getPool()
    const [rows] = await db.execute(
      'SELECT * FROM enquiries WHERE business_id = ? ORDER BY created_at DESC LIMIT ?',
      [businessId, limit]
    )
    return rows.map(deserialise)
  },

  // Scoped by business so an owner can only change enquiries sent to their own business
  async updateStatus(id, businessId, status) {
    const existing = await Enquiry.findById(id)
    if (!existing || existing.businessId !== businessId) return null
    const db = getPool()
    await db.execute(
      'UPDATE enquiries SET status = ? WHERE id = ? AND business_id = ?',
      [status, id, businessId]
    )
    return Enquiry.findById(id)
  },

  // Admin overview: per-business totals and unanswered ("new") counts
  async statusCounts(limit = 20000) {
    const db = getPool()
    const [rows] = await db.query('SELECT business_id, status FROM enquiries WHERE 1=1 LIMIT ?', [Number(limit)])
    const counts = new Map()
    for (const r of rows) {
      const c = counts.get(r.business_id) || { total: 0, new: 0 }
      c.total++
      if ((r.status || 'new') === 'new') c.new++
      counts.set(r.business_id, c)
    }
    return counts
  },

  // Test-cleanup helper: delete one enquiry by exact id
  async deleteOne({ _id, id } = {}) {
    const key = _id || id
    if (!key) return
    const db = getPool()
    await db.execute('DELETE FROM enquiries WHERE id = ?', [key])
  },

  async deleteMany({ businessId } = {}) {
    const db = getPool()
    if (businessId) {
      await db.execute('DELETE FROM enquiries WHERE business_id = ?', [businessId])
    }
  }
}

export default Enquiry
