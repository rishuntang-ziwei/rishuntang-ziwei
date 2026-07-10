import { astro } from 'iztro'
import type FunctionalAstrolabe from 'iztro/lib/astro/FunctionalAstrolabe'
import type { IFunctionalPalace } from 'iztro/lib/astro/FunctionalPalace'
import type { PalaceName } from 'iztro/lib/i18n/types/Palace'
import { lunar2solar, solar2lunar } from 'lunar-lite/lib/convertor'
import { LunarMonth } from 'lunar-typescript'

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

export interface LunarDateParts {
  year: number
  month: number
  day: number
  isLeap: boolean
}

export function parseLunarFromSolarDate(solarDate: string): LunarDateParts {
  const lunar = solar2lunar(solarDate)
  return {
    year: lunar.lunarYear,
    month: lunar.lunarMonth,
    day: lunar.lunarDay,
    isLeap: lunar.isLeap,
  }
}

export function solarDateFromLunar(
  lunarYear: number,
  lunarMonth: number,
  lunarDay: number,
  isLeapMonth = false,
): string {
  const solar = lunar2solar(`${lunarYear}-${lunarMonth}-${lunarDay}`, isLeapMonth)
  return `${solar.solarYear}-${String(solar.solarMonth).padStart(2, '0')}-${String(solar.solarDay).padStart(2, '0')}`
}

export function daysInLunarMonth(lunarYear: number, lunarMonth: number, isLeapMonth = false): number {
  const ym = isLeapMonth ? -lunarMonth : lunarMonth
  return LunarMonth.fromYm(lunarYear, ym)?.getDayCount() ?? 30
}

export function horoscopeDateFromLunarYearMonthDay(
  lunarYear: number,
  lunarMonth: number,
  lunarDay: number,
  isLeapMonth = false,
): string {
  const maxDay = daysInLunarMonth(lunarYear, lunarMonth, isLeapMonth)
  const safeDay = Math.min(Math.max(lunarDay, 1), maxDay)
  return solarDateFromLunar(lunarYear, lunarMonth, safeDay, isLeapMonth)
}

/** 流年預設論命日：同農曆年則取今日農曆月日，否則正月初一 */
export function horoscopeDateForLunarYear(lunarYear: number, referenceDate = new Date()): string {
  const refSolar = todaySolarDate(referenceDate)
  const refLunar = parseLunarFromSolarDate(refSolar)
  if (refLunar.year === lunarYear) {
    return horoscopeDateFromLunarYearMonthDay(
      refLunar.year,
      refLunar.month,
      refLunar.day,
      refLunar.isLeap,
    )
  }
  return horoscopeDateFromLunarYearMonthDay(lunarYear, 1, 1, false)
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
