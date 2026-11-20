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
  })

  // Verify connection; close the pool on failure so retries don't leak connections
  try {
    const conn = await pool.getConnection()
    conn.release()
  } catch (err) {
    const failed = pool
    pool = null
    failed.end().catch(() => {})
    throw err
  }
  console.log('MySQL connected')

  // Create tables if they don't exist
  await initSchema()
}

// Tests only: run the models against an in-memory stand-in instead of MySQL
export function setPoolForTests(fakePool) {
  pool = fakePool
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

  // Published snapshot: what customers see. Edits to approved_* stay private until the owner
  // publishes again. Existing published rows keep NULL here and keep serving approved_*
  // exactly as before, so this migration copies or rewrites no data.
  await addColumnIfMissing('businesses', 'published_profile', 'JSON NULL DEFAULT NULL')
  await addColumnIfMissing('businesses', 'published_catalogue', 'JSON NULL DEFAULT NULL')

  // Owner email login. New tables only; businesses gain a nullable owner_id that is set
  // when an owner logs in and claims the pages created in their browser. Existing rows keep NULL.
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS owners (
      id            CHAR(36)     NOT NULL PRIMARY KEY,
      email         VARCHAR(254) NOT NULL UNIQUE,
      created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
      last_login_at DATETIME     DEFAULT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `)
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS owner_sessions (
      session_hash CHAR(64)  NOT NULL PRIMARY KEY,
      owner_id     CHAR(36)  NOT NULL,
      created_at   DATETIME  NOT NULL DEFAULT CURRENT_TIMESTAMP,
      expires_at   DATETIME  NOT NULL,
      INDEX idx_owner_sessions_owner (owner_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `)
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS login_codes (
      id          CHAR(36)     NOT NULL PRIMARY KEY,
      email       VARCHAR(254) NOT NULL,
      code_hash   CHAR(64)     NOT NULL,
      salt        CHAR(32)     NOT NULL,
      attempts    INT          NOT NULL DEFAULT 0,
      expires_at  DATETIME     NOT NULL,
      consumed_at DATETIME     DEFAULT NULL,
      created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_login_codes_email (email)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `)
  await addColumnIfMissing('businesses', 'owner_id', 'CHAR(36) NULL DEFAULT NULL')
  await addIndexIfMissing('businesses', 'idx_owner_id', 'owner_id')
}
