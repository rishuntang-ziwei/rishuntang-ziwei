import type FunctionalAstrolabe from 'iztro/lib/astro/FunctionalAstrolabe'
import type { IFunctionalHoroscope } from 'iztro/lib/astro/FunctionalHoroscope'
import type { IFunctionalAstrolabe } from 'iztro/lib/astro/FunctionalAstrolabe'
import type { Mutagen } from 'iztro/lib/i18n/types/mutagen'
import type { PalaceName } from 'iztro/lib/i18n/types/Palace'
import type { StarName } from 'iztro/lib/i18n/types/Star'
import {
  daysInLunarMonth,
  horoscopeDateFromLunarYearMonthDay,
  parseLunarFromSolarDate,
} from './astrolabe'
import { getMutagenForStar } from './constants'

export type ChartMode = 'origin' | 'decadal' | 'yearly'
export type HoroscopeScope = 'decadal' | 'yearly' | 'monthly' | 'daily'

export interface YearlyDisplayOptions {
  /** 使用者已點選流月時，宮名改以流月命宮為準 */
  useMonthlyPalaceNames?: boolean
}

/** 流年盤以流年為宮名與三方四正基準（流年所在宮為命宮） */
export function chartModeToScope(mode: ChartMode): HoroscopeScope | 'origin' {
  if (mode === 'decadal') return 'decadal'
  if (mode === 'yearly') return 'yearly'
  return 'origin'
}

/** 宮名與三方四正：預設流年；點選流月後改以流月命宮為命宮 */
export function palaceNameScopeForMode(
  mode: ChartMode,
  options?: YearlyDisplayOptions,
): HoroscopeScope | 'origin' {
  if (mode === 'decadal') return 'decadal'
  if (mode === 'yearly') return options?.useMonthlyPalaceNames ? 'monthly' : 'yearly'
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
  options?: YearlyDisplayOptions,
): string {
  if (mode === 'origin' || !horoscope) return natalName
  const scope = palaceNameScopeForMode(mode, options)
  if (scope === 'origin') return natalName
  return horoscope[scope].palaceNames[palaceIndex] ?? natalName
}

export function getFlowStars(
  horoscope: IFunctionalHoroscope,
  palaceIndex: number,
  mode: ChartMode,
): StarName[] {
  if (mode === 'origin') return []

  if (mode === 'decadal') return []

  if (mode === 'yearly') {
    const yearlyStars = horoscope.yearly.stars?.[palaceIndex] ?? []
    return yearlyStars.map((star) => star.name)
  }

  return []
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
  options?: YearlyDisplayOptions,
): SanFangBranchRoles {
  const scope = palaceNameScopeForMode(mode, options)
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

/** 依農曆年計算各宮位對應的流月（農曆 1–12 月，每宮僅一個月份） */
export function computeYearlyMonthlyByPalace(
  astrolabe: FunctionalAstrolabe,
  lunarYear: number,
  timeIndex: number,
): Map<number, YearlyMonthlyEntry> {
  const map = new Map<number, YearlyMonthlyEntry>()
  for (let month = 1; month <= 12; month++) {
    const date = horoscopeDateFromLunarYearMonthDay(lunarYear, month, 15, false)
    const h = astrolabe.horoscope(date, timeIndex)
    const idx = h.monthly.index
    const gz = `${h.monthly.heavenlyStem}${h.monthly.earthlyBranch}`
    map.set(idx, { month, gz })
  }
  return map
}

/** 依選定農曆月，計算各宮位對應的流日（1–30 日） */
export function computeYearlyDailyByPalace(
  astrolabe: FunctionalAstrolabe,
  lunarYear: number,
  lunarMonth: number,
  timeIndex: number,
  isLeapMonth = false,
): Map<number, number[]> {
  const map = new Map<number, number[]>()
  const totalDays = daysInLunarMonth(lunarYear, lunarMonth, isLeapMonth)
  for (let day = 1; day <= totalDays; day++) {
    const date = horoscopeDateFromLunarYearMonthDay(lunarYear, lunarMonth, day, isLeapMonth)
    const h = astrolabe.horoscope(date, timeIndex)
    const idx = h.daily.index
    const list = map.get(idx) ?? []
    list.push(day)
    map.set(idx, list)
  }
  return map
}

export function getLunarPartsFromHoroscopeDate(date: string) {
  return parseLunarFromSolarDate(date)
}
