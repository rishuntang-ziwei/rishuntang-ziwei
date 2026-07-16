import type { UserRow } from './types.js'

export const FREE_DAILY_CHART_LIMIT = 3

export function taipeiDateString(date = new Date()): string {
  return date.toLocaleDateString('en-CA', { timeZone: 'Asia/Taipei' })
}

export interface DailyChartQuota {
  used: number
  limit: number
  remaining: number
}

function isPremiumUser(row: UserRow): boolean {
  if (row.role === 'admin') return true
  if (!row.membership_expires_at) return false
  return new Date(row.membership_expires_at).getTime() > Date.now()
}

export function dailyChartQuotaForUser(row: UserRow): DailyChartQuota | null {
  if (isPremiumUser(row)) return null
  const today = taipeiDateString()
  const used = row.daily_chart_gen_date === today ? row.daily_chart_gen_count : 0
  return {
    used,
    limit: FREE_DAILY_CHART_LIMIT,
    remaining: Math.max(0, FREE_DAILY_CHART_LIMIT - used),
  }
}

export function canGenerateChartToday(row: UserRow): boolean {
  const quota = dailyChartQuotaForUser(row)
  if (!quota) return true
  return quota.remaining > 0
}
