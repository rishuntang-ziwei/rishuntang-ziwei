import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { memberSummary, parseMemberSegment, segmentMembers, toAdminMemberRow } from '../adminMembers.js'
import { formatBirthDateTime } from '../chartFormat.js'
import {
  countAdmins,
  deleteUser,
  findUserById,
  getSavedChartDetailForUser,
  listSavedChartsByUser,
  listUsers,
  updateUserPassword,
  updateUserRole,
  updateUserStarDraw,
  updateUserStatus,
} from '../db.js'
import { parseSavedChartPayload } from '../db/shared.js'
import { requireAdmin, requireAuth } from '../middleware.js'

const router = Router()

router.use(requireAuth, requireAdmin)

router.get('/users', async (_req, res) => {
  res.json({ users: await listUsers() })
})

router.get('/members/summary', async (_req, res) => {
  const users = await listUsers()
  res.json({ summary: memberSummary(users) })
})

router.get('/members/:segment', async (req, res) => {
  const segment = parseMemberSegment(String(req.params.segment))
  if (!segment) {
    res.status(400).json({ error: '無效的會員分類' })
    return
  }

  const users = await listUsers()
  const members = segmentMembers(users, segment).map(toAdminMemberRow)
  res.json({
    segment,
    members,
    total: members.length,
    summary: memberSummary(users),
  })
})

router.get('/users/:id/charts', async (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: '無效的使用者 ID' })
    return
  }

  const target = await findUserById(id)
  if (!target) {
    res.status(404).json({ error: '找不到使用者' })
    return
  }

  const search = typeof req.query.q === 'string' ? req.query.q : undefined
  const charts = await listSavedChartsByUser(id, search)
  res.json({
    user: {
      id: target.id,
      name: target.name,
      email: target.email,
    },
    charts,
  })
})

router.get('/users/:id/charts/:chartId', async (req, res) => {
  const userId = Number(req.params.id)
  const chartId = Number(req.params.chartId)
  if (!Number.isFinite(userId) || !Number.isFinite(chartId)) {
    res.status(400).json({ error: '無效的 ID' })
    return
  }

  const target = await findUserById(userId)
  if (!target) {
    res.status(404).json({ error: '找不到使用者' })
    return
  }

  const chart = await getSavedChartDetailForUser(chartId, userId)
  if (!chart) {
    res.status(404).json({ error: '找不到命盤' })
    return
  }

  res.json({ chart })
})

router.get('/users/:id/birth-chart', async (req, res) => {
  const userId = Number(req.params.id)
  if (!Number.isFinite(userId)) {
    res.status(400).json({ error: '無效的使用者 ID' })
    return
  }

  const target = await findUserById(userId)
  if (!target) {
    res.status(404).json({ error: '找不到使用者' })
    return
  }
  if (!target.birth_payload) {
    res.status(404).json({ error: '此會員尚未登記出生資料' })
    return
  }

  let payload
  try {
    payload = parseSavedChartPayload(target.birth_payload)
  } catch {
    res.status(500).json({ error: '出生資料格式錯誤' })
    return
  }

  res.json({
    chart: {
      subjectName: payload.name,
      gender: payload.gender,
      birthDateTime: formatBirthDateTime(payload),
      payload,
      source: 'registration' as const,
    },
  })
})

router.post('/users/:id/approve', async (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: '無效的使用者 ID' })
    return
  }
  const user = await updateUserStatus(id, 'approved')
  if (!user) {
    res.status(404).json({ error: '找不到使用者' })
    return
  }
  res.json({ user })
})

router.post('/users/:id/reject', async (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: '無效的使用者 ID' })
    return
  }
  const user = await updateUserStatus(id, 'rejected')
  if (!user) {
    res.status(404).json({ error: '找不到使用者' })
    return
  }
  res.json({ user })
})

router.post('/users/:id/reset-password', async (req, res) => {
  const id = Number(req.params.id)
  const password = String(req.body?.password ?? '')

  if (!Number.isFinite(id)) {
    res.status(400).json({ error: '無效的使用者 ID' })
    return
  }
  if (password.length < 8) {
    res.status(400).json({ error: '密碼至少 8 個字元' })
    return
  }

  const target = await findUserById(id)
  if (!target || target.role === 'admin') {
    res.status(404).json({ error: '找不到使用者' })
    return
  }

  const passwordHash = await bcrypt.hash(password, 10)
  const user = await updateUserPassword(id, passwordHash)
  if (!user) {
    res.status(404).json({ error: '找不到使用者' })
    return
  }
  res.json({ message: '密碼已重設', user })
})

router.post('/users/:id/make-admin', async (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: '無效的使用者 ID' })
    return
  }

  const target = await findUserById(id)
  if (!target) {
    res.status(404).json({ error: '找不到使用者' })
    return
  }
  if (target.role === 'admin') {
    res.status(400).json({ error: '此帳號已是管理員' })
    return
  }
  if (target.status === 'rejected') {
    res.status(400).json({ error: '已拒絕的帳號需先重新開通，才能設為管理員' })
    return
  }

  const user = await updateUserRole(id, 'admin')
  if (!user) {
    res.status(404).json({ error: '找不到使用者' })
    return
  }
  res.json({ message: '已設為管理員', user })
})

router.post('/users/:id/revoke-admin', async (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: '無效的使用者 ID' })
    return
  }
  if (req.authUser?.id === id) {
    res.status(400).json({ error: '無法取消自己的管理員權限' })
    return
  }

  const target = await findUserById(id)
  if (!target || target.role !== 'admin') {
    res.status(404).json({ error: '找不到管理員帳號' })
    return
  }
  if ((await countAdmins()) <= 1) {
    res.status(400).json({ error: '至少需要保留一位管理員' })
    return
  }

  const user = await updateUserRole(id, 'user')
  if (!user) {
    res.status(404).json({ error: '找不到使用者' })
    return
  }
  res.json({ message: '已取消管理員權限', user })
})

router.post('/users/:id/enable-star-draw', async (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: '無效的使用者 ID' })
    return
  }

  const target = await findUserById(id)
  if (!target || target.role !== 'user') {
    res.status(404).json({ error: '找不到會員帳號' })
    return
  }
  if (target.status !== 'approved') {
    res.status(400).json({ error: '請先開通會員帳號，再啟用神牌功能' })
    return
  }

  const user = await updateUserStarDraw(id, true)
  if (!user) {
    res.status(404).json({ error: '找不到會員帳號' })
    return
  }
  res.json({ message: '已開通神牌功能', user })
})

router.post('/users/:id/disable-star-draw', async (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: '無效的使用者 ID' })
    return
  }

  const target = await findUserById(id)
  if (!target || target.role !== 'user') {
    res.status(404).json({ error: '找不到會員帳號' })
    return
  }

  const user = await updateUserStarDraw(id, false)
  if (!user) {
    res.status(404).json({ error: '找不到會員帳號' })
    return
  }
  res.json({ message: '已取消神牌功能', user })
})

router.delete('/users/:id', async (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: '無效的使用者 ID' })
    return
  }
  if (req.authUser?.id === id) {
    res.status(400).json({ error: '無法刪除自己的帳號' })
    return
  }

  const target = await findUserById(id)
  if (!target) {
    res.status(404).json({ error: '找不到使用者' })
    return
  }
  if (target.role === 'admin') {
    res.status(400).json({ error: '請先取消管理員權限，再刪除帳號' })
    return
  }

  if (!(await deleteUser(id))) {
    res.status(404).json({ error: '找不到使用者' })
    return
  }
  res.json({ message: '帳號已刪除' })
})

export default router
