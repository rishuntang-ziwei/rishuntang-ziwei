import { useEffect, useMemo, useState } from 'react'
import type { PalaceName } from 'iztro/lib/i18n/types/Palace'
import type { IFunctionalPalace } from 'iztro/lib/astro/FunctionalPalace'
import type FunctionalAstrolabe from 'iztro/lib/astro/FunctionalAstrolabe'
import type { CalendarType, InitialChartType } from '../lib/astrolabe'
import { horoscopeDateForNominalAge, horoscopeDateForYearMonthDay, parseHoroscopeDateParts } from '../lib/astrolabe'
import { branchChartPoint, CHART_VIEW_H, CHART_VIEW_W, shouldShowDecadal } from '../lib/constants'
import {
  computeHoroscope,
  computeMonthlyDailyByPalace,
  computeYearlyMonthlyByPalace,
  getSanFangBranchRoles,
  getScopePalaceName,
  resolveEffectiveChartMode,
} from '../lib/horoscope'
import { CenterPanel } from './CenterPanel'
import { PalaceCell } from './PalaceCell'

interface AstrolabeChartProps {
  name: string
  astrolabe: FunctionalAstrolabe
  calendar: CalendarType
  birthDate: string
  birthTimeIndex: number
  initialChartType: InitialChartType
  viewDecadalChart: boolean
  onViewDecadalChart: (value: boolean) => void
  horoscopeDate: string
  onHoroscopeDateChange: (date: string) => void
  yearlyYear: number
  onYearlyYearChange: (year: number) => void
}

const GRID_LAYOUT: (string | 'CENTER')[][] = [
  ['巳', '午', '未', '申'],
  ['辰', 'CENTER', 'CENTER', '酉'],
  ['卯', 'CENTER', 'CENTER', '戌'],
  ['寅', '丑', '子', '亥'],
]

export function AstrolabeChart({
  name,
  astrolabe,
  calendar,
  birthDate,
  birthTimeIndex,
  initialChartType,
  viewDecadalChart,
  onViewDecadalChart,
  horoscopeDate,
  onHoroscopeDateChange,
  yearlyYear,
  onYearlyYearChange,
}: AstrolabeChartProps) {
  const [focusPalace, setFocusPalace] = useState<PalaceName>('命宮')

  const chartMode = resolveEffectiveChartMode(initialChartType, viewDecadalChart)

  const horoscope = useMemo(
    () => computeHoroscope(astrolabe, horoscopeDate, birthTimeIndex),
    [astrolabe, horoscopeDate, birthTimeIndex],
  )

  useEffect(() => {
    setFocusPalace('命宮')
  }, [astrolabe, chartMode, horoscopeDate])

  const palaceByBranch = useMemo(() => {
    const map = new Map<string, (typeof astrolabe.palaces)[0]>()
    for (const palace of astrolabe.palaces) {
      map.set(palace.earthlyBranch, palace)
    }
    return map
  }, [astrolabe])

  const sanFangRoles = useMemo(() => {
    return getSanFangBranchRoles(horoscope, focusPalace, chartMode)
  }, [horoscope, focusPalace, chartMode])

  const yearlyMonthlyByPalace = useMemo(() => {
    if (chartMode !== 'yearly') return null
    const year = parseHoroscopeDateParts(horoscopeDate).year
    return computeYearlyMonthlyByPalace(astrolabe, year, birthTimeIndex)
  }, [astrolabe, birthTimeIndex, chartMode, horoscopeDate])

  const yearlyDailyByPalace = useMemo(() => {
    if (chartMode !== 'yearly') return null
    const { year, month } = parseHoroscopeDateParts(horoscopeDate)
    return computeMonthlyDailyByPalace(astrolabe, year, month, birthTimeIndex)
  }, [astrolabe, birthTimeIndex, chartMode, horoscopeDate])

  const { month: activeYearlyMonth, day: activeYearlyDay } = parseHoroscopeDateParts(horoscopeDate)

  const handleYearlyMonthSelect = (month: number) => {
    const { year, day } = parseHoroscopeDateParts(horoscopeDate)
    onHoroscopeDateChange(horoscopeDateForYearMonthDay(year, month, day))
  }

  const handleYearlyDaySelect = (day: number) => {
    const { year, month } = parseHoroscopeDateParts(horoscopeDate)
    onHoroscopeDateChange(horoscopeDateForYearMonthDay(year, month, day))
  }

  const activeDecadalIndex = chartMode === 'decadal' ? horoscope.decadal.index : -1

  const handleDecadalSelect = (palace: IFunctionalPalace) => {
    if (initialChartType !== 'natal') return
    if (!palace.decadal || !shouldShowDecadal(palace.decadal.range)) return
    onViewDecadalChart(true)
    onHoroscopeDateChange(
      horoscopeDateForNominalAge(astrolabe.solarDate, palace.decadal.range[0]),
    )
  }

  const lines = useMemo(() => {
    const surrounded =
      chartMode === 'origin'
        ? astrolabe.surroundedPalaces(focusPalace)
        : (horoscope.surroundPalaces(focusPalace, chartMode) ??
          astrolabe.surroundedPalaces(focusPalace))

    const target = surrounded.target.earthlyBranch
    const wealth = surrounded.wealth.earthlyBranch
    const career = surrounded.career.earthlyBranch
    const opposite = surrounded.opposite.earthlyBranch

    const targetPt = branchChartPoint(target)
    const wealthPt = branchChartPoint(wealth)
    const careerPt = branchChartPoint(career)
    const oppositePt = branchChartPoint(opposite)

    const segments: Array<{ x1: number; y1: number; x2: number; y2: number }> = []
    if (targetPt && wealthPt) {
      segments.push({ x1: targetPt.x, y1: targetPt.y, x2: wealthPt.x, y2: wealthPt.y })
    }
    if (targetPt && careerPt) {
      segments.push({ x1: targetPt.x, y1: targetPt.y, x2: careerPt.x, y2: careerPt.y })
    }
    if (targetPt && oppositePt) {
      segments.push({ x1: targetPt.x, y1: targetPt.y, x2: oppositePt.x, y2: oppositePt.y })
    }
    if (wealthPt && careerPt) {
      segments.push({ x1: wealthPt.x, y1: wealthPt.y, x2: careerPt.x, y2: careerPt.y })
    }
    return segments
  }, [astrolabe, horoscope, focusPalace, chartMode])

  return (
    <div className="chart-wrapper">
      <div className="chart-grid">
        <svg className="chart-lines" viewBox={`0 0 ${CHART_VIEW_W} ${CHART_VIEW_H}`} preserveAspectRatio="none">
          {lines.map((line, i) => (
            <line key={i} x1={line.x1} y1={line.y1} x2={line.x2} y2={line.y2} />
          ))}
        </svg>

        {GRID_LAYOUT.map((row, rowIndex) =>
          row.map((cell, colIndex) => {
            if (cell === 'CENTER') {
              if (rowIndex === 1 && colIndex === 1) {
                return (
                  <div
                    key={`center-${rowIndex}-${colIndex}`}
                    className="grid-cell center-cell"
                    style={{ gridRow: '2 / 4', gridColumn: '2 / 4' }}
                  >
                    <CenterPanel
                      name={name}
                      astrolabe={astrolabe}
                      horoscope={horoscope}
                      calendar={calendar}
                      birthDate={birthDate}
                      initialChartType={initialChartType}
                      chartMode={chartMode}
                      horoscopeDate={horoscopeDate}
                      onHoroscopeDateChange={onHoroscopeDateChange}
                      yearlyYear={yearlyYear}
                      onYearlyYearChange={onYearlyYearChange}
                      onBackToNatal={
                        initialChartType === 'natal' && chartMode === 'decadal'
                          ? () => onViewDecadalChart(false)
                          : undefined
                      }
                    />
                  </div>
                )
              }
              return null
            }

            const palace = palaceByBranch.get(cell)
            if (!palace) return null

            const scopePalaceName = getScopePalaceName(horoscope, palace.index, chartMode, palace.name)

            return (
              <div
                key={cell}
                className="grid-cell grid-cell-palace"
                style={{ gridRow: rowIndex + 1, gridColumn: colIndex + 1 }}
                onClick={() => setFocusPalace(scopePalaceName as PalaceName)}
              >
                <PalaceCell
                  palace={palace}
                  highlight={sanFangRoles.all.has(cell)}
                  focused={sanFangRoles.target === cell}
                  footerDimmed={sanFangRoles.related.has(cell)}
                  chartMode={chartMode}
                  horoscope={horoscope}
                  activeDecadalIndex={activeDecadalIndex}
                  onDecadalSelect={
                    initialChartType === 'natal' ? handleDecadalSelect : undefined
                  }
                  yearlyMonthlyEntries={
                    chartMode === 'yearly'
                      ? yearlyMonthlyByPalace?.get(palace.index) ?? []
                      : undefined
                  }
                  activeYearlyMonth={activeYearlyMonth}
                  yearlyDailyDays={
                    chartMode === 'yearly'
                      ? yearlyDailyByPalace?.get(palace.index) ?? []
                      : undefined
                  }
                  activeYearlyDay={activeYearlyDay}
                  isActiveMonthlyPalace={
                    chartMode === 'yearly' && horoscope.monthly.index === palace.index
                  }
                  onYearlyMonthSelect={
                    chartMode === 'yearly' ? handleYearlyMonthSelect : undefined
                  }
                  onYearlyDaySelect={
                    chartMode === 'yearly' ? handleYearlyDaySelect : undefined
                  }
                />
              </div>
            )
          }),
        )}
      </div>
    </div>
  )
}
