import { useCallback, useEffect, useState } from 'react'
import type FunctionalAstrolabe from 'iztro/lib/astro/FunctionalAstrolabe'
import { deleteSavedChart, fetchSavedChart, fetchSavedCharts, getStarDrawUrl, saveChart } from '../lib/api'
import { useAuth } from '../context/AuthContext'
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

function searchStatusText(count: number, query: string) {
  if (query.trim()) {
    return count
      ? `搜尋「${query.trim()}」共 ${count} 筆`
      : `搜尋「${query.trim()}」找不到符合的命盤`
  }
  return count ? `共 ${count} 筆已存命盤` : '尚無已存命盤'
}

interface SavedChartsPanelProps {
  input: BirthInput
  hasChart: boolean
  onLoad: (input: BirthInput) => void
}

export function SavedChartsPanel({ input, hasChart, onLoad }: SavedChartsPanelProps) {
  const { user } = useAuth()
  const [charts, setCharts] = useState<SavedChartSummary[]>([])
  const [searchInput, setSearchInput] = useState('')
  const [appliedQuery, setAppliedQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadCharts = useCallback(async (query: string) => {
    setLoading(true)
    setError('')
    try {
      const { charts: list } = await fetchSavedCharts(query)
      setCharts(list)
      setAppliedQuery(query)
    } catch (err) {
      setError(err instanceof Error ? err.message : '載入失敗')
      setCharts([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadCharts('')
  }, [loadCharts])

  async function handleSearch() {
    await loadCharts(searchInput)
  }

  async function handleSave() {
    setError('')
    try {
      const astrolabe = computeAstrolabe(input)
      await saveChart(birthInputToPayload(input, astrolabe))
      alert('命盤已儲存')
      await loadCharts(appliedQuery)
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
      await loadCharts(appliedQuery)
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

  function handleStarDraw() {
    if (user?.role === 'admin' || user?.starDrawEnabled) {
      window.location.href = getStarDrawUrl()
      return
    }
    alert('請與管理員聯絡開通此功能')
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
        <button type="button" className="secondary-btn" onClick={handleStarDraw}>
          先知斗數神牌
        </button>
      </div>

      <div className="saved-charts-panel">
        <div className="saved-chart-search-row">
          <input
            type="search"
            value={searchInput}
            placeholder="搜尋已存姓名…"
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                void handleSearch()
              }
            }}
          />
          <button type="button" className="secondary-btn" onClick={() => void handleSearch()}>
            搜尋
          </button>
        </div>
        <div className="saved-charts-status">
          {loading ? '搜尋中…' : searchStatusText(charts.length, appliedQuery)}
        </div>
        {error && <p className="form-error">{error}</p>}
        <div className="saved-chart-list">
          {loading ? (
            <div className="saved-charts-empty">載入中…</div>
          ) : charts.length === 0 ? (
            <div className="saved-charts-empty">
              {appliedQuery.trim() ? '找不到符合的命盤' : '尚無已存命盤'}
            </div>
          ) : (
            charts.map((chart) => (
              <div key={chart.id} className="saved-chart-item">
                <div className="saved-chart-meta">
                  <strong>{chart.subjectName}</strong>
                  <span>
                    {chart.gender} · {chart.birthDateTime || chart.bazi}
                  </span>
                </div>
                <div className="saved-chart-actions">
                  <button type="button" className="secondary-btn" onClick={() => void handleLoad(chart.id)}>
                    提取
                  </button>
                  <button
                    type="button"
                    className="danger-btn"
                    onClick={() => void handleDelete(chart.id, chart.subjectName)}
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
