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
    CREATE TABLE IF NOT EXISTS chart_groups (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(user_id, name)
    )
  `)
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_chart_groups_user ON chart_groups(user_id)`)
  await pool.query(`
    ALTER TABLE saved_charts
    ADD COLUMN IF NOT EXISTS group_id INTEGER REFERENCES chart_groups(id) ON DELETE SET NULL
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
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN NOT NULL DEFAULT FALSE
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

  await pool.query(`
    CREATE TABLE IF NOT EXISTS trusted_devices (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      device_id TEXT NOT NULL,
      token_hash TEXT NOT NULL,
      label TEXT,
      user_agent TEXT,
      last_used_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      revoked_at TIMESTAMPTZ,
      UNIQUE(user_id, device_id)
    )
  `)
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_trusted_devices_user ON trusted_devices(user_id)`)
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_trusted_devices_device ON trusted_devices(device_id)`)

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
  await revokeAllTrustedDevicesForUser(id)
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
    await pool.query(`UPDATE users SET role = 'user', is_super_admin = FALSE WHERE id = $1`, [id])
    await revokeAllTrustedDevicesForUser(id)
  }
  const row = await findUserById(id)
  return row ? toPublicUser(row) : undefined
}

export async function setUserSuperAdmin(id: number, enabled: boolean): Promise<PublicUser | undefined> {
  await pool.query(
    `UPDATE users
     SET role = 'admin', is_super_admin = $1, status = 'approved',
         approved_at = COALESCE(approved_at, NOW())
     WHERE id = $2`,
    [enabled, id],
  )
  const row = await findUserById(id)
  return row ? toPublicUser(row) : undefined
}

export async function countActiveTrustedDevices(userId: number): Promise<number> {
  const result = await pool.query<{ count: string }>(
    'SELECT COUNT(*)::text AS count FROM trusted_devices WHERE user_id = $1 AND revoked_at IS NULL',
    [userId],
  )
  return Number(result.rows[0]?.count ?? 0)
}

export async function upsertTrustedDevice(input: {
  userId: number
  deviceId: string
  tokenHash: string
  label?: string | null
  userAgent?: string | null
}): Promise<number> {
  const now = new Date().toISOString()
  const existing = await pool.query<{ id: number }>(
    'SELECT id FROM trusted_devices WHERE user_id = $1 AND device_id = $2',
    [input.userId, input.deviceId],
  )
  if (existing.rows[0]) {
    await pool.query(
      `UPDATE trusted_devices
       SET token_hash = $1, label = COALESCE($2, label), user_agent = $3, last_used_at = $4, revoked_at = NULL
       WHERE id = $5`,
      [input.tokenHash, input.label ?? null, input.userAgent ?? null, now, existing.rows[0].id],
    )
    return existing.rows[0].id
  }
  const result = await pool.query<{ id: number }>(
    `INSERT INTO trusted_devices (user_id, device_id, token_hash, label, user_agent, last_used_at)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id`,
    [input.userId, input.deviceId, input.tokenHash, input.label ?? null, input.userAgent ?? null, now],
  )
  return Number(result.rows[0].id)
}

export async function findActiveTrustedDevice(deviceId: string) {
  const result = await pool.query(
    `SELECT td.*, u.name AS user_name, u.email AS user_email, u.role AS user_role, u.is_super_admin
     FROM trusted_devices td
     JOIN users u ON u.id = td.user_id
     WHERE td.device_id = $1 AND td.revoked_at IS NULL`,
    [deviceId],
  )
  return result.rows[0] as Record<string, unknown> | undefined
}

export async function touchTrustedDevice(id: number) {
  await pool.query('UPDATE trusted_devices SET last_used_at = NOW() WHERE id = $1', [id])
}

export async function listTrustedDevices(userId?: number) {
  const result = userId
    ? await pool.query(
        `SELECT td.*, u.name AS user_name, u.email AS user_email
         FROM trusted_devices td
         JOIN users u ON u.id = td.user_id
         WHERE td.user_id = $1 AND td.revoked_at IS NULL
         ORDER BY td.last_used_at DESC NULLS LAST, td.created_at DESC`,
        [userId],
      )
    : await pool.query(
        `SELECT td.*, u.name AS user_name, u.email AS user_email
         FROM trusted_devices td
         JOIN users u ON u.id = td.user_id
         WHERE td.revoked_at IS NULL
         ORDER BY td.last_used_at DESC NULLS LAST, td.created_at DESC`,
      )
  return result.rows as Record<string, unknown>[]
}

export async function revokeTrustedDevice(id: number): Promise<boolean> {
  const result = await pool.query(
    'UPDATE trusted_devices SET revoked_at = NOW() WHERE id = $1 AND revoked_at IS NULL',
    [id],
  )
  return (result.rowCount ?? 0) > 0
}

export async function revokeAllTrustedDevicesForUser(userId: number) {
  await pool.query(
    'UPDATE trusted_devices SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL',
    [userId],
  )
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

function mapSavedChartListRow(row: Record<string, unknown>): SavedChartSummary {
  return toSavedChartSummary(mapSavedChartRow(row), {
    group_name: row.group_name != null ? String(row.group_name) : null,
  })
}

export async function listSavedChartsByUser(
  userId: number,
  search?: string,
  groupId?: number,
): Promise<SavedChartSummary[]> {
  const q = search?.trim()
  const like = q ? `%${q}%` : null
  const result = await pool.query(
    `SELECT sc.*, cg.name AS group_name
     FROM saved_charts sc
     LEFT JOIN chart_groups cg ON cg.id = sc.group_id
     WHERE sc.user_id = $1
       AND ($2::int IS NULL OR sc.group_id = $2)
       AND (
         $3::text IS NULL
         OR sc.subject_name ILIKE $3
         OR sc.phone ILIKE $3
         OR cg.name ILIKE $3
       )
     ORDER BY sc.updated_at DESC, sc.id DESC`,
    [userId, groupId ?? null, like],
  )
  return result.rows.map((row) => mapSavedChartListRow(row as Record<string, unknown>))
}

export async function listChartGroupsByUser(userId: number): Promise<import('../types.js').ChartGroupSummary[]> {
  const result = await pool.query(
    `SELECT g.id, g.name, g.created_at, g.updated_at,
            COUNT(sc.id)::int AS chart_count
     FROM chart_groups g
     LEFT JOIN saved_charts sc ON sc.group_id = g.id AND sc.user_id = g.user_id
     WHERE g.user_id = $1
     GROUP BY g.id
     ORDER BY g.name ASC`,
    [userId],
  )
  return result.rows.map((row) => ({
    id: Number(row.id),
    name: String(row.name),
    chartCount: Number(row.chart_count ?? 0),
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  }))
}

export async function createChartGroup(userId: number, name: string): Promise<import('../types.js').ChartGroupSummary> {
  const trimmed = name.trim()
  const result = await pool.query(
    `INSERT INTO chart_groups (user_id, name) VALUES ($1, $2) RETURNING id, name, created_at, updated_at`,
    [userId, trimmed],
  )
  const row = result.rows[0]
  return {
    id: Number(row.id),
    name: String(row.name),
    chartCount: 0,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  }
}

export async function findChartGroupForUser(
  groupId: number,
  userId: number,
): Promise<{ id: number; name: string } | undefined> {
  const result = await pool.query('SELECT id, name FROM chart_groups WHERE id = $1 AND user_id = $2', [
    groupId,
    userId,
  ])
  const row = result.rows[0]
  if (!row) return undefined
  return { id: Number(row.id), name: String(row.name) }
}

export async function renameChartGroup(
  groupId: number,
  userId: number,
  name: string,
): Promise<import('../types.js').ChartGroupSummary | undefined> {
  const trimmed = name.trim()
  const result = await pool.query(
    `UPDATE chart_groups SET name = $1, updated_at = NOW() WHERE id = $2 AND user_id = $3`,
    [trimmed, groupId, userId],
  )
  if ((result.rowCount ?? 0) === 0) return undefined
  const groups = await listChartGroupsByUser(userId)
  return groups.find((g) => g.id === groupId)
}

export async function deleteChartGroup(groupId: number, userId: number): Promise<boolean> {
  const result = await pool.query('DELETE FROM chart_groups WHERE id = $1 AND user_id = $2', [groupId, userId])
  return (result.rowCount ?? 0) > 0
}

export async function assignChartsToGroup(
  userId: number,
  groupId: number,
  chartIds: number[],
): Promise<number> {
  const group = await findChartGroupForUser(groupId, userId)
  if (!group) return 0
  let updated = 0
  for (const chartId of chartIds) {
    const result = await pool.query(
      `UPDATE saved_charts SET group_id = $1, updated_at = NOW() WHERE id = $2 AND user_id = $3`,
      [groupId, chartId, userId],
    )
    updated += result.rowCount ?? 0
  }
  await pool.query(`UPDATE chart_groups SET updated_at = NOW() WHERE id = $1`, [groupId])
  return updated
}

export async function removeChartsFromGroup(userId: number, chartIds: number[]): Promise<number> {
  let updated = 0
  for (const chartId of chartIds) {
    const result = await pool.query(
      `UPDATE saved_charts SET group_id = NULL, updated_at = NOW() WHERE id = $1 AND user_id = $2`,
      [chartId, userId],
    )
    updated += result.rowCount ?? 0
  }
  return updated
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

export async function ensureSuperAdminUser() {
  const email = (process.env.SUPER_ADMIN_EMAIL || 'estinto0310@gmail.com').trim().toLowerCase()
  const user = await findUserByEmail(email)
  if (!user) {
    console.warn(`[auth] 超級管理員 Email「${email}」尚未註冊，請先建立帳號後再升級`)
    return
  }
  if (user.role === 'admin' && user.is_super_admin) return
  await pool.query(
    `UPDATE users
     SET role = 'admin', is_super_admin = TRUE, status = 'approved',
         approved_at = COALESCE(approved_at, NOW())
     WHERE id = $1`,
    [user.id],
  )
  console.log(`[auth] 已設定超級管理員：${email}`)
}
