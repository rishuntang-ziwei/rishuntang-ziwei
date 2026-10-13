import { Router } from 'express'
import {
  assignChartsToGroup,
  createChartGroup,
  createSavedChart,
  deleteChartGroup,
  deleteSavedChart,
  getSavedChartDetailForUser,
  listChartGroupsByUser,
  listSavedChartsByUser,
  removeChartsFromGroup,
  renameChartGroup,
  updateSavedChart,
} from '../db.js'
import { requireAuth, requireActiveMember } from '../middleware.js'
import { validateChartPayload } from '../chartPayload.js'
import type { SavedChartPayload } from '../types.js'

const router = Router()

router.use(requireAuth)
router.use(requireActiveMember)

function normalizeGroupName(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const name = raw.trim()
  if (!name || name.length > 40) return null
  return name
}

function normalizeChartIds(raw: unknown): number[] | null {
  if (!Array.isArray(raw)) return null
  const ids = raw.map((v) => Number(v)).filter((id) => Number.isFinite(id) && id > 0)
  if (!ids.length) return null
  return [...new Set(ids)].slice(0, 200)
}

router.get('/groups', async (req, res) => {
  const groups = await listChartGroupsByUser(req.authUser!.id)
  res.json({ groups })
})

router.post('/groups', async (req, res) => {
  const name = normalizeGroupName(req.body?.name)
  if (!name) {
    res.status(400).json({ error: '請輸入有效的資料夾名稱（1–40 字）' })
    return
  }
  try {
    const group = await createChartGroup(req.authUser!.id, name)
    res.status(201).json({ group })
  } catch (err) {
    const message = err instanceof Error ? err.message : ''
    if (message.includes('UNIQUE') || message.includes('unique')) {
      res.status(409).json({ error: '已有相同名稱的資料夾' })
      return
    }
    console.error('[charts/groups POST]', err)
    res.status(500).json({ error: '建立資料夾失敗' })
  }
})

router.patch('/groups/:groupId', async (req, res) => {
  const groupId = Number(req.params.groupId)
  if (!Number.isFinite(groupId)) {
    res.status(400).json({ error: '無效的資料夾 ID' })
    return
  }
  const name = normalizeGroupName(req.body?.name)
  if (!name) {
    res.status(400).json({ error: '請輸入有效的資料夾名稱（1–40 字）' })
    return
  }
  try {
    const group = await renameChartGroup(groupId, req.authUser!.id, name)
    if (!group) {
      res.status(404).json({ error: '找不到資料夾' })
      return
    }
    res.json({ group })
  } catch (err) {
    const message = err instanceof Error ? err.message : ''
    if (message.includes('UNIQUE') || message.includes('unique')) {
      res.status(409).json({ error: '已有相同名稱的資料夾' })
      return
    }
    console.error('[charts/groups PATCH]', err)
    res.status(500).json({ error: '重新命名失敗' })
  }
})

router.delete('/groups/:groupId', async (req, res) => {
  const groupId = Number(req.params.groupId)
  if (!Number.isFinite(groupId)) {
    res.status(400).json({ error: '無效的資料夾 ID' })
    return
  }
  if (!(await deleteChartGroup(groupId, req.authUser!.id))) {
    res.status(404).json({ error: '找不到資料夾' })
    return
  }
  res.json({ message: '資料夾已刪除' })
})

router.put('/groups/:groupId/members', async (req, res) => {
  const groupId = Number(req.params.groupId)
  if (!Number.isFinite(groupId)) {
    res.status(400).json({ error: '無效的資料夾 ID' })
    return
  }
  const chartIds = normalizeChartIds(req.body?.chartIds)
  if (!chartIds) {
    res.status(400).json({ error: '請選擇至少一筆命盤' })
    return
  }
  const updated = await assignChartsToGroup(req.authUser!.id, groupId, chartIds)
  if (updated === 0) {
    res.status(404).json({ error: '找不到資料夾或命盤' })
    return
  }
  res.json({ updated })
})

router.post('/groups/unassign', async (req, res) => {
  const chartIds = normalizeChartIds(req.body?.chartIds)
  if (!chartIds) {
    res.status(400).json({ error: '請選擇至少一筆命盤' })
    return
  }
  const updated = await removeChartsFromGroup(req.authUser!.id, chartIds)
  res.json({ updated })
})

router.get('/', async (req, res) => {
  const search = typeof req.query.q === 'string' ? req.query.q : undefined
  const groupIdRaw = typeof req.query.groupId === 'string' ? Number(req.query.groupId) : undefined
  const groupId = groupIdRaw != null && Number.isFinite(groupIdRaw) ? groupIdRaw : undefined
  const charts = await listSavedChartsByUser(req.authUser!.id, search, groupId)
  res.json({ charts })
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
