import { Router } from 'express'
import { requireAuth } from '../middleware.js'

const router = Router()

router.get('/access', requireAuth, (req, res) => {
  const user = req.authUser
  if (!user) {
    res.status(401).json({ error: '請先登入' })
    return
  }
  if (user.status !== 'approved') {
    res.status(403).json({ error: '會員帳號尚未開通' })
    return
  }
  if (user.role !== 'admin' && !user.starDrawEnabled) {
    res.status(403).json({ error: '尚未開通神牌功能，請聯絡管理員' })
    return
  }
  res.json({ ok: true })
})

export default router
