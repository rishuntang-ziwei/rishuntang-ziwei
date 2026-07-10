import { useEffect, useMemo, useState } from 'react'
import type FunctionalAstrolabe from 'iztro/lib/astro/FunctionalAstrolabe'
import { AstrolabeChart } from './components/AstrolabeChart'
import { BirthForm } from './components/BirthForm'
import { SavedChartsPanel } from './components/SavedChartsPanel'
import { useAuth } from './context/AuthContext'
import {
  computeAstrolabe,
  currentGregorianYear,
  horoscopeDateForYear,
  todaySolarDate,
  type BirthInput,
} from './lib/astrolabe'
import type { SavedChartPayload } from './types/charts'

function payloadToBirthInput(payload: SavedChartPayload): BirthInput {
  return {
    name: payload.name,
    gender: payload.gender,
    calendarType: payload.calendar,
    date: payload.date,
    timeIndex: payload.timeIndex,
    isLeapMonth: payload.isLeap,
    initialChartType: payload.initialChartType,
    yearlyYear: payload.yearlyYear,
  }
}

function createDefaultInput(): BirthInput {
  return {
    name: '',
    gender: '',
    calendarType: 'solar',
    date: todaySolarDate(),
    timeIndex: '',
    isLeapMonth: false,
    initialChartType: 'natal',
    yearlyYear: currentGregorianYear(),
  }
}

export function ChartApp({
  onOpenAdmin,
  pendingChartPayload,
  onPendingChartLoaded,
}: {
  onOpenAdmin?: () => void
  pendingChartPayload?: SavedChartPayload | null
  onPendingChartLoaded?: () => void
}) {
  const { user, logout } = useAuth()
  const [input, setInput] = useState<BirthInput>(createDefaultInput)
  const [submitted, setSubmitted] = useState<BirthInput | null>(null)
  const [formError, setFormError] = useState('')
  const [viewDecadalChart, setViewDecadalChart] = useState(false)
  const [horoscopeDate, setHoroscopeDate] = useState(todaySolarDate())
  const [yearlyYear, setYearlyYear] = useState(currentGregorianYear())

  function submitInput(next: BirthInput) {
    setFormError('')
    try {
      computeAstrolabe(next)
      if (next.initialChartType === 'yearly') {
        if (!next.yearlyYear || next.yearlyYear < 1900 || next.yearlyYear > 2100) {
          throw new Error('請輸入有效的流年年份（西元）')
        }
      }
      setSubmitted({ ...next })
      setViewDecadalChart(false)
      if (next.initialChartType === 'yearly') {
        setYearlyYear(next.yearlyYear)
        setHoroscopeDate(horoscopeDateForYear(next.yearlyYear))
      } else {
        setHoroscopeDate(todaySolarDate())
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : '請檢查輸入資料')
      setSubmitted(null)
    }
  }

  useEffect(() => {
    if (!pendingChartPayload) return
    const loaded = payloadToBirthInput(pendingChartPayload)
    setInput(loaded)
    submitInput(loaded)
    onPendingChartLoaded?.()
  }, [pendingChartPayload, onPendingChartLoaded])

  const astrolabe = useMemo<FunctionalAstrolabe | null>(() => {
    if (!submitted) return null
    try {
      return computeAstrolabe(submitted)
    } catch {
      return null
    }
  }, [submitted])

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-header-row">
          <div>
            <h1>紫微斗數線上排盤</h1>
            <p>排盤時可選本命命盤或流年命盤；本命盤點宮位大限歲數可切換大限</p>
          </div>
          <div className="user-bar">
            <span>{user?.name}</span>
            {user?.role === 'admin' && onOpenAdmin && (
              <button type="button" className="user-bar-btn" onClick={onOpenAdmin}>
                會員管理
              </button>
            )}
            <button type="button" className="user-bar-btn" onClick={logout}>
              登出
            </button>
          </div>
        </div>
      </header>

      <main className="app-main">
        <aside className="sidebar">
          <BirthForm
            input={input}
            onChange={setInput}
            onSubmit={() => submitInput(input)}
            error={formError}
          />
          <SavedChartsPanel
            input={input}
            hasChart={Boolean(submitted && astrolabe)}
            onLoad={(loaded) => {
              setInput(loaded)
              submitInput(loaded)
            }}
          />
        </aside>

        <section className="chart-section">
          {!submitted ? (
            <div className="chart-placeholder">請輸入資料後按「開始排盤」</div>
          ) : astrolabe && submitted.timeIndex !== '' ? (
            <AstrolabeChart
              name={submitted.name}
              astrolabe={astrolabe}
              calendar={submitted.calendarType}
              birthDate={submitted.date}
              birthTimeIndex={submitted.timeIndex}
              initialChartType={submitted.initialChartType}
              viewDecadalChart={viewDecadalChart}
              onViewDecadalChart={(value) => {
                setViewDecadalChart(value)
                if (!value) setHoroscopeDate(todaySolarDate())
              }}
              horoscopeDate={horoscopeDate}
              onHoroscopeDateChange={setHoroscopeDate}
              yearlyYear={yearlyYear}
              onYearlyYearChange={(year) => {
                setYearlyYear(year)
                setHoroscopeDate(horoscopeDateForYear(year))
              }}
            />
          ) : (
            <div className="chart-error">排盤失敗，請檢查輸入資料是否正確。</div>
          )}
        </section>
      </main>
    </div>
  )
}
