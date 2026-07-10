import { useCallback, useEffect, useState } from 'react'
import { fetchAdminUserCharts } from '../../lib/api'
import type { SavedChartSummary } from '../../types/charts'

export function AdminUserChartsPanel({
  userId,
  userName,
  onBack,
}: {
  userId: number
  userName: string
  onBack: () => void
}) {
  const [charts, setCharts] = useState<SavedChartSummary[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadCharts = useCallback(async (query: string) => {
    setLoading(true)
    setError('')
    try {
      const { charts: list } = await fetchAdminUserCharts(userId, query)
      setCharts(list)
    } catch (err) {
      setError(err instanceof Error ? err.message : '載入失敗')
      setCharts([])
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadCharts(search)
    }, 250)
    return () => window.clearTimeout(timer)
  }, [loadCharts, search])

  return (
    <div className="admin-page">
      <header className="admin-header">
        <div>
          <h1>「{userName}」的已存命盤</h1>
        </div>
        <div className="admin-header-actions">
          <button type="button" onClick={onBack}>
            返回會員管理
          </button>
        </div>
      </header>

      {error && <div className="auth-error">{error}</div>}

      <input
        type="search"
        value={search}
        placeholder="搜尋姓名…"
        className="admin-chart-search"
        onChange={(e) => setSearch(e.target.value)}
      />

      {loading ? (
        <p>載入中…</p>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>姓名</th>
                <th>性別</th>
                <th>八字</th>
                <th>儲存時間</th>
              </tr>
            </thead>
            <tbody>
              {charts.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', color: '#888' }}>
                    尚無已存命盤
                  </td>
                </tr>
              ) : (
                charts.map((chart) => (
                  <tr key={chart.id}>
                    <td>{chart.subjectName}</td>
                    <td>{chart.gender}</td>
                    <td>{chart.bazi}</td>
                    <td>{new Date(chart.createdAt).toLocaleString('zh-TW')}</td>
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
