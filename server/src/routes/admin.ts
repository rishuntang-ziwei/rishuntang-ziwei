import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { findUserById, listUsers, updateUserPassword, updateUserStatus } from '../db.js'
import { requireAdmin, requireAuth } from '../middleware.js'

const router = Router()

router.use(requireAuth, requireAdmin)

router.get('/users', (_req, res) => {
  res.json({ users: listUsers() })
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

export default router
