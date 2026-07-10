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

export function horoscopeDateForYear(year: number, referenceDate: string | Date = new Date()): string {
  const ref = typeof referenceDate === 'string' ? new Date(referenceDate + 'T12:00:00') : referenceDate
  const m = ref.getMonth() + 1
  const d = ref.getDate()
  const daysInMonth = new Date(year, m, 0).getDate()
  const day = Math.min(d, daysInMonth)
  return `${year}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

/** 依西元年月日組成論命日期（流年流月流日用） */
export function horoscopeDateForYearMonthDay(
  year: number,
  month: number,
  day: number,
): string {
  const daysInMonth = new Date(year, month, 0).getDate()
  const safeDay = Math.min(Math.max(day, 1), daysInMonth)
  return `${year}-${String(month).padStart(2, '0')}-${String(safeDay).padStart(2, '0')}`
}

export function parseHoroscopeDateParts(date: string): { year: number; month: number; day: number } {
  const [year, month, day] = date.split('-').map(Number)
  return { year, month, day }
}

export function currentGregorianMonth(referenceDate = new Date()): number {
  return referenceDate.getMonth() + 1
}

export function currentGregorianDay(referenceDate = new Date()): number {
  return referenceDate.getDate()
}

/** 依虛歲推算論命日期（用於切換大限） */
export function horoscopeDateForNominalAge(
  solarBirthDate: string,
  nominalAge: number,
  referenceDate = new Date(),
): string {
  const [birthYear] = solarBirthDate.split('-').map(Number)
  return horoscopeDateForYear(birthYear + nominalAge - 1, referenceDate)
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
