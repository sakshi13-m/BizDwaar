import mysql from 'mysql2/promise'

let pool = null

export async function connectDB() {
  pool = mysql.createPool({
    host:     process.env.DB_HOST     || 'localhost',
    port:     Number(process.env.DB_PORT || 3306),
    user:     process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    // Fall back to MONGODB_URI check for local dev clarity
  })

  // Verify connection
  const conn = await pool.getConnection()
  console.log('MySQL connected:', process.env.DB_HOST || 'localhost')
  conn.release()

  // Create tables if they don't exist
  await initSchema()
}

export function getPool() {
  if (!pool) throw new Error('DB not initialised — call connectDB() first')
  return pool
}

async function initSchema() {
  const db = pool
  await db.execute(`
    CREATE TABLE IF NOT EXISTS businesses (
      id               CHAR(36)     NOT NULL PRIMARY KEY,
      name             VARCHAR(200) NOT NULL,
      slug             VARCHAR(200) NOT NULL UNIQUE,
      category         VARCHAR(200) DEFAULT NULL,
      location         VARCHAR(200) DEFAULT NULL,
      owner_input      JSON         NOT NULL DEFAULT (JSON_OBJECT()),
      ai_draft         JSON         NOT NULL DEFAULT (JSON_OBJECT()),
      approved_profile JSON         NOT NULL DEFAULT (JSON_OBJECT()),
      approved_catalogue JSON       NOT NULL DEFAULT (JSON_ARRAY()),
      status           ENUM('draft','published') NOT NULL DEFAULT 'draft',
      published_at     DATETIME     DEFAULT NULL,
      created_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_status_slug (status, slug)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `)

  await db.execute(`
    CREATE TABLE IF NOT EXISTS enquiries (
      id                        CHAR(36)     NOT NULL PRIMARY KEY,
      business_id               CHAR(36)     NOT NULL,
      customer_name             VARCHAR(200) NOT NULL,
      customer_email            VARCHAR(200) DEFAULT NULL,
      customer_phone            VARCHAR(50)  DEFAULT NULL,
      message                   TEXT         NOT NULL,
      notification_status       ENUM('pending','sent','failed') NOT NULL DEFAULT 'pending',
      notification_attempted_at DATETIME     DEFAULT NULL,
      created_at                DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at                DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_business_id (business_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `)

  await runAdditiveMigrations()

  console.log('DB schema ready')
}

// -------------------------------------------------------
// Additive, idempotent migrations. Never drop or rewrite existing data.
// -------------------------------------------------------
async function columnExists(table, column) {
  const [rows] = await pool.execute(
    `SELECT COUNT(*) AS n FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [table, column]
  )
  return Number(rows[0].n) > 0
}

async function indexExists(table, index) {
  const [rows] = await pool.execute(
    `SELECT COUNT(*) AS n FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ?`,
    [table, index]
  )
  return Number(rows[0].n) > 0
}

// Table/column/DDL values below are fixed literals, never user input
async function addColumnIfMissing(table, column, definition) {
  if (!(await columnExists(table, column))) {
    await pool.execute(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`)
    console.log(`Migration: added ${table}.${column}`)
  }
}

async function addIndexIfMissing(table, index, columns) {
  if (!(await indexExists(table, index))) {
    await pool.execute(`CREATE INDEX ${index} ON ${table} (${columns})`)
    console.log(`Migration: added index ${index}`)
  }
}

async function runAdditiveMigrations() {
  // Anonymous owner sessions — existing rows keep NULL (admin fallback only)
  await addColumnIfMissing('businesses', 'owner_session_hash', 'CHAR(64) NULL DEFAULT NULL')
  await addIndexIfMissing('businesses', 'idx_owner_session_hash', 'owner_session_hash')

  // Enquiry management — existing enquiries become 'new'; product interest stays NULL
  await addColumnIfMissing('enquiries', 'status', "ENUM('new','replied','closed') NOT NULL DEFAULT 'new'")
  await addColumnIfMissing('enquiries', 'product_name', 'VARCHAR(200) NULL DEFAULT NULL')
}
