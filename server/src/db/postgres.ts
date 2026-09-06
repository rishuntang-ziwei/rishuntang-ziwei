import bcrypt from 'bcryptjs'
import pg from 'pg'
import type { AdminAuditAction, AdminAuditLogInput, PublicAdminAuditLog } from '../adminAuditLog.js'
import { LIFETIME_MEMBERSHIP_EXPIRY } from '../paymentPlans.js'
import type { PublicUser, SavedChartDetail, SavedChartPayload, SavedChartRow, SavedChartSummary, UserRow, PaymentOrderRow } from '../types.js'
import { mapPaymentOrderRow, mapSavedChartRow, mapUserRow, parseSavedChartPayload, toIsoString, toPublicUser, toSavedChartDetail, toSavedChartSummary } from './shared.js'
import { resolveMembershipGrant } from '../membershipGrant.js'
import { canGenerateChartToday, dailyChartQuotaForUser, taipeiDateString } from '../chartQuota.js'
import { GUEST_DAILY_AI_LIMIT } from '../guestQuota.js'

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

  await pool.query(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS membership_plan TEXT
  `)

  await pool.query(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS membership_expires_at TIMESTAMPTZ
  `)

  await pool.query(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS birth_payload TEXT
  `)

  await pool.query(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS daily_chart_gen_date TEXT
  `)

  await pool.query(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS daily_chart_gen_count INTEGER NOT NULL DEFAULT 0
  `)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS guest_ai_usage (
      ip TEXT NOT NULL,
      usage_date TEXT NOT NULL,
      count INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (ip, usage_date)
    )
  `)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS payment_orders (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      merchant_order_no TEXT NOT NULL UNIQUE,
      plan_id TEXT NOT NULL,
      amount INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'paid', 'failed')),
      newebpay_trade_no TEXT,
      paid_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS admin_audit_logs (
      id SERIAL PRIMARY KEY,
      admin_id INTEGER NOT NULL,
      admin_name TEXT NOT NULL,
      target_user_id INTEGER,
      target_user_name TEXT,
      action TEXT NOT NULL,
      details TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_created ON admin_audit_logs(created_at DESC)
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
  birthPayload: SavedChartPayload
}): Promise<PublicUser> {
  const result = await pool.query(
    `INSERT INTO users (name, phone, email, password_hash, status, role, approved_at, birth_payload)
     VALUES ($1, $2, LOWER($3), $4, 'approved', 'user', NOW(), $5)
     RETURNING id`,
    [
      input.name.trim(),
      input.phone.trim(),
      input.email.trim(),
      input.passwordHash,
      JSON.stringify(input.birthPayload),
    ],
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
         WHERE user_id = $1 AND (subject_name ILIKE $2 OR phone ILIKE $2)
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

export async function updateSavedChart(
  id: number,
  userId: number,
  updates: { phone?: string; payload?: SavedChartPayload },
): Promise<SavedChartDetail | undefined> {
  const existing = await findSavedChartForUser(id, userId)
  if (!existing) return undefined

  const phone = updates.phone !== undefined ? updates.phone.trim() : existing.phone ?? ''
  const payload = updates.payload ?? parseSavedChartPayload(existing.payload)
  const payloadJson = JSON.stringify(payload)

  const result = await pool.query(
    `UPDATE saved_charts
     SET subject_name = $1, gender = $2, bazi = $3, payload = $4, phone = $5, updated_at = NOW()
     WHERE id = $6 AND user_id = $7`,
    [payload.name.trim(), payload.gender, payload.bazi.trim(), payloadJson, phone, id, userId],
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

export async function createPaymentOrder(
  userId: number,
  merchantOrderNo: string,
  planId: string,
  amount: number,
): Promise<PaymentOrderRow> {
  const result = await pool.query(
    `INSERT INTO payment_orders (user_id, merchant_order_no, plan_id, amount, status)
     VALUES ($1, $2, $3, $4, 'pending')
     RETURNING *`,
    [userId, merchantOrderNo, planId, amount],
  )
  return mapPaymentOrderRow(result.rows[0])
}

export async function findPaymentOrderByMerchantOrderNo(
  merchantOrderNo: string,
): Promise<PaymentOrderRow | undefined> {
  const result = await pool.query('SELECT * FROM payment_orders WHERE merchant_order_no = $1', [merchantOrderNo])
  const row = result.rows[0]
  return row ? mapPaymentOrderRow(row) : undefined
}

export async function markPaymentOrderPaid(
  merchantOrderNo: string,
  newebpayTradeNo: string,
): Promise<PaymentOrderRow | undefined> {
  const result = await pool.query(
    `UPDATE payment_orders
     SET status = 'paid', newebpay_trade_no = $2, paid_at = NOW()
     WHERE merchant_order_no = $1 AND status = 'pending'
     RETURNING *`,
    [merchantOrderNo, newebpayTradeNo],
  )
  const row = result.rows[0]
  return row ? mapPaymentOrderRow(row) : undefined
}

export async function grantUserMembership(userId: number, planId: string): Promise<PublicUser | undefined> {
  const user = await findUserById(userId)
  if (!user || user.role !== 'user') return undefined

  const grant = resolveMembershipGrant(user, planId)
  if (!grant) return undefined

  const result = await pool.query(
    `UPDATE users
     SET status = 'approved',
         approved_at = COALESCE(approved_at, NOW()),
         membership_plan = $2,
         membership_expires_at = $3
     WHERE id = $1
     RETURNING *`,
    [userId, grant.planId, grant.expiresAt],
  )
  const row = result.rows[0]
  return row ? toPublicUser(mapUserRow(row)) : undefined
}

export async function revokeUserMembership(userId: number): Promise<PublicUser | undefined> {
  const user = await findUserById(userId)
  if (!user || user.role !== 'user') return undefined

  const result = await pool.query(
    `UPDATE users
     SET membership_plan = NULL,
         membership_expires_at = NULL
     WHERE id = $1
     RETURNING *`,
    [userId],
  )
  const row = result.rows[0]
  return row ? toPublicUser(mapUserRow(row)) : undefined
}

function mapAuditLogRow(row: Record<string, unknown>): PublicAdminAuditLog {
  let details: Record<string, unknown> | null = null
  if (row.details != null && String(row.details).trim()) {
    try {
      details = JSON.parse(String(row.details)) as Record<string, unknown>
    } catch {
      details = null
    }
  }
  return {
    id: Number(row.id),
    adminId: Number(row.admin_id),
    adminName: String(row.admin_name),
    targetUserId: row.target_user_id != null ? Number(row.target_user_id) : null,
    targetUserName: row.target_user_name != null ? String(row.target_user_name) : null,
    action: String(row.action) as AdminAuditAction,
    details,
    createdAt: toIsoString(row.created_at),
  }
}

export async function createAdminAuditLog(input: AdminAuditLogInput): Promise<PublicAdminAuditLog> {
  const details = input.details ? JSON.stringify(input.details) : null
  const result = await pool.query(
    `INSERT INTO admin_audit_logs (admin_id, admin_name, target_user_id, target_user_name, action, details)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [
      input.adminId,
      input.adminName,
      input.targetUserId ?? null,
      input.targetUserName ?? null,
      input.action,
      details,
    ],
  )
  return mapAuditLogRow(result.rows[0])
}

export async function listAdminAuditLogs(limit = 50): Promise<PublicAdminAuditLog[]> {
  const result = await pool.query(
    `SELECT * FROM admin_audit_logs ORDER BY created_at DESC, id DESC LIMIT $1`,
    [Math.min(Math.max(limit, 1), 200)],
  )
  return result.rows.map((row) => mapAuditLogRow(row))
}

export async function setUserMembershipExpiry(
  userId: number,
  expiresAt: string | null,
): Promise<PublicUser | undefined> {
  const user = await findUserById(userId)
  if (!user || user.role !== 'user') return undefined

  let planId = user.membership_plan
  if (!expiresAt) {
    planId = null
  } else if (expiresAt === LIFETIME_MEMBERSHIP_EXPIRY) {
    planId = 'member_lifetime'
  } else if (!planId) {
    planId = 'member_monthly'
  }

  const result = await pool.query(
    `UPDATE users
     SET status = 'approved',
         approved_at = COALESCE(approved_at, NOW()),
         membership_plan = $2,
         membership_expires_at = $3
     WHERE id = $1
     RETURNING *`,
    [userId, planId, expiresAt],
  )
  const row = result.rows[0]
  return row ? toPublicUser(mapUserRow(row)) : undefined
}

export async function fulfillPaymentOrder(order: PaymentOrderRow): Promise<PublicUser | undefined> {
  return grantUserMembership(order.user_id, order.plan_id)
}

export async function consumeDailyChartGeneration(userId: number) {
  const row = await findUserById(userId)
  if (!row) throw new Error('找不到使用者')

  const unlimited = dailyChartQuotaForUser(row) === null
  if (unlimited) {
    return { allowed: true as const, quota: null }
  }

  if (!canGenerateChartToday(row)) {
    return { allowed: false as const, quota: dailyChartQuotaForUser(row)! }
  }

  const today = taipeiDateString()
  const nextCount = row.daily_chart_gen_date === today ? row.daily_chart_gen_count + 1 : 1

  await pool.query(
    `UPDATE users SET daily_chart_gen_date = $1, daily_chart_gen_count = $2 WHERE id = $3`,
    [today, nextCount, userId],
  )

  const updated = await findUserById(userId)
  if (!updated) throw new Error('找不到使用者')
  return { allowed: true as const, quota: dailyChartQuotaForUser(updated)! }
}

export async function getGuestAiQuota(ip: string) {
  const today = taipeiDateString()
  const limit = GUEST_DAILY_AI_LIMIT
  const existing = await pool.query<{ count: number }>(
    'SELECT count FROM guest_ai_usage WHERE ip = $1 AND usage_date = $2',
    [ip, today],
  )
  const used = existing.rows[0]?.count ?? 0
  return {
    allowed: used < limit,
    quota: { used, limit, remaining: Math.max(0, limit - used) },
  }
}

export async function incrementGuestAiQuota(ip: string) {
  const today = taipeiDateString()
  const limit = GUEST_DAILY_AI_LIMIT
  const existing = await pool.query<{ count: number }>(
    'SELECT count FROM guest_ai_usage WHERE ip = $1 AND usage_date = $2',
    [ip, today],
  )
  const used = existing.rows[0]?.count ?? 0
  const next = used + 1
  await pool.query(
    `INSERT INTO guest_ai_usage (ip, usage_date, count) VALUES ($1, $2, $3)
     ON CONFLICT (ip, usage_date) DO UPDATE SET count = EXCLUDED.count`,
    [ip, today, next],
  )
  return { used: next, limit, remaining: Math.max(0, limit - next) }
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
