import { Router } from 'express'
import { listUsers, updateUserStatus } from '../db.js'
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

export default router
