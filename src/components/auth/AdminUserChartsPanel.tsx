import { useCallback, useEffect, useState } from 'react'
import {
  fetchAdminUserBirthChart,
  fetchAdminUserChart,
  fetchAdminUserCharts,
} from '../../lib/api'
import type { SavedChartPayload, SavedChartSummary } from '../../types/charts'

function searchStatusText(count: number, query: string) {
  if (query.trim()) {
    return count
      ? `搜尋「${query.trim()}」共 ${count} 筆`
      : `搜尋「${query.trim()}」找不到符合的命盤`
  }
  return count ? `共 ${count} 筆已存命盤` : '尚無已存命盤'
}

export function AdminUserChartsPanel({
  userId,
  userName,
  onBack,
  onLoadChart,
}: {
  userId: number
  userName: string
  onBack: () => void
  onLoadChart: (payload: SavedChartPayload) => void
}) {
  const [charts, setCharts] = useState<SavedChartSummary[]>([])
  const [registrationChart, setRegistrationChart] = useState<{
    subjectName: string
    gender: string
    birthDateTime: string
    payload: SavedChartPayload
  } | null>(null)
  const [searchInput, setSearchInput] = useState('')
  const [appliedQuery, setAppliedQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadCharts = useCallback(async (query: string) => {
    setLoading(true)
    setError('')
    try {
      const [{ charts: list }, birthResult] = await Promise.all([
        fetchAdminUserCharts(userId, query),
        fetchAdminUserBirthChart(userId).catch(() => null),
      ])
      setCharts(list)
      setRegistrationChart(birthResult?.chart ?? null)
      setAppliedQuery(query)
    } catch (err) {
      setError(err instanceof Error ? err.message : '載入失敗')
      setCharts([])
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    loadCharts('')
  }, [loadCharts])

  async function handleSearch() {
    await loadCharts(searchInput)
  }

  async function handleLoadChart(chartId: number) {
    try {
      const { chart } = await fetchAdminUserChart(userId, chartId)
      onLoadChart(chart.payload)
    } catch (err) {
      alert(err instanceof Error ? err.message : '載入失敗')
    }
  }

  return (
    <div className="admin-page">
      <header className="admin-header">
        <div>
          <h1>「{userName}」的命盤</h1>
        </div>
        <div className="admin-header-actions">
          <button type="button" onClick={onBack}>
            返回會員管理
          </button>
        </div>
      </header>

      {error && <div className="auth-error">{error}</div>}

      {registrationChart ? (
        <div className="admin-birth-chart-section">
          <h2 style={{ fontSize: '16px', margin: '0 0 8px' }}>註冊出生資料（本命）</h2>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>姓名</th>
                  <th>性別</th>
                  <th>出生年月日時</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>{registrationChart.subjectName}</td>
                  <td>{registrationChart.gender}</td>
                  <td>{registrationChart.birthDateTime}</td>
                  <td>
                    <button type="button" onClick={() => onLoadChart(registrationChart.payload)}>
                      提取命盤
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        !loading && (
          <p style={{ color: '#888', fontSize: '14px' }}>
            此會員尚未登記出生資料（舊帳號可能未填寫）
          </p>
        )
      )}

      <h2 style={{ fontSize: '16px', margin: '16px 0 8px' }}>已存命盤</h2>

      <div className="saved-chart-search-row admin-chart-search-row">
        <input
          type="search"
          value={searchInput}
          placeholder="搜尋姓名或電話…"
          className="admin-chart-search"
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              void handleSearch()
            }
          }}
        />
        <button type="button" onClick={() => void handleSearch()}>
          搜尋
        </button>
      </div>
      <div className="saved-charts-status">{loading ? '搜尋中…' : searchStatusText(charts.length, appliedQuery)}</div>

      {loading ? (
        <p>載入中…</p>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>姓名</th>
                <th>性別</th>
                <th>出生年月日時</th>
                <th>儲存時間</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {charts.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', color: '#888' }}>
                    {appliedQuery.trim() ? '找不到符合的命盤' : '尚無已存命盤'}
                  </td>
                </tr>
              ) : (
                charts.map((chart) => (
                  <tr key={chart.id}>
                    <td>{chart.subjectName}</td>
                    <td>{chart.gender}</td>
                    <td>{chart.birthDateTime}</td>
                    <td>{new Date(chart.createdAt).toLocaleString('zh-TW')}</td>
                    <td>
                      <button type="button" onClick={() => void handleLoadChart(chart.id)}>
                        提取命盤
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
