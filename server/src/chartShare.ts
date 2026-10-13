import { validateChartPayload } from './chartPayload.js'
import type { ChartShareDocument, HepanRelationship, SavedChartPayload } from './types.js'

const RELATIONSHIPS = new Set(['love', 'family', 'business', 'general'])

function isViewState(v: unknown): v is NonNullable<ChartShareDocument['viewState']> {
  if (!v || typeof v !== 'object') return false
  const o = v as Record<string, unknown>
  if (typeof o.horoscopeDate !== 'string' || !o.horoscopeDate.trim()) return false
  return true
}

export function validateChartShareDocument(body: unknown): ChartShareDocument | null {
  if (!body || typeof body !== 'object') return null
  const raw = body as Record<string, unknown>
  const subject = validateChartPayload(raw.subject)
  if (!subject) return null

  let partner: SavedChartPayload | undefined
  if (raw.partner != null) {
    partner = validateChartPayload(raw.partner) ?? undefined
    if (!partner) return null
  }

  let viewState: ChartShareDocument['viewState']
  if (raw.viewState != null) {
    if (!isViewState(raw.viewState)) return null
    viewState = {
      horoscopeDate: String(raw.viewState.horoscopeDate).trim(),
      yearlyYear: Number(raw.viewState.yearlyYear) || undefined,
      yearlyMonthSelected: Boolean(raw.viewState.yearlyMonthSelected),
      showYearlyDaily: Boolean(raw.viewState.showYearlyDaily),
      selectedFlowMonth:
        raw.viewState.selectedFlowMonth == null ? null : Number(raw.viewState.selectedFlowMonth),
      showLines: Boolean(raw.viewState.showLines),
    }
  }

  let hepan: ChartShareDocument['hepan']
  if (raw.hepan != null) {
    if (typeof raw.hepan !== 'object') return null
    const rel = (raw.hepan as { relationship?: string }).relationship
    if (!rel || !RELATIONSHIPS.has(rel)) return null
    if (!partner) return null
    hepan = { relationship: rel as HepanRelationship }
  }

  return {
    version: 1,
    subject,
    viewState,
    partner,
    hepan,
  }
}
