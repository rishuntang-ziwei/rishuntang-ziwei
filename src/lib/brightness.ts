import type FunctionalAstrolabe from 'iztro/lib/astro/FunctionalAstrolabe'
import brightnessTable from '../../vendor/rishuntang-brightness.json'
import type { ChartMode } from './horoscope'

type BrightnessTable = Record<string, Record<string, Array<{ name: string; brightness: string }>>>

const RISHUNTANG_BRIGHTNESS = brightnessTable as BrightnessTable

const CANONICAL = new Set(['廟', '旺', '平', '陷', '閒'])

/** 主星亮度顯示：日舜堂用字（廟旺平陷閒）；利→旺、地→閒 */
export function formatBrightness(brightness?: string): string | undefined {
  if (!brightness) return undefined
  const raw = String(brightness).trim()
  if (raw === '利') return '旺'
  if (raw === '地') return '閒'

  const canonical = new Set(['廟', '旺', '平', '陷', '閒'])
  if (canonical.has(raw)) return raw

  const s = raw.replace(/廟/g, '庙').replace(/閒/g, '闲')

  if (/不得/.test(s) || s === '不') return '平'
  if (/得地/.test(s) || s === '得') return '閒'
  if (/利益/.test(s) || s === '利') return '旺'

  if (/庙|米/.test(s)) return '廟'
  if (/旺/.test(s)) return '旺'
  if (/陷|落/.test(s)) return '陷'
  if (/闲/.test(s)) return '閒'
  if (/地/.test(s)) return '閒'
  if (/平/.test(s)) return '平'

  return '平'
}

export function getZiweiBranch(astrolabe: FunctionalAstrolabe): string | null {
  const palace = astrolabe.palaces.find((p) => p.majorStars.some((star) => star.name === '紫微'))
  return palace?.earthlyBranch ?? null
}

export function lookupRishuntangBrightness(
  ziweiBranch: string | null,
  palaceBranch: string,
  starName: string,
): string | null {
  if (!ziweiBranch) return null
  const stars = RISHUNTANG_BRIGHTNESS[ziweiBranch]?.[palaceBranch]
  if (!stars) return null
  const hit = stars.find((star) => star.name === starName)
  return hit?.brightness ?? null
}

export function majorBrightnessForDisplay(
  astrolabe: FunctionalAstrolabe,
  chartMode: ChartMode,
  palaceBranch: string,
  starName: string,
  iztroBrightness?: string,
): string | undefined {
  if (chartMode !== 'origin') return iztroBrightness
  const ziweiBranch = getZiweiBranch(astrolabe)
  const fromTable = lookupRishuntangBrightness(ziweiBranch, palaceBranch, starName)
  return fromTable ?? iztroBrightness
}
