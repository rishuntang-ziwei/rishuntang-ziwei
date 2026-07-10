import { useCallback, useEffect, useState } from 'react'
import { approveUser, deleteUserAccount, fetchAdminUsers, makeUserAdmin, rejectUser, revokeUserAdmin } from '../../lib/api'
import { useAuth } from '../../context/AuthContext'
import type { AuthUser } from '../../types/auth'
import { AdminUserChartsPanel } from './AdminUserChartsPanel'

function statusLabel(status: AuthUser['status']) {
  if (status === 'pending') return '待審核'
  if (status === 'approved') return '已開通'
  return '已拒絕'
}

export function AdminPanel({ onBack }: { onBack: () => void }) {
  const { user, logout } = useAuth()
  const [users, setUsers] = useState<AuthUser[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [viewingCharts, setViewingCharts] = useState<{ id: number; name: string } | null>(null)

  const loadUsers = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const { users: list } = await fetchAdminUsers()
      setUsers(list)
    } catch (err) {
      setError(err instanceof Error ? err.message : '載入失敗')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadUsers()
  }, [loadUsers])

  async function handleApprove(id: number) {
    await approveUser(id)
    await loadUsers()
  }

  async function handleReject(id: number) {
    await rejectUser(id)
    await loadUsers()
  }

  async function handleMakeAdmin(id: number, name: string) {
    if (!confirm(`確定要將「${name}」設為管理員？\n對方將可審核會員並管理帳號。`)) return
    await makeUserAdmin(id)
    await loadUsers()
  }

  async function handleRevokeAdmin(id: number, name: string) {
    if (!confirm(`確定要取消「${name}」的管理員權限？`)) return
    await revokeUserAdmin(id)
    await loadUsers()
  }

  async function handleDelete(id: number, name: string) {
    if (!confirm(`確定要永久刪除「${name}」的帳號？\n此操作無法復原。`)) return
    await deleteUserAccount(id)
    await loadUsers()
  }

  if (viewingCharts) {
    return (
      <AdminUserChartsPanel
        userId={viewingCharts.id}
        userName={viewingCharts.name}
        onBack={() => setViewingCharts(null)}
      />
    )
  }

  return (
    <div className="admin-page">
      <header className="admin-header">
        <div>
          <h1>會員管理</h1>
          <p>管理員：{user?.name}</p>
        </div>
        <div className="admin-header-actions">
          <button type="button" onClick={onBack}>
            返回排盤
          </button>
          <button type="button" onClick={logout}>
            登出
          </button>
        </div>
      </header>

      {error && <div className="auth-error">{error}</div>}
      {loading ? (
        <p>載入中…</p>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>姓名</th>
                <th>電話</th>
                <th>Email</th>
                <th>狀態</th>
                <th>申請時間</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {users.map((item) => (
                <tr key={item.id}>
                  <td>{item.name}</td>
                  <td>{item.phone}</td>
                  <td>{item.email}</td>
                  <td>
                    <span className={`status-badge status-${item.status}`}>
                      {item.role === 'admin' ? '管理員' : statusLabel(item.status)}
                    </span>
                  </td>
                  <td>{new Date(item.createdAt).toLocaleString('zh-TW')}</td>
                  <td>
                    {item.role === 'admin' ? (
                      item.id === user?.id ? (
                        '—'
                      ) : (
                        <div className="admin-actions">
                          <button
                            type="button"
                            className="danger"
                            onClick={() => handleRevokeAdmin(item.id, item.name)}
                          >
                            取消管理員
                          </button>
                        </div>
                      )
                    ) : item.status === 'pending' ? (
                      <div className="admin-actions">
                        <button type="button" onClick={() => handleApprove(item.id)}>
                          開通
                        </button>
                        <button type="button" className="danger" onClick={() => handleReject(item.id)}>
                          拒絕
                        </button>
                        <button type="button" onClick={() => handleMakeAdmin(item.id, item.name)}>
                          設為管理員
                        </button>
                        <button type="button" className="danger" onClick={() => handleDelete(item.id, item.name)}>
                          刪除
                        </button>
                      </div>
                    ) : item.status === 'approved' ? (
                      <div className="admin-actions">
                        <button
                          type="button"
                          onClick={() => setViewingCharts({ id: item.id, name: item.name })}
                        >
                          查看命盤
                        </button>
                        <button type="button" onClick={() => handleMakeAdmin(item.id, item.name)}>
                          設為管理員
                        </button>
                        <button type="button" className="danger" onClick={() => handleDelete(item.id, item.name)}>
                          刪除
                        </button>
                      </div>
                    ) : (
                      <div className="admin-actions">
                        <button
                          type="button"
                          onClick={() => setViewingCharts({ id: item.id, name: item.name })}
                        >
                          查看命盤
                        </button>
                        <button type="button" className="danger" onClick={() => handleDelete(item.id, item.name)}>
                          刪除
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
