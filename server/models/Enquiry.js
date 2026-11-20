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
        (id, business_id, customer_name, customer_email, customer_phone, message, notification_status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.businessId,
        data.customerName,
        data.customerEmail || null,
        data.customerPhone || null,
        data.message,
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

  async deleteMany({ businessId } = {}) {
    const db = getPool()
    if (businessId) {
      await db.execute('DELETE FROM enquiries WHERE business_id = ?', [businessId])
    }
  }
}

export default Enquiry
