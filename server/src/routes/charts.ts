import { Router } from 'express'
import {
  createSavedChart,
  deleteSavedChart,
  getSavedChartDetailForUser,
  listSavedChartsByUser,
} from '../db.js'
import { requireAuth } from '../middleware.js'
import type { SavedChartPayload } from '../types.js'

const router = Router()

router.use(requireAuth)

function validatePayload(body: unknown): SavedChartPayload | null {
  if (!body || typeof body !== 'object') return null
  const p = body as Partial<SavedChartPayload>
  const name = String(p.name ?? '').trim()
  const gender = p.gender
  const calendar = p.calendar
  const date = String(p.date ?? '').trim()
  const timeIndex = Number(p.timeIndex)
  const isLeap = Boolean(p.isLeap)
  const initialChartType = p.initialChartType
  const yearlyYear = Number(p.yearlyYear)
  const bazi = String(p.bazi ?? '').trim()

  if (!name) return null
  if (gender !== '男' && gender !== '女') return null
  if (calendar !== 'lunar' && calendar !== 'solar') return null
  if (!date) return null
  if (!Number.isInteger(timeIndex) || timeIndex < 0 || timeIndex > 12) return null
  if (initialChartType !== 'natal' && initialChartType !== 'yearly') return null
  if (initialChartType === 'yearly' && (!Number.isFinite(yearlyYear) || yearlyYear < 1900 || yearlyYear > 2100)) {
    return null
  }
  if (!bazi) return null

  return {
    name,
    gender,
    calendar,
    date,
    timeIndex,
    isLeap,
    initialChartType,
    yearlyYear: initialChartType === 'yearly' ? yearlyYear : new Date().getFullYear(),
    bazi,
  }
}

router.get('/', async (req, res) => {
  const search = typeof req.query.q === 'string' ? req.query.q : undefined
  const charts = await listSavedChartsByUser(req.authUser!.id, search)
  res.json({ charts })
})

router.post('/', async (req, res) => {
  const payload = validatePayload(req.body?.payload ?? req.body)
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
