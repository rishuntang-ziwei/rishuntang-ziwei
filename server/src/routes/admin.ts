import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { countAdmins, deleteUser, findUserById, getSavedChartDetailForUser, listSavedChartsByUser, listUsers, updateUserPassword, updateUserRole, updateUserStatus } from '../db.js'
import { requireAdmin, requireAuth } from '../middleware.js'

const router = Router()

router.use(requireAuth, requireAdmin)

router.get('/users', (_req, res) => {
  res.json({ users: listUsers() })
})

router.get('/users/:id/charts', (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: '無效的使用者 ID' })
    return
  }

  const target = findUserById(id)
  if (!target) {
    res.status(404).json({ error: '找不到使用者' })
    return
  }

  const search = typeof req.query.q === 'string' ? req.query.q : undefined
  const charts = listSavedChartsByUser(id, search)
  res.json({
    user: {
      id: target.id,
      name: target.name,
      email: target.email,
    },
    charts,
  })
})

router.get('/users/:id/charts/:chartId', (req, res) => {
  const userId = Number(req.params.id)
  const chartId = Number(req.params.chartId)
  if (!Number.isFinite(userId) || !Number.isFinite(chartId)) {
    res.status(400).json({ error: '無效的 ID' })
    return
  }

  const target = findUserById(userId)
  if (!target) {
    res.status(404).json({ error: '找不到使用者' })
    return
  }

  const chart = getSavedChartDetailForUser(chartId, userId)
  if (!chart) {
    res.status(404).json({ error: '找不到命盤' })
    return
  }

  res.json({ chart })
})

router.post('/users/:id/approve', (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: '無效的使用者 ID' })
    return
  }
  const user = updateUserStatus(id, 'approved')
  if (!user) {
    res.status(404).json({ error: '找不到使用者' })
    return
  }
  res.json({ user })
})

router.post('/users/:id/reject', (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: '無效的使用者 ID' })
    return
  }
  const user = updateUserStatus(id, 'rejected')
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

  const target = findUserById(id)
  if (!target || target.role === 'admin') {
    res.status(404).json({ error: '找不到使用者' })
    return
  }

  const passwordHash = await bcrypt.hash(password, 10)
  const user = updateUserPassword(id, passwordHash)
  if (!user) {
    res.status(404).json({ error: '找不到使用者' })
    return
  }
  res.json({ message: '密碼已重設', user })
})

router.post('/users/:id/make-admin', (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: '無效的使用者 ID' })
    return
  }

  const target = findUserById(id)
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

  const user = updateUserRole(id, 'admin')
  if (!user) {
    res.status(404).json({ error: '找不到使用者' })
    return
  }
  res.json({ message: '已設為管理員', user })
})

router.post('/users/:id/revoke-admin', (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: '無效的使用者 ID' })
    return
  }
  if (req.authUser?.id === id) {
    res.status(400).json({ error: '無法取消自己的管理員權限' })
    return
  }

  const target = findUserById(id)
  if (!target || target.role !== 'admin') {
    res.status(404).json({ error: '找不到管理員帳號' })
    return
  }
  if (countAdmins() <= 1) {
    res.status(400).json({ error: '至少需要保留一位管理員' })
    return
  }

  const user = updateUserRole(id, 'user')
  if (!user) {
    res.status(404).json({ error: '找不到使用者' })
    return
  }
  res.json({ message: '已取消管理員權限', user })
})

router.delete('/users/:id', (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: '無效的使用者 ID' })
    return
  }
  if (req.authUser?.id === id) {
    res.status(400).json({ error: '無法刪除自己的帳號' })
    return
  }

  const target = findUserById(id)
  if (!target) {
    res.status(404).json({ error: '找不到使用者' })
    return
  }
  if (target.role === 'admin') {
    res.status(400).json({ error: '請先取消管理員權限，再刪除帳號' })
    return
  }

  if (!deleteUser(id)) {
    res.status(404).json({ error: '找不到使用者' })
    return
  }
  res.json({ message: '帳號已刪除' })
})

export default router
