import { DatabaseSync } from 'node:sqlite'
import bcrypt from 'bcryptjs'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type {
  PublicUser,
  SavedChartDetail,
  SavedChartPayload,
  SavedChartRow,
  SavedChartSummary,
  UserRow,
} from './types.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dataDir = process.env.DB_PATH
  ? path.dirname(process.env.DB_PATH)
  : path.join(__dirname, '..', 'data')
const dbPath = process.env.DB_PATH ?? path.join(dataDir, 'app.db')

fs.mkdirSync(dataDir, { recursive: true })

const db = new DatabaseSync(dbPath)

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

function parseSavedChartPayload(raw: string): SavedChartPayload {
  return JSON.parse(raw) as SavedChartPayload
}

function toSavedChartSummary(row: SavedChartRow): SavedChartSummary {
  return {
    id: row.id,
    subjectName: row.subject_name,
    gender: row.gender,
    bazi: row.bazi,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function toSavedChartDetail(row: SavedChartRow): SavedChartDetail {
  return {
    ...toSavedChartSummary(row),
    payload: parseSavedChartPayload(row.payload),
  }
}

function toPublicUser(row: UserRow): PublicUser {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    email: row.email,
    status: row.status,
    role: row.role,
    createdAt: row.created_at,
    approvedAt: row.approved_at,
  }
}

export function findUserByEmail(email: string): UserRow | undefined {
  return db.prepare('SELECT * FROM users WHERE email = ? COLLATE NOCASE').get(email) as UserRow | undefined
}

export function findUserById(id: number): UserRow | undefined {
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id) as UserRow | undefined
}

export function createUser(input: {
  name: string
  phone: string
  email: string
  passwordHash: string
}): PublicUser {
  const result = db
    .prepare(
      `INSERT INTO users (name, phone, email, password_hash, status, role)
       VALUES (?, ?, ?, ?, 'pending', 'user')`,
    )
    .run(input.name.trim(), input.phone.trim(), input.email.trim().toLowerCase(), input.passwordHash)
  const row = findUserById(Number(result.lastInsertRowid))
  if (!row) throw new Error('建立使用者失敗')
  return toPublicUser(row)
}

export function listUsers(): PublicUser[] {
  const rows = db.prepare('SELECT * FROM users ORDER BY created_at DESC').all() as unknown as UserRow[]
  return rows.map(toPublicUser)
}

export function updateUserStatus(id: number, status: 'approved' | 'rejected'): PublicUser | undefined {
  const approvedAt = status === 'approved' ? new Date().toISOString() : null
  db.prepare(`UPDATE users SET status = ?, approved_at = ? WHERE id = ? AND role = 'user'`).run(
    status,
    approvedAt,
    id,
  )
  const row = findUserById(id)
  return row ? toPublicUser(row) : undefined
}

export function updateUserPassword(id: number, passwordHash: string): PublicUser | undefined {
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(passwordHash, id)
  const row = findUserById(id)
  return row ? toPublicUser(row) : undefined
}

export function countAdmins(): number {
  const row = db.prepare("SELECT COUNT(*) AS count FROM users WHERE role = 'admin'").get() as { count: number }
  return row.count
}

export function updateUserRole(id: number, role: 'user' | 'admin'): PublicUser | undefined {
  if (role === 'admin') {
    db.prepare(
      `UPDATE users
       SET role = 'admin', status = 'approved', approved_at = COALESCE(approved_at, datetime('now'))
       WHERE id = ?`,
    ).run(id)
  } else {
    db.prepare(`UPDATE users SET role = 'user' WHERE id = ?`).run(id)
  }
  const row = findUserById(id)
  return row ? toPublicUser(row) : undefined
}

export function deleteUser(id: number): boolean {
  const result = db.prepare('DELETE FROM users WHERE id = ?').run(id)
  return result.changes > 0
}

export function listSavedChartsByUser(userId: number, search?: string): SavedChartSummary[] {
  const q = search?.trim()
  const rows = q
    ? (db
        .prepare(
          `SELECT * FROM saved_charts
           WHERE user_id = ? AND subject_name LIKE ?
           ORDER BY updated_at DESC, id DESC`,
        )
        .all(userId, `%${q}%`) as unknown as SavedChartRow[])
    : (db
        .prepare(
          `SELECT * FROM saved_charts
           WHERE user_id = ?
           ORDER BY updated_at DESC, id DESC`,
        )
        .all(userId) as unknown as SavedChartRow[])
  return rows.map(toSavedChartSummary)
}

export function findSavedChartById(id: number): SavedChartRow | undefined {
  return db.prepare('SELECT * FROM saved_charts WHERE id = ?').get(id) as unknown as SavedChartRow | undefined
}

export function findSavedChartForUser(id: number, userId: number): SavedChartRow | undefined {
  return db
    .prepare('SELECT * FROM saved_charts WHERE id = ? AND user_id = ?')
    .get(id, userId) as unknown as SavedChartRow | undefined
}

export function createSavedChart(userId: number, payload: SavedChartPayload): SavedChartDetail {
  const name = payload.name.trim()
  const bazi = payload.bazi.trim()
  const payloadJson = JSON.stringify(payload)
  const result = db
    .prepare(
      `INSERT INTO saved_charts (user_id, subject_name, gender, bazi, payload)
       VALUES (?, ?, ?, ?, ?)`,
    )
    .run(userId, name, payload.gender, bazi, payloadJson)
  const row = findSavedChartById(Number(result.lastInsertRowid))
  if (!row) throw new Error('儲存命盤失敗')
  return toSavedChartDetail(row)
}

export function deleteSavedChart(id: number, userId: number): boolean {
  const result = db.prepare('DELETE FROM saved_charts WHERE id = ? AND user_id = ?').run(id, userId)
  return result.changes > 0
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

  if (findUserByEmail(email)) return

  const passwordHash = await bcrypt.hash(password, 10)
  db.prepare(
    `INSERT INTO users (name, phone, email, password_hash, status, role, approved_at)
     VALUES (?, ?, ?, ?, 'approved', 'admin', datetime('now'))`,
  ).run(name, phone, email, passwordHash)
  console.log(`[auth] 已建立管理員帳號：${email}`)
}

export { db, toPublicUser }
