import type { SavedChartPayload } from './types.js'

export function validateChartPayload(body: unknown): SavedChartPayload | null {
  if (!body || typeof body !== 'object') return null
  const p = body as Partial<SavedChartPayload>
  const name = String(p.name ?? '').trim()
  const gender = p.gender
  const calendar = p.calendar
  const date = String(p.date ?? '').trim()
  const timeIndex = Number(p.timeIndex)
  const isLeap = Boolean(p.isLeap)
  const initialChartType = p.initialChartType ?? 'natal'
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
