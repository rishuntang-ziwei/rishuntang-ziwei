import bcrypt from 'bcryptjs'
import pg from 'pg'
import type { PublicUser, SavedChartDetail, SavedChartPayload, SavedChartRow, SavedChartSummary, UserRow } from '../types.js'
import { mapSavedChartRow, mapUserRow, toPublicUser, toSavedChartDetail, toSavedChartSummary } from './shared.js'

const { Pool } = pg

let pool: pg.Pool

function useSsl() {
  if (process.env.PGSSLMODE === 'require') return { rejectUnauthorized: false }
  const url = process.env.DATABASE_URL ?? ''
  if (
    url.includes('render.com') ||
    url.includes('neon.tech') ||
    url.includes('supabase.co') ||
    url.includes('sslmode=require')
  ) {
    return { rejectUnauthorized: false }
  }
  return undefined
}

export async function initDb() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL 未設定')
  }

  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: useSsl(),
  })

  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected')),
      role TEXT NOT NULL DEFAULT 'user' CHECK(role IN ('user', 'admin')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      approved_at TIMESTAMPTZ
    );

    CREATE TABLE IF NOT EXISTS saved_charts (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      subject_name TEXT NOT NULL,
      gender TEXT NOT NULL CHECK(gender IN ('男', '女')),
      bazi TEXT NOT NULL,
      payload TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_saved_charts_user_name ON saved_charts(user_id, subject_name);
    CREATE INDEX IF NOT EXISTS idx_users_email_lower ON users (LOWER(email));
  `)

  await pool.query(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS star_draw_enabled BOOLEAN NOT NULL DEFAULT FALSE
  `)

  await pool.query(`
    ALTER TABLE saved_charts
    ADD COLUMN IF NOT EXISTS phone TEXT NOT NULL DEFAULT ''
  `)

  console.log('[db] PostgreSQL 就緒')
}

export async function getDbInfo() {
  const result = await pool.query<{ count: string }>('SELECT COUNT(*)::text AS count FROM users')
  return {
    driver: 'postgres' as const,
    userCount: Number(result.rows[0]?.count ?? 0),
    persistent: true,
  }
}

export async function findUserByEmail(email: string): Promise<UserRow | undefined> {
  const result = await pool.query('SELECT * FROM users WHERE LOWER(email) = LOWER($1)', [email])
  const row = result.rows[0]
  return row ? mapUserRow(row) : undefined
}

export async function findUserById(id: number): Promise<UserRow | undefined> {
  const result = await pool.query('SELECT * FROM users WHERE id = $1', [id])
  const row = result.rows[0]
  return row ? mapUserRow(row) : undefined
}

export async function createUser(input: {
  name: string
  phone: string
  email: string
  passwordHash: string
}): Promise<PublicUser> {
  const result = await pool.query(
    `INSERT INTO users (name, phone, email, password_hash, status, role)
     VALUES ($1, $2, LOWER($3), $4, 'pending', 'user')
     RETURNING id`,
    [input.name.trim(), input.phone.trim(), input.email.trim(), input.passwordHash],
  )
  const row = await findUserById(Number(result.rows[0].id))
  if (!row) throw new Error('建立使用者失敗')
  return toPublicUser(row)
}

export async function listUsers(): Promise<PublicUser[]> {
  const result = await pool.query('SELECT * FROM users ORDER BY created_at DESC')
  return result.rows.map((row) => toPublicUser(mapUserRow(row)))
}

export async function updateUserStatus(
  id: number,
  status: 'approved' | 'rejected',
): Promise<PublicUser | undefined> {
  const approvedAt = status === 'approved' ? new Date().toISOString() : null
  await pool.query(`UPDATE users SET status = $1, approved_at = $2 WHERE id = $3 AND role = 'user'`, [
    status,
    approvedAt,
    id,
  ])
  const row = await findUserById(id)
  return row ? toPublicUser(row) : undefined
}

export async function updateUserPassword(id: number, passwordHash: string): Promise<PublicUser | undefined> {
  await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [passwordHash, id])
  const row = await findUserById(id)
  return row ? toPublicUser(row) : undefined
}

export async function countAdmins(): Promise<number> {
  const result = await pool.query<{ count: string }>("SELECT COUNT(*)::text AS count FROM users WHERE role = 'admin'")
  return Number(result.rows[0]?.count ?? 0)
}

export async function updateUserRole(id: number, role: 'user' | 'admin'): Promise<PublicUser | undefined> {
  if (role === 'admin') {
    await pool.query(
      `UPDATE users
       SET role = 'admin', status = 'approved', approved_at = COALESCE(approved_at, NOW())
       WHERE id = $1`,
      [id],
    )
  } else {
    await pool.query(`UPDATE users SET role = 'user' WHERE id = $1`, [id])
  }
  const row = await findUserById(id)
  return row ? toPublicUser(row) : undefined
}

export async function updateUserStarDraw(id: number, enabled: boolean): Promise<PublicUser | undefined> {
  await pool.query(`UPDATE users SET star_draw_enabled = $1 WHERE id = $2 AND role = 'user'`, [enabled, id])
  const row = await findUserById(id)
  return row ? toPublicUser(row) : undefined
}

export async function deleteUser(id: number): Promise<boolean> {
  const result = await pool.query('DELETE FROM users WHERE id = $1', [id])
  return (result.rowCount ?? 0) > 0
}

export async function listSavedChartsByUser(userId: number, search?: string): Promise<SavedChartSummary[]> {
  const q = search?.trim()
  const result = q
    ? await pool.query(
        `SELECT * FROM saved_charts
         WHERE user_id = $1 AND subject_name ILIKE $2
         ORDER BY updated_at DESC, id DESC`,
        [userId, `%${q}%`],
      )
    : await pool.query(
        `SELECT * FROM saved_charts
         WHERE user_id = $1
         ORDER BY updated_at DESC, id DESC`,
        [userId],
      )
  return result.rows.map((row) => toSavedChartSummary(mapSavedChartRow(row)))
}

export async function findSavedChartById(id: number): Promise<SavedChartRow | undefined> {
  const result = await pool.query('SELECT * FROM saved_charts WHERE id = $1', [id])
  const row = result.rows[0]
  return row ? mapSavedChartRow(row) : undefined
}

export async function findSavedChartForUser(id: number, userId: number): Promise<SavedChartRow | undefined> {
  const result = await pool.query('SELECT * FROM saved_charts WHERE id = $1 AND user_id = $2', [id, userId])
  const row = result.rows[0]
  return row ? mapSavedChartRow(row) : undefined
}

export async function createSavedChart(userId: number, payload: SavedChartPayload): Promise<SavedChartDetail> {
  const name = payload.name.trim()
  const bazi = payload.bazi.trim()
  const payloadJson = JSON.stringify(payload)
  const result = await pool.query(
    `INSERT INTO saved_charts (user_id, subject_name, gender, bazi, payload)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id`,
    [userId, name, payload.gender, bazi, payloadJson],
  )
  const row = await findSavedChartById(Number(result.rows[0].id))
  if (!row) throw new Error('儲存命盤失敗')
  return toSavedChartDetail(row)
}

export async function deleteSavedChart(id: number, userId: number): Promise<boolean> {
  const result = await pool.query('DELETE FROM saved_charts WHERE id = $1 AND user_id = $2', [id, userId])
  return (result.rowCount ?? 0) > 0
}

export async function updateSavedChartPhone(
  id: number,
  userId: number,
  phone: string,
): Promise<SavedChartDetail | undefined> {
  const result = await pool.query(
    `UPDATE saved_charts
     SET phone = $1, updated_at = NOW()
     WHERE id = $2 AND user_id = $3`,
    [phone, id, userId],
  )
  if ((result.rowCount ?? 0) === 0) return undefined
  const row = await findSavedChartForUser(id, userId)
  return row ? toSavedChartDetail(row) : undefined
}

export async function getSavedChartDetailForUser(
  chartId: number,
  userId: number,
): Promise<SavedChartDetail | undefined> {
  const row = await findSavedChartForUser(chartId, userId)
  return row ? toSavedChartDetail(row) : undefined
}

export async function ensureAdminUser() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase()
  const password = process.env.ADMIN_PASSWORD
  const name = process.env.ADMIN_NAME?.trim() || '管理員'
  const phone = process.env.ADMIN_PHONE?.trim() || '0000000000'

  if (!email || !password) {
    console.warn('[auth] 未設定 ADMIN_EMAIL / ADMIN_PASSWORD，略過建立管理員帳號')
    return
  }

  if (await findUserByEmail(email)) return

  const passwordHash = await bcrypt.hash(password, 10)
  await pool.query(
    `INSERT INTO users (name, phone, email, password_hash, status, role, approved_at)
     VALUES ($1, $2, $3, $4, 'approved', 'admin', NOW())`,
    [name, phone, email, passwordHash],
  )
  console.log(`[auth] 已建立管理員帳號：${email}`)
}
