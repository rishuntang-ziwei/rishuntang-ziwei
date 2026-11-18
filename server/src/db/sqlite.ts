import { DatabaseSync } from 'node:sqlite'
import bcrypt from 'bcryptjs'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { AdminAuditAction, AdminAuditLogInput, PublicAdminAuditLog } from '../adminAuditLog.js'
import { LIFETIME_MEMBERSHIP_EXPIRY } from '../paymentPlans.js'
import type {
  ChartGroupShareRow,
  PublicUser,
  SavedChartDetail,
  SavedChartPayload,
  SavedChartRow,
  SavedChartSummary,
  UserRow,
  PaymentOrderRow,
} from '../types.js'
import { mapPaymentOrderRow, mapSavedChartRow, mapUserRow, parseSavedChartPayload, toPublicUser, toSavedChartDetail, toSavedChartSummary } from './shared.js'
import { resolveMembershipGrant } from '../membershipGrant.js'
import { canGenerateChartToday, dailyChartQuotaForUser, taipeiDateString } from '../chartQuota.js'
import { GUEST_DAILY_AI_LIMIT } from '../guestQuota.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dataDir = process.env.DB_PATH
  ? path.dirname(process.env.DB_PATH)
  : path.join(__dirname, '..', '..', 'data')
const dbPath = process.env.DB_PATH ?? path.join(dataDir, 'app.db')

let db: DatabaseSync

export async function initDb() {
  fs.mkdirSync(dataDir, { recursive: true })
  db = new DatabaseSync(dbPath)
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE COLLATE NOCASE,
      password_hash TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected')),
      role TEXT NOT NULL DEFAULT 'user' CHECK(role IN ('user', 'admin')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      approved_at TEXT
    );

    CREATE TABLE IF NOT EXISTS saved_charts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      subject_name TEXT NOT NULL,
      gender TEXT NOT NULL CHECK(gender IN ('男', '女')),
      bazi TEXT NOT NULL,
      payload TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_saved_charts_user_name ON saved_charts(user_id, subject_name);
  `)

  const userColumns = db.prepare('PRAGMA table_info(users)').all() as { name: string }[]
  if (!userColumns.some((col) => col.name === 'star_draw_enabled')) {
    db.exec(`ALTER TABLE users ADD COLUMN star_draw_enabled INTEGER NOT NULL DEFAULT 0`)
  }

  const userColumnsAfterStarDraw = db.prepare('PRAGMA table_info(users)').all() as { name: string }[]
  if (!userColumnsAfterStarDraw.some((col) => col.name === 'star_draw_requested_at')) {
    db.exec(`ALTER TABLE users ADD COLUMN star_draw_requested_at TEXT`)
  }

  const chartColumns = db.prepare('PRAGMA table_info(saved_charts)').all() as { name: string }[]
  if (!chartColumns.some((col) => col.name === 'phone')) {
    db.exec(`ALTER TABLE saved_charts ADD COLUMN phone TEXT NOT NULL DEFAULT ''`)
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS chart_groups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(user_id, name)
    );
    CREATE INDEX IF NOT EXISTS idx_chart_groups_user ON chart_groups(user_id);
  `)

  const chartColumnsAfter = db.prepare('PRAGMA table_info(saved_charts)').all() as { name: string }[]
  if (!chartColumnsAfter.some((col) => col.name === 'group_id')) {
    db.exec(`ALTER TABLE saved_charts ADD COLUMN group_id INTEGER REFERENCES chart_groups(id) ON DELETE SET NULL`)
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS chart_group_shares (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      owner_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      source_group_id INTEGER NOT NULL REFERENCES chart_groups(id) ON DELETE CASCADE,
      recipient_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      mirror_group_id INTEGER REFERENCES chart_groups(id) ON DELETE SET NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(owner_user_id, source_group_id, recipient_user_id)
    );
    CREATE INDEX IF NOT EXISTS idx_chart_group_shares_recipient ON chart_group_shares(recipient_user_id);
    CREATE INDEX IF NOT EXISTS idx_chart_group_shares_mirror ON chart_group_shares(mirror_group_id);
  `)
  let chartShareCols = db.prepare('PRAGMA table_info(saved_charts)').all() as { name: string }[]
  if (!chartShareCols.some((col) => col.name === 'share_id')) {
    db.exec(`ALTER TABLE saved_charts ADD COLUMN share_id INTEGER REFERENCES chart_group_shares(id) ON DELETE CASCADE`)
    chartShareCols = db.prepare('PRAGMA table_info(saved_charts)').all() as { name: string }[]
  }
  if (!chartShareCols.some((col) => col.name === 'shared_from_chart_id')) {
    db.exec(`ALTER TABLE saved_charts ADD COLUMN shared_from_chart_id INTEGER`)
  }
  db.exec(`CREATE INDEX IF NOT EXISTS idx_saved_charts_share ON saved_charts(share_id)`)

  let shareTableCols = db.prepare('PRAGMA table_info(chart_group_shares)').all() as { name: string }[]
  if (!shareTableCols.some((col) => col.name === 'source_updated_at')) {
    db.exec(
      `ALTER TABLE chart_group_shares ADD COLUMN source_updated_at TEXT NOT NULL DEFAULT (datetime('now'))`,
    )
    shareTableCols = db.prepare('PRAGMA table_info(chart_group_shares)').all() as { name: string }[]
  }
  if (!shareTableCols.some((col) => col.name === 'last_synced_at')) {
    db.exec(`ALTER TABLE chart_group_shares ADD COLUMN last_synced_at TEXT`)
  }

  if (!userColumns.some((col) => col.name === 'membership_plan')) {
    db.exec(`ALTER TABLE users ADD COLUMN membership_plan TEXT`)
  }
  if (!userColumns.some((col) => col.name === 'membership_expires_at')) {
    db.exec(`ALTER TABLE users ADD COLUMN membership_expires_at TEXT`)
  }
  if (!userColumns.some((col) => col.name === 'birth_payload')) {
    db.exec(`ALTER TABLE users ADD COLUMN birth_payload TEXT`)
  }
  if (!userColumns.some((col) => col.name === 'daily_chart_gen_date')) {
    db.exec(`ALTER TABLE users ADD COLUMN daily_chart_gen_date TEXT`)
  }
  if (!userColumns.some((col) => col.name === 'daily_chart_gen_count')) {
    db.exec(`ALTER TABLE users ADD COLUMN daily_chart_gen_count INTEGER NOT NULL DEFAULT 0`)
  }
  if (!userColumns.some((col) => col.name === 'daily_chart_limit')) {
    db.exec(`ALTER TABLE users ADD COLUMN daily_chart_limit INTEGER NOT NULL DEFAULT 3`)
  }
  if (!userColumns.some((col) => col.name === 'is_super_admin')) {
    db.exec(`ALTER TABLE users ADD COLUMN is_super_admin INTEGER NOT NULL DEFAULT 0`)
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS guest_ai_usage (
      ip TEXT NOT NULL,
      usage_date TEXT NOT NULL,
      count INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (ip, usage_date)
    );
  `)

  db.exec(`
    CREATE TABLE IF NOT EXISTS payment_orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      merchant_order_no TEXT NOT NULL UNIQUE,
      plan_id TEXT NOT NULL,
      amount INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'paid', 'failed')),
      newebpay_trade_no TEXT,
      paid_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `)

  db.exec(`
    CREATE TABLE IF NOT EXISTS admin_audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      admin_id INTEGER NOT NULL,
      admin_name TEXT NOT NULL,
      target_user_id INTEGER,
      target_user_name TEXT,
      action TEXT NOT NULL,
      details TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_created ON admin_audit_logs(created_at DESC);
  `)

  db.exec(`
    CREATE TABLE IF NOT EXISTS trusted_devices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      device_id TEXT NOT NULL,
      token_hash TEXT NOT NULL,
      label TEXT,
      user_agent TEXT,
      last_used_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      revoked_at TEXT,
      UNIQUE(user_id, device_id)
    );
    CREATE INDEX IF NOT EXISTS idx_trusted_devices_user ON trusted_devices(user_id);
    CREATE INDEX IF NOT EXISTS idx_trusted_devices_device ON trusted_devices(device_id);
  `)

  if (process.env.RENDER && !process.env.DB_PATH) {
    console.warn(
      '[db] 警告：Render 免費方案的本機 SQLite 會在重啟後清空。請設定 DATABASE_URL 使用 PostgreSQL，或升級方案並設定 DB_PATH 指向持久磁碟。',
    )
  }

  console.log(`[db] SQLite 就緒：${dbPath}`)
}

export async function getDbInfo() {
  const row = db.prepare('SELECT COUNT(*) AS count FROM users').get() as { count: number }
  return {
    driver: 'sqlite' as const,
    path: dbPath,
    userCount: row.count,
    persistent: Boolean(process.env.DB_PATH) || !process.env.RENDER,
  }
}

export async function findUserByEmail(email: string): Promise<UserRow | undefined> {
  const row = db.prepare('SELECT * FROM users WHERE email = ? COLLATE NOCASE').get(email)
  return row ? mapUserRow(row as Record<string, unknown>) : undefined
}

export async function findUserById(id: number): Promise<UserRow | undefined> {
  const row = db.prepare('SELECT * FROM users WHERE id = ?').get(id)
  return row ? mapUserRow(row as Record<string, unknown>) : undefined
}

export async function createUser(input: {
  name: string
  phone: string
  email: string
  passwordHash: string
  birthPayload: SavedChartPayload
}): Promise<PublicUser> {
  const result = db
    .prepare(
      `INSERT INTO users (name, phone, email, password_hash, status, role, approved_at, birth_payload)
       VALUES (?, ?, ?, ?, 'approved', 'user', datetime('now'), ?)`,
    )
    .run(
      input.name.trim(),
      input.phone.trim(),
      input.email.trim().toLowerCase(),
      input.passwordHash,
      JSON.stringify(input.birthPayload),
    )
  const row = await findUserById(Number(result.lastInsertRowid))
  if (!row) throw new Error('建立使用者失敗')
  return toPublicUser(row)
}

export async function listUsers(): Promise<PublicUser[]> {
  const rows = db.prepare('SELECT * FROM users ORDER BY created_at DESC').all() as unknown as Record<string, unknown>[]
  return rows.map((row) => toPublicUser(mapUserRow(row)))
}

export async function updateUserStatus(
  id: number,
  status: 'approved' | 'rejected',
): Promise<PublicUser | undefined> {
  const approvedAt = status === 'approved' ? new Date().toISOString() : null
  db.prepare(`UPDATE users SET status = ?, approved_at = ? WHERE id = ? AND role = 'user'`).run(
    status,
    approvedAt,
    id,
  )
  const row = await findUserById(id)
  return row ? toPublicUser(row) : undefined
}

export async function updateUserPassword(id: number, passwordHash: string): Promise<PublicUser | undefined> {
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(passwordHash, id)
  await revokeAllTrustedDevicesForUser(id)
  const row = await findUserById(id)
  return row ? toPublicUser(row) : undefined
}

export async function countAdmins(): Promise<number> {
  const row = db.prepare("SELECT COUNT(*) AS count FROM users WHERE role = 'admin'").get() as { count: number }
  return row.count
}

export async function updateUserRole(id: number, role: 'user' | 'admin'): Promise<PublicUser | undefined> {
  if (role === 'admin') {
    db.prepare(
      `UPDATE users
       SET role = 'admin', status = 'approved', approved_at = COALESCE(approved_at, datetime('now'))
       WHERE id = ?`,
    ).run(id)
  } else {
    db.prepare(`UPDATE users SET role = 'user', is_super_admin = 0 WHERE id = ?`).run(id)
    await revokeAllTrustedDevicesForUser(id)
  }
  const row = await findUserById(id)
  return row ? toPublicUser(row) : undefined
}

export async function setUserSuperAdmin(id: number, enabled: boolean): Promise<PublicUser | undefined> {
  db.prepare(
    `UPDATE users
     SET role = 'admin', is_super_admin = ?, status = 'approved',
         approved_at = COALESCE(approved_at, datetime('now'))
     WHERE id = ?`,
  ).run(enabled ? 1 : 0, id)
  const row = await findUserById(id)
  return row ? toPublicUser(row) : undefined
}

export async function countActiveTrustedDevices(userId: number): Promise<number> {
  const row = db
    .prepare('SELECT COUNT(*) AS count FROM trusted_devices WHERE user_id = ? AND revoked_at IS NULL')
    .get(userId) as { count: number }
  return row.count
}

export async function upsertTrustedDevice(input: {
  userId: number
  deviceId: string
  tokenHash: string
  label?: string | null
  userAgent?: string | null
}): Promise<number> {
  const existing = db
    .prepare('SELECT id FROM trusted_devices WHERE user_id = ? AND device_id = ?')
    .get(input.userId, input.deviceId) as { id: number } | undefined
  const now = new Date().toISOString()
  if (existing) {
    db.prepare(
      `UPDATE trusted_devices
       SET token_hash = ?, label = COALESCE(?, label), user_agent = ?, last_used_at = ?, revoked_at = NULL
       WHERE id = ?`,
    ).run(input.tokenHash, input.label ?? null, input.userAgent ?? null, now, existing.id)
    return existing.id
  }
  const result = db
    .prepare(
      `INSERT INTO trusted_devices (user_id, device_id, token_hash, label, user_agent, last_used_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run(input.userId, input.deviceId, input.tokenHash, input.label ?? null, input.userAgent ?? null, now)
  return Number(result.lastInsertRowid)
}

export async function findActiveTrustedDevice(deviceId: string) {
  const row = db
    .prepare(
      `SELECT td.*, u.name AS user_name, u.email AS user_email, u.role AS user_role, u.is_super_admin
       FROM trusted_devices td
       JOIN users u ON u.id = td.user_id
       WHERE td.device_id = ? AND td.revoked_at IS NULL`,
    )
    .get(deviceId) as Record<string, unknown> | undefined
  return row
}

export async function touchTrustedDevice(id: number) {
  db.prepare(`UPDATE trusted_devices SET last_used_at = ? WHERE id = ?`).run(new Date().toISOString(), id)
}

export async function listTrustedDevices(userId?: number) {
  const rows = userId
    ? (db
        .prepare(
          `SELECT td.*, u.name AS user_name, u.email AS user_email
           FROM trusted_devices td
           JOIN users u ON u.id = td.user_id
           WHERE td.user_id = ? AND td.revoked_at IS NULL
           ORDER BY td.last_used_at DESC, td.created_at DESC`,
        )
        .all(userId) as Record<string, unknown>[])
    : (db
        .prepare(
          `SELECT td.*, u.name AS user_name, u.email AS user_email
           FROM trusted_devices td
           JOIN users u ON u.id = td.user_id
           WHERE td.revoked_at IS NULL
           ORDER BY td.last_used_at DESC, td.created_at DESC`,
        )
        .all() as Record<string, unknown>[])
  return rows
}

export async function revokeTrustedDevice(id: number): Promise<boolean> {
  const result = db
    .prepare(`UPDATE trusted_devices SET revoked_at = ? WHERE id = ? AND revoked_at IS NULL`)
    .run(new Date().toISOString(), id)
  return result.changes > 0
}

export async function revokeAllTrustedDevicesForUser(userId: number) {
  db.prepare(`UPDATE trusted_devices SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL`).run(
    new Date().toISOString(),
    userId,
  )
}

export async function updateUserStarDraw(id: number, enabled: boolean): Promise<PublicUser | undefined> {
  if (enabled) {
    db.prepare(
      `UPDATE users
       SET star_draw_enabled = 1, star_draw_requested_at = NULL
       WHERE id = ? AND role = 'user'`,
    ).run(id)
  } else {
    db.prepare(`UPDATE users SET star_draw_enabled = 0 WHERE id = ? AND role = 'user'`).run(id)
  }
  const row = await findUserById(id)
  return row ? toPublicUser(row) : undefined
}

export async function updateUserDailyChartLimit(
  id: number,
  limit: number,
): Promise<PublicUser | undefined> {
  db.prepare(`UPDATE users SET daily_chart_limit = ? WHERE id = ? AND role = 'user'`).run(limit, id)
  const row = await findUserById(id)
  return row ? toPublicUser(row) : undefined
}

export async function requestUserStarDraw(id: number): Promise<PublicUser | undefined> {
  db.prepare(
    `UPDATE users
     SET star_draw_requested_at = COALESCE(star_draw_requested_at, ?)
     WHERE id = ? AND role = 'user' AND star_draw_enabled = 0`,
  ).run(new Date().toISOString(), id)
  const row = await findUserById(id)
  return row ? toPublicUser(row) : undefined
}

export async function deleteUser(id: number): Promise<boolean> {
  const result = db.prepare('DELETE FROM users WHERE id = ?').run(id)
  return result.changes > 0
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
  const rows = db
    .prepare(
      `SELECT sc.*, cg.name AS group_name
       FROM saved_charts sc
       LEFT JOIN chart_groups cg ON cg.id = sc.group_id
       WHERE sc.user_id = ?
         AND (? IS NULL OR sc.group_id = ?)
         AND (
           ? IS NULL
           OR sc.subject_name LIKE ?
           OR sc.phone LIKE ?
           OR cg.name LIKE ?
         )
       ORDER BY sc.updated_at DESC, sc.id DESC`,
    )
    .all(
      userId,
      groupId ?? null,
      groupId ?? null,
      like,
      like,
      like,
      like,
    ) as unknown as Record<string, unknown>[]
  return rows.map((row) => mapSavedChartListRow(row))
}

export async function listChartGroupsByUser(userId: number): Promise<import('../types.js').ChartGroupSummary[]> {
  const rows = db
    .prepare(
      `SELECT g.id, g.name, g.created_at, g.updated_at,
              COUNT(sc.id) AS chart_count,
              cgs.id AS incoming_share_id,
              ou.name AS share_owner_name,
              cgs.source_updated_at AS share_source_updated_at,
              cgs.last_synced_at AS share_last_synced_at
       FROM chart_groups g
       LEFT JOIN saved_charts sc ON sc.group_id = g.id AND sc.user_id = g.user_id
       LEFT JOIN chart_group_shares cgs ON cgs.mirror_group_id = g.id AND cgs.recipient_user_id = g.user_id
       LEFT JOIN users ou ON ou.id = cgs.owner_user_id
       WHERE g.user_id = ?
       GROUP BY g.id
       ORDER BY g.name COLLATE NOCASE ASC`,
    )
    .all(userId) as unknown as Record<string, unknown>[]
  return rows.map((row) => ({
    id: Number(row.id),
    name: String(row.name),
    chartCount: Number(row.chart_count ?? 0),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    isSharedIncoming: row.incoming_share_id != null,
    incomingShareId: row.incoming_share_id != null ? Number(row.incoming_share_id) : null,
    shareOwnerName: row.share_owner_name != null ? String(row.share_owner_name) : null,
    shareSourceUpdatedAt:
      row.share_source_updated_at != null ? String(row.share_source_updated_at) : null,
    shareLastSyncedAt: row.share_last_synced_at != null ? String(row.share_last_synced_at) : null,
    shareNeedsSync: computeShareNeedsSync(row.share_source_updated_at, row.share_last_synced_at),
  }))
}

function computeShareNeedsSync(sourceUpdated: unknown, lastSynced: unknown): boolean {
  if (sourceUpdated == null) return false
  if (lastSynced == null || lastSynced === '') return true
  const sourceMs = Date.parse(String(sourceUpdated))
  const syncedMs = Date.parse(String(lastSynced))
  if (Number.isNaN(sourceMs)) return false
  if (Number.isNaN(syncedMs)) return true
  return sourceMs > syncedMs
}

export async function createChartGroup(userId: number, name: string): Promise<import('../types.js').ChartGroupSummary> {
  const trimmed = name.trim()
  const result = db
    .prepare(`INSERT INTO chart_groups (user_id, name) VALUES (?, ?)`)
    .run(userId, trimmed)
  const id = Number(result.lastInsertRowid)
  const row = db.prepare('SELECT * FROM chart_groups WHERE id = ?').get(id) as Record<string, unknown>
  return {
    id,
    name: String(row.name),
    chartCount: 0,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  }
}

export async function findChartGroupForUser(
  groupId: number,
  userId: number,
): Promise<{ id: number; name: string } | undefined> {
  const row = db
    .prepare('SELECT id, name FROM chart_groups WHERE id = ? AND user_id = ?')
    .get(groupId, userId) as Record<string, unknown> | undefined
  if (!row) return undefined
  return { id: Number(row.id), name: String(row.name) }
}

export async function renameChartGroup(
  groupId: number,
  userId: number,
  name: string,
): Promise<import('../types.js').ChartGroupSummary | undefined> {
  const trimmed = name.trim()
  const result = db
    .prepare(
      `UPDATE chart_groups SET name = ?, updated_at = datetime('now') WHERE id = ? AND user_id = ?`,
    )
    .run(trimmed, groupId, userId)
  if (result.changes === 0) return undefined
  const groups = await listChartGroupsByUser(userId)
  return groups.find((g) => g.id === groupId)
}

export async function deleteChartGroup(groupId: number, userId: number): Promise<boolean> {
  const incoming = db
    .prepare('SELECT id FROM chart_group_shares WHERE mirror_group_id = ? AND recipient_user_id = ?')
    .get(groupId, userId)
  if (incoming) return false
  const result = db.prepare('DELETE FROM chart_groups WHERE id = ? AND user_id = ?').run(groupId, userId)
  return result.changes > 0
}

export async function assignChartsToGroup(
  userId: number,
  groupId: number,
  chartIds: number[],
): Promise<number> {
  const group = await findChartGroupForUser(groupId, userId)
  if (!group) return 0
  let updated = 0
  const stmt = db.prepare(
    `UPDATE saved_charts SET group_id = ?, updated_at = datetime('now') WHERE id = ? AND user_id = ?`,
  )
  for (const chartId of chartIds) {
    const chart = await findSavedChartForUser(chartId, userId)
    if (!chart || chart.share_id != null) continue
    const r = stmt.run(groupId, chartId, userId)
    updated += Number(r.changes)
  }
  db.prepare(`UPDATE chart_groups SET updated_at = datetime('now') WHERE id = ?`).run(groupId)
  await bumpChartGroupSharesSourceUpdated(groupId)
  return updated
}

export async function removeChartsFromGroup(userId: number, chartIds: number[]): Promise<number> {
  let updated = 0
  const stmt = db.prepare(
    `UPDATE saved_charts SET group_id = NULL, updated_at = datetime('now') WHERE id = ? AND user_id = ? AND share_id IS NULL`,
  )
  const touchedGroups = new Set<number>()
  for (const chartId of chartIds) {
    const chart = await findSavedChartForUser(chartId, userId)
    if (chart?.group_id != null) touchedGroups.add(chart.group_id)
    const r = stmt.run(chartId, userId)
    updated += Number(r.changes)
  }
  for (const gid of touchedGroups) {
    await bumpChartGroupSharesSourceUpdated(gid)
  }
  return updated
}

export async function findSavedChartById(id: number): Promise<SavedChartRow | undefined> {
  const row = db.prepare('SELECT * FROM saved_charts WHERE id = ?').get(id)
  return row ? mapSavedChartRow(row as Record<string, unknown>) : undefined
}

export async function findSavedChartForUser(id: number, userId: number): Promise<SavedChartRow | undefined> {
  const row = db.prepare('SELECT * FROM saved_charts WHERE id = ? AND user_id = ?').get(id, userId)
  return row ? mapSavedChartRow(row as Record<string, unknown>) : undefined
}

export async function createSavedChart(userId: number, payload: SavedChartPayload): Promise<SavedChartDetail> {
  const name = payload.name.trim()
  const bazi = payload.bazi.trim()
  const payloadJson = JSON.stringify(payload)
  const result = db
    .prepare(
      `INSERT INTO saved_charts (user_id, subject_name, gender, bazi, payload)
       VALUES (?, ?, ?, ?, ?)`,
    )
    .run(userId, name, payload.gender, bazi, payloadJson)
  const row = await findSavedChartById(Number(result.lastInsertRowid))
  if (!row) throw new Error('儲存命盤失敗')
  return toSavedChartDetail(row)
}

export async function deleteSavedChart(id: number, userId: number): Promise<boolean> {
  const existing = await findSavedChartForUser(id, userId)
  if (!existing) return false
  const result = db
    .prepare('DELETE FROM saved_charts WHERE id = ? AND user_id = ? AND share_id IS NULL')
    .run(id, userId)
  if (result.changes > 0 && existing.group_id != null) {
    await bumpChartGroupSharesSourceUpdated(existing.group_id)
  }
  return result.changes > 0
}

export async function updateSavedChart(
  id: number,
  userId: number,
  updates: { phone?: string; payload?: SavedChartPayload },
): Promise<SavedChartDetail | undefined> {
  const existing = await findSavedChartForUser(id, userId)
  if (!existing) return undefined
  if (existing.share_id != null) return undefined

  const phone = updates.phone !== undefined ? updates.phone.trim() : existing.phone ?? ''
  const payload = updates.payload ?? parseSavedChartPayload(existing.payload)
  const payloadJson = JSON.stringify(payload)

  const result = db
    .prepare(
      `UPDATE saved_charts
       SET subject_name = ?, gender = ?, bazi = ?, payload = ?, phone = ?, updated_at = datetime('now')
       WHERE id = ? AND user_id = ?`,
    )
    .run(payload.name.trim(), payload.gender, payload.bazi.trim(), payloadJson, phone, id, userId)
  if (result.changes === 0) return undefined
  if (existing.group_id != null) {
    await bumpChartGroupSharesSourceUpdated(existing.group_id)
  }
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
  const result = db
    .prepare(
      `INSERT INTO payment_orders (user_id, merchant_order_no, plan_id, amount, status)
       VALUES (?, ?, ?, ?, 'pending')`,
    )
    .run(userId, merchantOrderNo, planId, amount)
  const row = db.prepare('SELECT * FROM payment_orders WHERE id = ?').get(Number(result.lastInsertRowid))
  if (!row) throw new Error('建立訂單失敗')
  return mapPaymentOrderRow(row as Record<string, unknown>)
}

export async function findPaymentOrderByMerchantOrderNo(
  merchantOrderNo: string,
): Promise<PaymentOrderRow | undefined> {
  const row = db.prepare('SELECT * FROM payment_orders WHERE merchant_order_no = ?').get(merchantOrderNo)
  return row ? mapPaymentOrderRow(row as Record<string, unknown>) : undefined
}

export async function markPaymentOrderPaid(
  merchantOrderNo: string,
  newebpayTradeNo: string,
): Promise<PaymentOrderRow | undefined> {
  db.prepare(
    `UPDATE payment_orders
     SET status = 'paid', newebpay_trade_no = ?, paid_at = datetime('now')
     WHERE merchant_order_no = ? AND status = 'pending'`,
  ).run(newebpayTradeNo, merchantOrderNo)
  return findPaymentOrderByMerchantOrderNo(merchantOrderNo)
}

export async function grantUserMembership(userId: number, planId: string): Promise<PublicUser | undefined> {
  const user = await findUserById(userId)
  if (!user || user.role !== 'user') return undefined

  const grant = resolveMembershipGrant(user, planId)
  if (!grant) return undefined

  db.prepare(
    `UPDATE users
     SET status = 'approved',
         approved_at = COALESCE(approved_at, datetime('now')),
         membership_plan = ?,
         membership_expires_at = ?
     WHERE id = ?`,
  ).run(grant.planId, grant.expiresAt, userId)

  const row = await findUserById(userId)
  return row ? toPublicUser(row) : undefined
}

export async function revokeUserMembership(userId: number): Promise<PublicUser | undefined> {
  const user = await findUserById(userId)
  if (!user || user.role !== 'user') return undefined

  db.prepare(
    `UPDATE users
     SET membership_plan = NULL,
         membership_expires_at = NULL
     WHERE id = ?`,
  ).run(userId)

  const row = await findUserById(userId)
  return row ? toPublicUser(row) : undefined
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
    createdAt: String(row.created_at),
  }
}

export async function createAdminAuditLog(input: AdminAuditLogInput): Promise<PublicAdminAuditLog> {
  const details = input.details ? JSON.stringify(input.details) : null
  const result = db
    .prepare(
      `INSERT INTO admin_audit_logs (admin_id, admin_name, target_user_id, target_user_name, action, details)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run(
      input.adminId,
      input.adminName,
      input.targetUserId ?? null,
      input.targetUserName ?? null,
      input.action,
      details,
    )
  const row = db.prepare('SELECT * FROM admin_audit_logs WHERE id = ?').get(result.lastInsertRowid)
  return mapAuditLogRow(row as Record<string, unknown>)
}

export async function listAdminAuditLogs(limit = 50): Promise<PublicAdminAuditLog[]> {
  const rows = db
    .prepare('SELECT * FROM admin_audit_logs ORDER BY created_at DESC, id DESC LIMIT ?')
    .all(Math.min(Math.max(limit, 1), 200))
  return rows.map((row) => mapAuditLogRow(row as Record<string, unknown>))
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

  db.prepare(
    `UPDATE users
     SET status = 'approved',
         approved_at = COALESCE(approved_at, datetime('now')),
         membership_plan = ?,
         membership_expires_at = ?
     WHERE id = ?`,
  ).run(planId, expiresAt, userId)

  const row = await findUserById(userId)
  return row ? toPublicUser(row) : undefined
}

export async function fulfillPaymentOrder(order: PaymentOrderRow): Promise<PublicUser | undefined> {
  return grantUserMembership(order.user_id, order.plan_id)
}

export async function consumeDailyChartGeneration(userId: number) {
  const row = await findUserById(userId)
  if (!row) throw new Error('找不到使用者')

  if (dailyChartQuotaForUser(row) === null) {
    return { allowed: true as const, quota: null }
  }

  if (!canGenerateChartToday(row)) {
    return { allowed: false as const, quota: dailyChartQuotaForUser(row)! }
  }

  const today = taipeiDateString()
  const nextCount = row.daily_chart_gen_date === today ? row.daily_chart_gen_count + 1 : 1

  db.prepare(`UPDATE users SET daily_chart_gen_date = ?, daily_chart_gen_count = ? WHERE id = ?`).run(
    today,
    nextCount,
    userId,
  )

  const updated = await findUserById(userId)
  if (!updated) throw new Error('找不到使用者')
  return { allowed: true as const, quota: dailyChartQuotaForUser(updated)! }
}

export async function getGuestAiQuota(ip: string) {
  const today = taipeiDateString()
  const limit = GUEST_DAILY_AI_LIMIT
  const row = db
    .prepare('SELECT count FROM guest_ai_usage WHERE ip = ? AND usage_date = ?')
    .get(ip, today) as { count: number } | undefined
  const used = row?.count ?? 0
  return {
    allowed: used < limit,
    quota: { used, limit, remaining: Math.max(0, limit - used) },
  }
}

export async function incrementGuestAiQuota(ip: string) {
  const today = taipeiDateString()
  const limit = GUEST_DAILY_AI_LIMIT
  const row = db
    .prepare('SELECT count FROM guest_ai_usage WHERE ip = ? AND usage_date = ?')
    .get(ip, today) as { count: number } | undefined
  const used = row?.count ?? 0
  const next = used + 1
  db.prepare(
    `INSERT INTO guest_ai_usage (ip, usage_date, count) VALUES (?, ?, ?)
     ON CONFLICT(ip, usage_date) DO UPDATE SET count = excluded.count`,
  ).run(ip, today, next)
  return { used: next, limit, remaining: Math.max(0, limit - next) }
}

function mapChartGroupShareRow(row: Record<string, unknown>): ChartGroupShareRow {
  return {
    id: Number(row.id),
    owner_user_id: Number(row.owner_user_id),
    source_group_id: Number(row.source_group_id),
    recipient_user_id: Number(row.recipient_user_id),
    mirror_group_id: row.mirror_group_id != null ? Number(row.mirror_group_id) : null,
    source_updated_at: String(row.source_updated_at ?? row.updated_at),
    last_synced_at:
      row.last_synced_at != null && String(row.last_synced_at) !== '' ? String(row.last_synced_at) : null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  }
}

export async function bumpChartGroupSharesSourceUpdated(sourceGroupId: number): Promise<void> {
  db.prepare(
    `UPDATE chart_group_shares SET source_updated_at = datetime('now'), updated_at = datetime('now') WHERE source_group_id = ?`,
  ).run(sourceGroupId)
}

export async function setChartGroupShareLastSynced(shareId: number): Promise<void> {
  db.prepare(
    `UPDATE chart_group_shares SET last_synced_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`,
  ).run(shareId)
}

export async function findChartGroupShareByTriple(
  ownerUserId: number,
  sourceGroupId: number,
  recipientUserId: number,
): Promise<ChartGroupShareRow | undefined> {
  const row = db
    .prepare(
      `SELECT * FROM chart_group_shares
       WHERE owner_user_id = ? AND source_group_id = ? AND recipient_user_id = ?`,
    )
    .get(ownerUserId, sourceGroupId, recipientUserId) as Record<string, unknown> | undefined
  return row ? mapChartGroupShareRow(row) : undefined
}

export async function findChartGroupShareById(shareId: number): Promise<ChartGroupShareRow | undefined> {
  const row = db.prepare('SELECT * FROM chart_group_shares WHERE id = ?').get(shareId) as
    | Record<string, unknown>
    | undefined
  return row ? mapChartGroupShareRow(row) : undefined
}

export async function createChartGroupShareRecord(
  ownerUserId: number,
  sourceGroupId: number,
  recipientUserId: number,
): Promise<ChartGroupShareRow> {
  const result = db
    .prepare(
      `INSERT INTO chart_group_shares (owner_user_id, source_group_id, recipient_user_id)
       VALUES (?, ?, ?)`,
    )
    .run(ownerUserId, sourceGroupId, recipientUserId)
  const row = db.prepare('SELECT * FROM chart_group_shares WHERE id = ?').get(Number(result.lastInsertRowid))
  if (!row) throw new Error('建立分享關係失敗')
  return mapChartGroupShareRow(row as Record<string, unknown>)
}

export async function setChartGroupShareMirrorGroup(shareId: number, mirrorGroupId: number): Promise<void> {
  db.prepare(
    `UPDATE chart_group_shares SET mirror_group_id = ?, updated_at = datetime('now') WHERE id = ?`,
  ).run(mirrorGroupId, shareId)
}

export async function touchChartGroupShareUpdatedAt(shareId: number): Promise<void> {
  db.prepare(`UPDATE chart_group_shares SET updated_at = datetime('now') WHERE id = ?`).run(shareId)
}

export async function listMirroredChartsByShareId(shareId: number): Promise<SavedChartRow[]> {
  const rows = db
    .prepare('SELECT * FROM saved_charts WHERE share_id = ? ORDER BY id ASC')
    .all(shareId) as Record<string, unknown>[]
  return rows.map((row) => mapSavedChartRow(row))
}

export async function insertMirroredSavedChart(
  userId: number,
  payload: SavedChartPayload,
  phone: string,
  groupId: number,
  shareId: number,
  sharedFromChartId: number,
): Promise<SavedChartDetail> {
  const name = payload.name.trim()
  const bazi = payload.bazi.trim()
  const payloadJson = JSON.stringify(payload)
  const result = db
    .prepare(
      `INSERT INTO saved_charts (user_id, subject_name, gender, bazi, payload, phone, group_id, share_id, shared_from_chart_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(userId, name, payload.gender, bazi, payloadJson, phone.trim(), groupId, shareId, sharedFromChartId)
  const row = await findSavedChartById(Number(result.lastInsertRowid))
  if (!row) throw new Error('建立分享命盤失敗')
  return toSavedChartDetail(row)
}

export async function updateMirroredSavedChart(
  mirrorChartId: number,
  userId: number,
  payload: SavedChartPayload,
  phone: string,
): Promise<void> {
  const payloadJson = JSON.stringify(payload)
  db.prepare(
    `UPDATE saved_charts
     SET subject_name = ?, gender = ?, bazi = ?, payload = ?, phone = ?, updated_at = datetime('now')
     WHERE id = ? AND user_id = ? AND share_id IS NOT NULL`,
  ).run(payload.name.trim(), payload.gender, payload.bazi.trim(), payloadJson, phone.trim(), mirrorChartId, userId)
}

export async function deleteMirroredChartsByShareNotInSources(
  shareId: number,
  userId: number,
  keepSourceChartIds: number[],
): Promise<number> {
  const mirrors = await listMirroredChartsByShareId(shareId)
  let removed = 0
  for (const m of mirrors) {
    if (m.user_id !== userId) continue
    const srcId = m.shared_from_chart_id
    if (srcId != null && keepSourceChartIds.includes(srcId)) continue
    const r = db.prepare('DELETE FROM saved_charts WHERE id = ? AND user_id = ? AND share_id = ?').run(
      m.id,
      userId,
      shareId,
    )
    removed += Number(r.changes)
  }
  return removed
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
  db.prepare(
    `INSERT INTO users (name, phone, email, password_hash, status, role, is_super_admin, approved_at)
     VALUES (?, ?, ?, ?, 'approved', 'admin', 0, datetime('now'))`,
  ).run(name, phone, email, passwordHash)
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
  db.prepare(
    `UPDATE users
     SET role = 'admin', is_super_admin = 1, status = 'approved',
         approved_at = COALESCE(approved_at, datetime('now'))
     WHERE id = ?`,
  ).run(user.id)
  console.log(`[auth] 已設定超級管理員：${email}`)
}
