import crypto from 'crypto'
import { Router } from 'express'
import {
  createChartShare,
  createSavedChart,
  deleteSavedChart,
  getSavedChartDetailForUser,
  listSavedChartsByUser,
  updateSavedChart,
} from '../db.js'
import { requireAuth, requireActiveMember } from '../middleware.js'
import { validateChartPayload } from '../chartPayload.js'
import { validateChartShareDocument } from '../chartShare.js'
import type { SavedChartPayload } from '../types.js'

const router = Router()

router.use(requireAuth)
router.use(requireActiveMember)

router.get('/', async (req, res) => {
  const search = typeof req.query.q === 'string' ? req.query.q : undefined
  const charts = await listSavedChartsByUser(req.authUser!.id, search)
  res.json({ charts })
})

router.post('/share', async (req, res) => {
  const document = validateChartShareDocument(req.body?.snapshot)
  if (!document) {
    res.status(400).json({ error: '分享資料不完整或格式錯誤' })
    return
  }

  const rawDays = Number(req.body?.expiresInDays)
  const expiresInDays = Number.isFinite(rawDays) ? Math.min(Math.max(rawDays, 1), 90) : 14
  const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString()
  const token = crypto.randomBytes(24).toString('base64url')

  try {
    const created = await createChartShare(req.authUser!.id, token, document, expiresAt)
    res.status(201).json({
      share: {
        token: created.token,
        expiresAt: created.expiresAt,
        expiresInDays,
      },
    })
  } catch (err) {
    console.error('[charts/share]', err)
    res.status(500).json({ error: '建立分享連結失敗' })
  }
})

router.post('/', async (req, res) => {
  const payload = validateChartPayload(req.body?.payload ?? req.body)
  if (!payload) {
    res.status(400).json({ error: '命盤資料不完整或格式錯誤' })
    return
  }

  const chart = await createSavedChart(req.authUser!.id, payload)
  res.status(201).json({ chart })
})

router.get('/:id', async (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: '無效的命盤 ID' })
    return
  }

  const chart = await getSavedChartDetailForUser(id, req.authUser!.id)
  if (!chart) {
    res.status(404).json({ error: '找不到命盤' })
    return
  }

  res.json({ chart })
})

router.patch('/:id', async (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: '無效的命盤 ID' })
    return
  }

  const phoneProvided = typeof req.body?.phone === 'string'
  const payloadProvided = req.body?.payload != null
  if (!phoneProvided && !payloadProvided) {
    res.status(400).json({ error: '請提供要更新的資料' })
    return
  }

  let phone: string | undefined
  if (phoneProvided) {
    const trimmedPhone = String(req.body.phone).trim()
    if (trimmedPhone.length > 32) {
      res.status(400).json({ error: '電話長度不可超過 32 字' })
      return
    }
    phone = trimmedPhone
  }

  let payload: SavedChartPayload | undefined
  if (payloadProvided) {
    payload = validateChartPayload(req.body.payload) ?? undefined
    if (!payload) {
      res.status(400).json({ error: '命盤資料不完整或格式錯誤' })
      return
    }
  }

  const chart = await updateSavedChart(id, req.authUser!.id, { phone, payload })
  if (!chart) {
    res.status(404).json({ error: '找不到命盤' })
    return
  }

  res.json({ chart })
})

router.delete('/:id', async (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: '無效的命盤 ID' })
    return
  }

  if (!(await deleteSavedChart(id, req.authUser!.id))) {
    res.status(404).json({ error: '找不到命盤' })
    return
  }

  res.json({ message: '命盤已刪除' })
})

export default router
