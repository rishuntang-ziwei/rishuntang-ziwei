import { Router } from 'express'
import { findUserById, requestUserStarDraw } from '../db/index.js'
import { requireAuth } from '../middleware.js'

const router = Router()

router.get('/access', requireAuth, (req, res) => {
  const user = req.authUser
  if (!user) {
    res.status(401).json({ error: '請先登入' })
    return
  }

  const allowed = user.role === 'admin' || Boolean(user.starDrawEnabled)
  res.json({
    ok: allowed,
    starDrawEnabled: allowed,
    starDrawRequestedAt: user.starDrawRequestedAt,
    starDrawRequestPending: Boolean(user.starDrawRequestPending),
  })
})

router.post('/request-access', requireAuth, async (req, res) => {
  const authUser = req.authUser
  if (!authUser) {
    res.status(401).json({ error: '請先登入' })
    return
  }

  if (authUser.role === 'admin' || authUser.starDrawEnabled) {
    res.json({
      message: '神牌功能已開通',
      user: authUser,
      starDrawEnabled: true,
      starDrawRequestPending: false,
    })
    return
  }

  if (authUser.status !== 'approved') {
    res.status(403).json({ error: '請先完成會員審核，再申請神牌授權' })
    return
  }

  const already = await findUserById(authUser.id)
  if (!already) {
    res.status(404).json({ error: '找不到使用者' })
    return
  }

  const user = await requestUserStarDraw(authUser.id)
  if (!user) {
    res.status(404).json({ error: '找不到使用者' })
    return
  }

  res.json({
    message: user.starDrawRequestPending ? '已送出神牌授權申請，請等候管理員開通' : '申請已送出',
    user,
    starDrawEnabled: user.starDrawEnabled,
    starDrawRequestPending: user.starDrawRequestPending,
  })
})

export default router
