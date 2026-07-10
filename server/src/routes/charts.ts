import { Router } from 'express'
import {
  createSavedChart,
  deleteSavedChart,
  findSavedChartForUser,
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

router.get('/', (req, res) => {
  const search = typeof req.query.q === 'string' ? req.query.q : undefined
  const charts = listSavedChartsByUser(req.authUser!.id, search)
  res.json({ charts })
})

router.post('/', (req, res) => {
  const payload = validatePayload(req.body?.payload ?? req.body)
  if (!payload) {
    res.status(400).json({ error: '命盤資料不完整或格式錯誤' })
    return
  }

  const chart = createSavedChart(req.authUser!.id, payload)
  res.status(201).json({ chart })
})

router.get('/:id', (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: '無效的命盤 ID' })
    return
  }

  const row = findSavedChartForUser(id, req.authUser!.id)
  if (!row) {
    res.status(404).json({ error: '找不到命盤' })
    return
  }

  res.json({
    chart: {
      id: row.id,
      subjectName: row.subject_name,
      gender: row.gender,
      bazi: row.bazi,
      payload: JSON.parse(row.payload) as SavedChartPayload,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    },
  })
})

router.delete('/:id', (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: '無效的命盤 ID' })
    return
  }

  if (!deleteSavedChart(id, req.authUser!.id)) {
    res.status(404).json({ error: '找不到命盤' })
    return
  }

  res.json({ message: '命盤已刪除' })
})

export default router
