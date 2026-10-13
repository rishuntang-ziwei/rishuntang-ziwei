import { Router } from 'express'
import { getChartShareByToken } from '../db.js'

const router = Router()

router.get('/:token', async (req, res) => {
  const token = String(req.params.token || '').trim()
  if (!token || token.length < 16 || token.length > 128) {
    res.status(400).json({ error: '無效的分享連結' })
    return
  }

  const share = await getChartShareByToken(token)
  if (!share) {
    res.status(404).json({ error: '分享連結不存在或已過期' })
    return
  }

  res.json({ share })
})

export default router
