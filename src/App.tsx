import { useMemo, useState } from 'react'
import type FunctionalAstrolabe from 'iztro/lib/astro/FunctionalAstrolabe'
import { AstrolabeChart } from './components/AstrolabeChart'
import { BirthForm } from './components/BirthForm'
import {
  computeAstrolabe,
  currentGregorianYear,
  horoscopeDateForYear,
  horoscopeDateForYearMonthDay,
  parseHoroscopeDateParts,
  todaySolarDate,
  type BirthInput,
} from './lib/astrolabe'
import './App.css'

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

function App() {
  const [input, setInput] = useState<BirthInput>(createDefaultInput)
  const [submitted, setSubmitted] = useState<BirthInput | null>(null)
  const [formError, setFormError] = useState('')
  const [viewDecadalChart, setViewDecadalChart] = useState(false)
  const [horoscopeDate, setHoroscopeDate] = useState(todaySolarDate())
  const [yearlyYear, setYearlyYear] = useState(currentGregorianYear())

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
        <h1>紫微斗數線上排盤</h1>
        <p>排盤時可選本命命盤或流年命盤；本命盤點宮位大限歲數可切換大限</p>
      </header>

      <main className="app-main">
        <aside className="sidebar">
          <BirthForm
            input={input}
            onChange={setInput}
            onSubmit={() => {
              setFormError('')
              try {
                computeAstrolabe(input)
                if (input.initialChartType === 'yearly') {
                  if (!input.yearlyYear || input.yearlyYear < 1900 || input.yearlyYear > 2100) {
                    throw new Error('請輸入有效的流年年份（西元）')
                  }
                }
                setSubmitted({ ...input })
                setViewDecadalChart(false)
                if (input.initialChartType === 'yearly') {
                  setYearlyYear(input.yearlyYear)
                  setHoroscopeDate(horoscopeDateForYear(input.yearlyYear))
                } else {
                  setHoroscopeDate(todaySolarDate())
                }
              } catch (err) {
                setFormError(err instanceof Error ? err.message : '請檢查輸入資料')
                setSubmitted(null)
              }
            }}
            error={formError}
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
              onHoroscopeDateChange={(date) => {
                setHoroscopeDate(date)
                if (submitted.initialChartType === 'yearly') {
                  setYearlyYear(new Date(date + 'T12:00:00').getFullYear())
                }
              }}
              yearlyYear={yearlyYear}
              onYearlyYearChange={(year) => {
                setYearlyYear(year)
                const { month, day } = parseHoroscopeDateParts(horoscopeDate)
                setHoroscopeDate(horoscopeDateForYearMonthDay(year, month, day))
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

export default App
