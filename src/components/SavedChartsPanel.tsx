import { useCallback, useEffect, useState } from 'react'
import type FunctionalAstrolabe from 'iztro/lib/astro/FunctionalAstrolabe'
import { deleteSavedChart, fetchSavedChart, fetchSavedCharts, saveChart } from '../lib/api'
import { computeAstrolabe, formatBazi, type BirthInput } from '../lib/astrolabe'
import type { SavedChartPayload, SavedChartSummary } from '../types/charts'

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

function birthInputToPayload(input: BirthInput, astrolabe: FunctionalAstrolabe): SavedChartPayload {
  return {
    name: input.name.trim(),
    gender: input.gender as '男' | '女',
    calendar: input.calendarType,
    date: input.date,
    timeIndex: input.timeIndex as number,
    isLeap: input.isLeapMonth,
    initialChartType: input.initialChartType,
    yearlyYear: input.yearlyYear,
    bazi: formatBazi(astrolabe),
  }
}

interface SavedChartsPanelProps {
  input: BirthInput
  hasChart: boolean
  onLoad: (input: BirthInput) => void
}

export function SavedChartsPanel({ input, hasChart, onLoad }: SavedChartsPanelProps) {
  const [charts, setCharts] = useState<SavedChartSummary[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadCharts = useCallback(async (query: string) => {
    setLoading(true)
    setError('')
    try {
      const { charts: list } = await fetchSavedCharts(query)
      setCharts(list)
    } catch (err) {
      setError(err instanceof Error ? err.message : '載入失敗')
      setCharts([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadCharts(search)
    }, 250)
    return () => window.clearTimeout(timer)
  }, [loadCharts, search])

  async function handleSave() {
    setError('')
    try {
      const astrolabe = computeAstrolabe(input)
      await saveChart(birthInputToPayload(input, astrolabe))
      alert('命盤已儲存')
      await loadCharts(search)
    } catch (err) {
      alert(err instanceof Error ? err.message : '儲存失敗')
    }
  }

  async function handleLoad(id: number) {
    try {
      const { chart } = await fetchSavedChart(id)
      onLoad(payloadToBirthInput(chart.payload))
    } catch (err) {
      alert(err instanceof Error ? err.message : '載入失敗')
    }
  }

  async function handleDelete(id: number, name: string) {
    if (!confirm(`確定要刪除「${name}」的命盤？`)) return
    try {
      await deleteSavedChart(id)
      await loadCharts(search)
    } catch (err) {
      alert(err instanceof Error ? err.message : '刪除失敗')
    }
  }

  function handlePrint() {
    if (!hasChart) {
      alert('請先完成排盤後再列印')
      return
    }
    window.print()
  }

  return (
    <div className="member-section">
      <h3>會員功能</h3>
      <div className="member-actions">
        <button type="button" className="secondary-btn" onClick={handlePrint}>
          列印命盤
        </button>
        <button type="button" className="secondary-btn" onClick={handleSave}>
          儲存命盤
        </button>
      </div>

      <div className="saved-charts-panel">
        <input
          type="search"
          value={search}
          placeholder="搜尋已存姓名…"
          onChange={(e) => setSearch(e.target.value)}
        />
        {error && <p className="form-error">{error}</p>}
        <div className="saved-chart-list">
          {loading ? (
            <div className="saved-charts-empty">載入中…</div>
          ) : charts.length === 0 ? (
            <div className="saved-charts-empty">尚無已存命盤</div>
          ) : (
            charts.map((chart) => (
              <div key={chart.id} className="saved-chart-item">
                <div className="saved-chart-meta">
                  <strong>{chart.subjectName}</strong>
                  <span>
                    {chart.gender} · {chart.bazi}
                  </span>
                </div>
                <div className="saved-chart-actions">
                  <button type="button" className="secondary-btn" onClick={() => handleLoad(chart.id)}>
                    提取
                  </button>
                  <button
                    type="button"
                    className="danger-btn"
                    onClick={() => handleDelete(chart.id, chart.subjectName)}
                  >
                    刪除
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
