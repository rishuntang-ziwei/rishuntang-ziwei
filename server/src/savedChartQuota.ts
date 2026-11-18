import type { UserRow } from './types.js'

/** Default free members cannot persist own charts */
export const FREE_SAVED_CHART_LIMIT = 0
/** Admins may grant designated free members this own-chart save cap */
export const DESIGNATED_FREE_SAVED_CHART_LIMIT = 10

export interface SavedChartQuota {
  used: number
  limit: number
  remaining: number
}

function isPremiumUser(row: Pick<UserRow, 'role' | 'membership_expires_at'>): boolean {
  if (row.role === 'admin') return true
  if (!row.membership_expires_at) return false
  return new Date(row.membership_expires_at).getTime() > Date.now()
}

export function normalizeFreeSavedChartLimit(raw: unknown): number {
  const n = Number(raw)
  if (n === DESIGNATED_FREE_SAVED_CHART_LIMIT) return DESIGNATED_FREE_SAVED_CHART_LIMIT
  return FREE_SAVED_CHART_LIMIT
}

export function freeSavedChartLimitForUser(row: Pick<UserRow, 'saved_chart_limit'>): number {
  return normalizeFreeSavedChartLimit(row.saved_chart_limit)
}

export function savedChartQuotaForUser(
  row: Pick<UserRow, 'role' | 'membership_expires_at' | 'saved_chart_limit'>,
  ownChartCount: number,
): SavedChartQuota | null {
  if (isPremiumUser(row)) return null
  const limit = freeSavedChartLimitForUser(row)
  const used = Math.max(0, Number(ownChartCount) || 0)
  return {
    used,
    limit,
    remaining: Math.max(0, limit - used),
  }
}

export function canSaveOwnChart(
  row: Pick<UserRow, 'role' | 'membership_expires_at' | 'saved_chart_limit'>,
  ownChartCount: number,
): boolean {
  const quota = savedChartQuotaForUser(row, ownChartCount)
  if (!quota) return true
  return quota.remaining > 0
}
