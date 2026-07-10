import { astro } from 'iztro'
import type FunctionalAstrolabe from 'iztro/lib/astro/FunctionalAstrolabe'
import type { IFunctionalPalace } from 'iztro/lib/astro/FunctionalPalace'
import type { PalaceName } from 'iztro/lib/i18n/types/Palace'

export type CalendarType = 'solar' | 'lunar'
export type Gender = '男' | '女'
export type InitialChartType = 'natal' | 'yearly'

export interface BirthInput {
  name: string
  gender: Gender | ''
  calendarType: CalendarType
  date: string
  timeIndex: number | ''
  isLeapMonth: boolean
  initialChartType: InitialChartType
  yearlyYear: number
}

function normalizeDate(date: string): string {
  const [y, m, d] = date.split('-')
  return `${Number(y)}-${Number(m)}-${Number(d)}`
}

export function computeAstrolabe(input: BirthInput): FunctionalAstrolabe {
  const { gender, calendarType, date, timeIndex, isLeapMonth } = input
  if (gender !== '男' && gender !== '女') {
    throw new Error('請選擇性別')
  }
  if (timeIndex === '' || timeIndex < 0 || timeIndex > 12) {
    throw new Error('請選擇出生時辰')
  }
  if (!date) {
    throw new Error('請輸入出生日期')
  }
  const normalized = normalizeDate(date)

  if (calendarType === 'solar') {
    return astro.bySolar(normalized, timeIndex, gender, true, 'zh-TW')
  }

  return astro.byLunar(normalized, timeIndex, gender, isLeapMonth, true, 'zh-TW')
}

export function getAge(solarDate: string, referenceDate = new Date()): number {
  const [y] = solarDate.split('-').map(Number)
  return referenceDate.getFullYear() - y + 1
}

export function getYearStemBranch(astrolabe: FunctionalAstrolabe): string {
  const { yearly } = astrolabe.rawDates.chineseDate
  return `${yearly[0]}${yearly[1]}`
}

export function getSoulPalace(astrolabe: FunctionalAstrolabe): IFunctionalPalace {
  return astrolabe.palace('命宮')!
}

export function getSurrounded(astrolabe: FunctionalAstrolabe, palaceName: PalaceName | string = '命宮') {
  return astrolabe.surroundedPalaces(palaceName as PalaceName)
}

export function getSanFangBranches(astrolabe: FunctionalAstrolabe, palaceName: PalaceName | string = '命宮') {
  const surrounded = getSurrounded(astrolabe, palaceName)
  return new Set([
    surrounded.target.earthlyBranch,
    surrounded.wealth.earthlyBranch,
    surrounded.career.earthlyBranch,
    surrounded.opposite.earthlyBranch,
  ])
}

export function todaySolarDate(referenceDate = new Date()): string {
  const y = referenceDate.getFullYear()
  const m = String(referenceDate.getMonth() + 1).padStart(2, '0')
  const d = String(referenceDate.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function horoscopeDateForYear(year: number, referenceDate = new Date()): string {
  const m = referenceDate.getMonth() + 1
  const d = referenceDate.getDate()
  const daysInMonth = new Date(year, m, 0).getDate()
  const day = Math.min(d, daysInMonth)
  return `${year}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export function currentGregorianYear(referenceDate = new Date()): number {
  return referenceDate.getFullYear()
}

export function formatAnalysisDate(date = new Date()): string {
  const y = date.getFullYear()
  const m = date.getMonth() + 1
  const d = date.getDate()
  return `${y}/${m}/${d}`
}
