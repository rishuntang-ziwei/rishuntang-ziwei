import { useState } from 'react'
import { ChartApp } from './ChartApp'
import { AdminPanel } from './components/auth/AdminPanel'
import { AuthShell } from './components/auth/AuthShell'
import { useAuth } from './context/AuthContext'
import type { SavedChartPayload } from './types/charts'
import './App.css'

function App() {
  const { user, loading } = useAuth()
  const [showAdmin, setShowAdmin] = useState(false)
  const [pendingChartPayload, setPendingChartPayload] = useState<SavedChartPayload | null>(null)

  if (loading) {
    return <div className="auth-page"><div className="auth-card">載入中…</div></div>
  }

  if (!user || user.status !== 'approved') {
    return <AuthShell />
  }

  if (user.role === 'admin' && showAdmin) {
    return (
      <AdminPanel
        onBack={() => setShowAdmin(false)}
        onLoadChart={(payload) => {
          setPendingChartPayload(payload)
          setShowAdmin(false)
        }}
      />
    )
  }

  return (
    <ChartApp
      onOpenAdmin={user.role === 'admin' ? () => setShowAdmin(true) : undefined}
      pendingChartPayload={pendingChartPayload}
      onPendingChartLoaded={() => setPendingChartPayload(null)}
    />
  )
}

export default App
