import type FunctionalAstrolabe from 'iztro/lib/astro/FunctionalAstrolabe'
import type { IFunctionalHoroscope } from 'iztro/lib/astro/FunctionalHoroscope'
import type { IFunctionalAstrolabe } from 'iztro/lib/astro/FunctionalAstrolabe'
import type { Mutagen } from 'iztro/lib/i18n/types/mutagen'
import type { PalaceName } from 'iztro/lib/i18n/types/Palace'
import type { StarName } from 'iztro/lib/i18n/types/Star'
import {
  daysInLunarMonth,
  solarDateFromLunar,
} from './astrolabe'
import {
  BRANCH_ROTATION_ORDER,
  getMutagenForStar,
  palaceIndexByBranch,
} from './constants'

export type ChartMode = 'origin' | 'decadal' | 'yearly'
export type HoroscopeScope = 'decadal' | 'yearly'

export function chartModeToScope(mode: ChartMode): HoroscopeScope | 'origin' {
  if (mode === 'decadal') return 'decadal'
  if (mode === 'yearly') return 'yearly'
  return 'origin'
}

export function computeHoroscope(
  astrolabe: FunctionalAstrolabe,
  referenceDate: string | Date,
  timeIndex?: number,
): IFunctionalHoroscope {
  return astrolabe.horoscope(referenceDate, timeIndex)
}

export function getScopePalaceName(
  horoscope: IFunctionalHoroscope | null,
  palaceIndex: number,
  mode: ChartMode,
  natalName: PalaceName | string,
): string {
  if (mode === 'origin' || !horoscope) return natalName
  return horoscope[mode].palaceNames[palaceIndex] ?? natalName
}

export function getFlowStars(
  horoscope: IFunctionalHoroscope,
  palaceIndex: number,
  mode: ChartMode,
): StarName[] {
  if (mode === 'origin') return []

  if (mode === 'decadal') return []

  const decadalStars = horoscope.decadal.stars?.[palaceIndex] ?? []

  const yearlyStars = horoscope.yearly.stars?.[palaceIndex] ?? []
  const names = new Set<StarName>()
  for (const star of [...decadalStars, ...yearlyStars]) {
    names.add(star.name)
  }
  return [...names]
}

/** 生年天干（本命四化用） */
export function getNatalYearStem(astrolabe: IFunctionalAstrolabe): string {
  return astrolabe.rawDates.chineseDate.yearly[0]
}

/** 依盤面模式取得對應天干 */
export function getMutagenStem(
  horoscope: IFunctionalHoroscope,
  mode: ChartMode,
): string {
  if (mode === 'yearly') return horoscope.yearly.heavenlyStem
  if (mode === 'decadal') return horoscope.decadal.heavenlyStem
  return getNatalYearStem(horoscope.astrolabe)
}

/** 依四化表查星曜四化（僅表列四星回傳） */
export function getDisplayMutagen(
  horoscope: IFunctionalHoroscope | null,
  mode: ChartMode,
  starName: string,
): Mutagen | undefined {
  if (!horoscope) return undefined
  const stem = getMutagenStem(horoscope, mode)
  const label = getMutagenForStar(stem, starName)
  return label as Mutagen | undefined
}

export function getSanFangBranchesForScope(
  horoscope: IFunctionalHoroscope,
  focusPalaceName: PalaceName | string,
  mode: ChartMode,
) {
  return getSanFangBranchRoles(horoscope, focusPalaceName, mode).all
}

export interface SanFangBranchRoles {
  target: string
  related: Set<string>
  all: Set<string>
}

/** 三方四正：target 為點選宮，related 為三方＋對宮（需淡化） */
export function getSanFangBranchRoles(
  horoscope: IFunctionalHoroscope,
  focusPalaceName: PalaceName | string,
  mode: ChartMode,
): SanFangBranchRoles {
  const scope = chartModeToScope(mode)
  const surrounded =
    scope === 'origin'
      ? horoscope.astrolabe.surroundedPalaces(focusPalaceName as PalaceName)
      : (horoscope.surroundPalaces(focusPalaceName as PalaceName, scope) ??
        horoscope.astrolabe.surroundedPalaces(focusPalaceName as PalaceName))

  const target = surrounded.target.earthlyBranch
  const related = new Set<string>([
    surrounded.wealth.earthlyBranch,
    surrounded.career.earthlyBranch,
    surrounded.opposite.earthlyBranch,
  ])

  return {
    target,
    related,
    all: new Set<string>([target, ...related]),
  }
}

export function chartModeTitle(mode: ChartMode): string {
  if (mode === 'decadal') return '大限盤'
  if (mode === 'yearly') return '流年盤'
  return '本命盤'
}

export function chartModeTag(mode: ChartMode): string {
  if (mode === 'decadal') return '大限'
  if (mode === 'yearly') return '流年'
  return '本命'
}

export function resolveEffectiveChartMode(
  initialChartType: 'natal' | 'yearly',
  showDecadalIndicator: boolean,
): ChartMode {
  if (initialChartType === 'yearly') return 'yearly'
  if (showDecadalIndicator) return 'decadal'
  return 'origin'
}

export interface YearlyMonthlyEntry {
  month: number
  gz: string
}

function lunarMonthAnchorSolar(
  lunarYear: number,
  lunarMonth: number,
  isLeapMonth = false,
): string | null {
  try {
    return solarDateFromLunar(lunarYear, lunarMonth, 15, isLeapMonth)
  } catch {
    return null
  }
}

/** 計算指定農曆年內，各宮位所對應的流月（正月–腊月） */
export function computeYearlyMonthlyByPalace(
  astrolabe: FunctionalAstrolabe,
  lunarYear: number,
  timeIndex: number,
): Map<number, YearlyMonthlyEntry[]> {
  const map = new Map<number, YearlyMonthlyEntry[]>()
  for (let month = 1; month <= 12; month++) {
    const solar = lunarMonthAnchorSolar(lunarYear, month)
    if (!solar) continue
    const h = astrolabe.horoscope(solar, timeIndex)
    const idx = h.monthly.index
    const gz = `${h.monthly.heavenlyStem}${h.monthly.earthlyBranch}`
    map.set(idx, [{ month, gz }])
  }
  return map
}

/** 計算指定農曆月內，各宮位所對應的流日（初一–三十） */
export function computeMonthlyDailyByPalace(
  astrolabe: FunctionalAstrolabe,
  lunarYear: number,
  lunarMonth: number,
  timeIndex: number,
  isLeapMonth = false,
): Map<number, number[]> {
  const map = new Map<number, number[]>()
  const anchorSolar = lunarMonthAnchorSolar(lunarYear, lunarMonth, isLeapMonth)
  if (!anchorSolar) return map

  const h = astrolabe.horoscope(anchorSolar, timeIndex)
  const startBranch = astrolabe.palace(h.monthly.index)?.earthlyBranch
  if (!startBranch) return map

  const startIdx = BRANCH_ROTATION_ORDER.indexOf(
    startBranch as (typeof BRANCH_ROTATION_ORDER)[number],
  )
  if (startIdx < 0) return map

  const dayCount = daysInLunarMonth(lunarYear, lunarMonth, isLeapMonth)
  for (let day = 1; day <= dayCount; day++) {
    const branch = BRANCH_ROTATION_ORDER[(startIdx + day - 1) % 12]
    const idx = palaceIndexByBranch(astrolabe, branch)
    if (idx === undefined) continue
    const list = map.get(idx) ?? []
    list.push(day)
    map.set(idx, list)
  }
  return map
}

export function getYearlyMonthBranch(
  astrolabe: FunctionalAstrolabe,
  lunarYear: number,
  lunarMonth: number,
  timeIndex: number,
  isLeapMonth = false,
): string {
  const solar = lunarMonthAnchorSolar(lunarYear, lunarMonth, isLeapMonth)
  if (!solar) return ''
  const h = astrolabe.horoscope(solar, timeIndex)
  return astrolabe.palace(h.monthly.index)?.earthlyBranch ?? ''
}
