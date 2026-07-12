import { useEffect, useMemo, useRef, useState } from 'react'
import type { PalaceName } from 'iztro/lib/i18n/types/Palace'
import type { IFunctionalPalace } from 'iztro/lib/astro/FunctionalPalace'
import type FunctionalAstrolabe from 'iztro/lib/astro/FunctionalAstrolabe'
import type { CalendarType, InitialChartType } from '../lib/astrolabe'
import {
  horoscopeDateForNominalAge,
  horoscopeDateFromLunarYearMonthDay,
} from '../lib/astrolabe'
import { branchChartPoint, CHART_VIEW_H, CHART_VIEW_W, shouldShowDecadal } from '../lib/constants'
import {
  computeHoroscope,
  computeYearlyDailyByPalace,
  computeYearlyMonthlyByPalace,
  getLunarPartsFromHoroscopeDate,
  getSanFangBranchRoles,
  getScopePalaceName,
  palaceNameScopeForMode,
  type YearlyDisplayOptions,
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
  const [showYearlyDaily, setShowYearlyDaily] = useState(false)
  const [yearlyMonthSelected, setYearlyMonthSelected] = useState(false)
  const [selectedFlowLunarYear, setSelectedFlowLunarYear] = useState<number | null>(null)
  const [selectedFlowMonth, setSelectedFlowMonth] = useState<number | null>(null)
  const [selectedFlowIsLeap, setSelectedFlowIsLeap] = useState(false)
  const clickTimerRef = useRef<number | null>(null)

  const chartMode = resolveEffectiveChartMode(initialChartType, viewDecadalChart)

  const yearlyDisplayOptions = useMemo<YearlyDisplayOptions>(
    () => ({ useMonthlyPalaceNames: chartMode === 'yearly' && yearlyMonthSelected }),
    [chartMode, yearlyMonthSelected],
  )

  const horoscope = useMemo(
    () => computeHoroscope(astrolabe, horoscopeDate, birthTimeIndex),
    [astrolabe, horoscopeDate, birthTimeIndex],
  )

  const activeLunar = useMemo(
    () => getLunarPartsFromHoroscopeDate(horoscopeDate),
    [horoscopeDate],
  )

  useEffect(() => {
    return () => {
      if (clickTimerRef.current !== null) {
        window.clearTimeout(clickTimerRef.current)
      }
    }
  }, [])

  useEffect(() => {
    setFocusPalace('命宮')
  }, [astrolabe, chartMode])

  useEffect(() => {
    if (yearlyMonthSelected) {
      setFocusPalace('命宮')
    }
  }, [yearlyMonthSelected, horoscopeDate])

  useEffect(() => {
    if (chartMode !== 'yearly') {
      setShowYearlyDaily(false)
      setYearlyMonthSelected(false)
    }
  }, [chartMode])

  useEffect(() => {
    setYearlyMonthSelected(false)
    setShowYearlyDaily(false)
    setSelectedFlowLunarYear(null)
    setSelectedFlowMonth(null)
    setSelectedFlowIsLeap(false)
    setFocusPalace('命宮')
  }, [astrolabe, initialChartType, yearlyYear])

  const palaceByBranch = useMemo(() => {
    const map = new Map<string, (typeof astrolabe.palaces)[0]>()
    for (const palace of astrolabe.palaces) {
      map.set(palace.earthlyBranch, palace)
    }
    return map
  }, [astrolabe])

  const sanFangRoles = useMemo(() => {
    return getSanFangBranchRoles(horoscope, focusPalace, chartMode, yearlyDisplayOptions)
  }, [horoscope, focusPalace, chartMode, yearlyDisplayOptions])

  const dimRelatedFooter = chartMode === 'origin' || chartMode === 'decadal' || chartMode === 'yearly'

  const yearlyMonthlyByPalace = useMemo(() => {
    if (chartMode !== 'yearly') return null
    return computeYearlyMonthlyByPalace(astrolabe, activeLunar.year, birthTimeIndex)
  }, [astrolabe, activeLunar.year, birthTimeIndex, chartMode])

  const yearlyDailyByPalace = useMemo(() => {
    if (
      chartMode !== 'yearly' ||
      !showYearlyDaily ||
      !yearlyMonthSelected ||
      selectedFlowMonth == null ||
      selectedFlowLunarYear == null
    ) {
      return null
    }
    return computeYearlyDailyByPalace(
      astrolabe,
      selectedFlowLunarYear,
      selectedFlowMonth,
      birthTimeIndex,
      selectedFlowIsLeap,
    )
  }, [
    astrolabe,
    selectedFlowLunarYear,
    selectedFlowMonth,
    selectedFlowIsLeap,
    birthTimeIndex,
    chartMode,
    showYearlyDaily,
    yearlyMonthSelected,
  ])

  const handleYearlyMonthSelect = (month: number) => {
    setYearlyMonthSelected(true)
    setSelectedFlowLunarYear(activeLunar.year)
    setSelectedFlowMonth(month)
    setSelectedFlowIsLeap(false)
    onHoroscopeDateChange(
      horoscopeDateFromLunarYearMonthDay(
        activeLunar.year,
        month,
        activeLunar.day,
        false,
      ),
    )
  }

  const handleYearlyYearChange = (year: number) => {
    setYearlyMonthSelected(false)
    setShowYearlyDaily(false)
    setSelectedFlowLunarYear(null)
    setSelectedFlowMonth(null)
    setSelectedFlowIsLeap(false)
    onYearlyYearChange(year)
  }

  const handleToggleYearlyDaily = () => {
    if (!yearlyMonthSelected) return
    setShowYearlyDaily((value) => !value)
  }

  const handlePalaceClick = (scopePalaceName: string) => {
    if (chartMode !== 'yearly') {
      setFocusPalace(scopePalaceName as PalaceName)
      return
    }
    if (clickTimerRef.current !== null) {
      window.clearTimeout(clickTimerRef.current)
    }
    clickTimerRef.current = window.setTimeout(() => {
      setFocusPalace(scopePalaceName as PalaceName)
      clickTimerRef.current = null
    }, 250)
  }

  const handlePalaceDoubleClick = (palace: IFunctionalPalace) => {
    if (clickTimerRef.current !== null) {
      window.clearTimeout(clickTimerRef.current)
      clickTimerRef.current = null
    }
    if (chartMode !== 'yearly') {
      setFocusPalace(
        getScopePalaceName(horoscope, palace.index, chartMode, palace.name, yearlyDisplayOptions) as PalaceName,
      )
      return
    }
    const entry = yearlyMonthlyByPalace?.get(palace.index)
    if (!entry) return
    handleYearlyMonthSelect(entry.month)
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
    const scope = palaceNameScopeForMode(chartMode, yearlyDisplayOptions)
    const surrounded =
      chartMode === 'origin'
        ? astrolabe.surroundedPalaces(focusPalace)
        : (horoscope.surroundPalaces(focusPalace, scope) ??
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
  }, [astrolabe, horoscope, focusPalace, chartMode, yearlyDisplayOptions])

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
                      onYearlyYearChange={handleYearlyYearChange}
                      showYearlyDaily={showYearlyDaily}
                      onShowYearlyDailyChange={handleToggleYearlyDaily}
                      yearlyMonthSelected={yearlyMonthSelected}
                      selectedFlowMonth={selectedFlowMonth}
                      selectedFlowLunarYear={selectedFlowLunarYear}
                      selectedFlowIsLeap={selectedFlowIsLeap}
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

            const scopePalaceName = getScopePalaceName(
              horoscope,
              palace.index,
              chartMode,
              palace.name,
              yearlyDisplayOptions,
            )

            const activeFlowPalaceIndex = yearlyMonthSelected
              ? horoscope.monthly.index
              : horoscope.yearly.index

            return (
              <div
                key={cell}
                className="grid-cell grid-cell-palace"
                style={{ gridRow: rowIndex + 1, gridColumn: colIndex + 1 }}
                title={chartMode === 'yearly' ? '單擊：三方四正；雙擊：流月命宮' : undefined}
                onClick={() => handlePalaceClick(scopePalaceName)}
                onDoubleClick={() => handlePalaceDoubleClick(palace)}
              >
                <PalaceCell
                  palace={palace}
                  highlight={sanFangRoles.all.has(cell)}
                  focused={sanFangRoles.target === cell}
                  footerDimmed={dimRelatedFooter && sanFangRoles.related.has(cell)}
                  chartMode={chartMode}
                  horoscope={horoscope}
                  activeDecadalIndex={activeDecadalIndex}
                  onDecadalSelect={
                    initialChartType === 'natal' ? handleDecadalSelect : undefined
                  }
                  yearlyMonthlyEntry={
                    chartMode === 'yearly'
                      ? yearlyMonthlyByPalace?.get(palace.index) ?? null
                      : null
                  }
                  yearlyDailyDays={
                    chartMode === 'yearly' && showYearlyDaily
                      ? yearlyDailyByPalace?.get(palace.index) ?? []
                      : undefined
                  }
                  yearlyDisplayOptions={yearlyDisplayOptions}
                  activeYearlyMonth={yearlyMonthSelected ? selectedFlowMonth ?? undefined : undefined}
                  isActiveMonthlyPalace={
                    chartMode === 'yearly' && activeFlowPalaceIndex === palace.index
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
