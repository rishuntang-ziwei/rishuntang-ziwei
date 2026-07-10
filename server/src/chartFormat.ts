import type { SavedChartPayload } from './types.js'

const TIME_LABELS: Record<number, string> = {
  0: '早子時',
  1: '丑時',
  2: '寅時',
  3: '卯時',
  4: '辰時',
  5: '巳時',
  6: '午時',
  7: '未時',
  8: '申時',
  9: '酉時',
  10: '戌時',
  11: '亥時',
  12: '晚子時',
}

export function formatBirthDateTime(payload: SavedChartPayload): string {
  const [y, m, d] = payload.date.split('-').map((part) => Number(part))
  const timeLabel = TIME_LABELS[payload.timeIndex] ?? `${payload.timeIndex}時`
  const leap = payload.isLeap ? '（閏月）' : ''

  if (payload.calendar === 'lunar') {
    return `農曆 ${y}年${m}月${d}日${leap} ${timeLabel}`
  }

  return `國曆 ${y}年${m}月${d}日 ${timeLabel}`
}
