import { useCallback, useEffect, useState } from 'react'
import {
  approveUser,
  deleteUserAccount,
  disableUserStarDraw,
  enableUserStarDraw,
  fetchAdminMembers,
  grantUserMembership,
  makeUserAdmin,
  rejectUser,
  revokeUserAdmin,
} from '../../lib/api'
import { useAuth } from '../../context/AuthContext'
import type { AdminMemberSegment, AdminMemberSummary, AuthUser } from '../../types/auth'
import { AdminUserChartsPanel } from './AdminUserChartsPanel'

import type { SavedChartPayload } from '../../types/charts'

function membershipTierLabel(user: AuthUser) {
  if (user.role === 'admin') return '管理員'
  if (user.membershipActive) return '付費會員'
  if (user.status === 'pending') return '待審核'
  if (user.status === 'rejected') return '已拒絕'
  return '免費會員'
}

function formatExpiry(iso: string | null) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('zh-TW')
}

function tabTitle(tab: AdminMemberSegment) {
  if (tab === 'free') return '免費會員資料庫'
  if (tab === 'paid') return '付費會員資料庫'
  if (tab === 'pending') return '待審核會員'
  return '管理員'
}

function tabNote(tab: AdminMemberSegment) {
  if (tab === 'free') {
    return '註冊即列入免費會員資料庫，可使用本命命盤；線上訂閱或管理員手動開通後，會移至付費會員。'
  }
  if (tab === 'paid') {
    return '付費訂閱中的會員，可完整使用大限流年、列印儲存與神牌等功能；線下付款可由管理員按「延長付費」加期。'
  }
  if (tab === 'pending') {
    return '尚未審核通過的申請（若仍使用人工審核流程）。'
  }
  return '系統管理員帳號。'
}

export function AdminPanel({
  onBack,
  onLoadChart,
}: {
  onBack: () => void
  onLoadChart: (payload: SavedChartPayload) => void
}) {
  const { user, logout } = useAuth()
  const [tab, setTab] = useState<AdminMemberSegment>('free')
  const [members, setMembers] = useState<AuthUser[]>([])
  const [summary, setSummary] = useState<AdminMemberSummary>({ free: 0, paid: 0, pending: 0, admins: 0 })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [viewingCharts, setViewingCharts] = useState<{ id: number; name: string } | null>(null)
  const [grantTarget, setGrantTarget] = useState<{ id: number; name: string; extend: boolean } | null>(null)
  const [grantPlanId, setGrantPlanId] = useState('member_monthly')
  const [grantError, setGrantError] = useState('')
  const [grantSubmitting, setGrantSubmitting] = useState(false)

  const loadMembers = useCallback(async (segment: AdminMemberSegment) => {
    setLoading(true)
    setError('')
    try {
      const data = await fetchAdminMembers(segment)
      setMembers(data.members)
      setSummary(data.summary)
      setTab(segment)
    } catch (err) {
      setError(err instanceof Error ? err.message : '載入失敗')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadMembers(tab)
  }, [loadMembers, tab])

  async function refresh() {
    await loadMembers(tab)
  }

  async function handleApprove(id: number) {
    await approveUser(id)
    await refresh()
  }

  async function handleReject(id: number) {
    await rejectUser(id)
    await refresh()
  }

  async function handleMakeAdmin(id: number, name: string) {
    if (!confirm(`確定要將「${name}」設為管理員？\n對方將可審核會員並管理帳號。`)) return
    await makeUserAdmin(id)
    await refresh()
  }

  async function handleRevokeAdmin(id: number, name: string) {
    if (!confirm(`確定要取消「${name}」的管理員權限？`)) return
    await revokeUserAdmin(id)
    await refresh()
  }

  async function handleDelete(id: number, name: string) {
    if (!confirm(`確定要永久刪除「${name}」的帳號？\n此操作無法復原。`)) return
    await deleteUserAccount(id)
    await refresh()
  }

  async function handleEnableStarDraw(id: number, name: string) {
    if (!confirm(`確定要為「${name}」開通神牌功能？`)) return
    await enableUserStarDraw(id)
    await refresh()
  }

  async function handleDisableStarDraw(id: number, name: string) {
    if (!confirm(`確定要取消「${name}」的神牌功能？`)) return
    await disableUserStarDraw(id)
    await refresh()
  }

  async function submitGrantMembership() {
    if (!grantTarget) return
    setGrantSubmitting(true)
    setGrantError('')
    try {
      const data = await grantUserMembership(grantTarget.id, grantPlanId)
      alert(`已為「${grantTarget.name}」開通 ${data.planLabel}`)
      setGrantTarget(null)
      await refresh()
    } catch (err) {
      setGrantError(err instanceof Error ? err.message : '開通失敗')
    } finally {
      setGrantSubmitting(false)
    }
  }

  function grantMembershipButton(item: AuthUser) {
    if (item.role !== 'user' || item.status === 'rejected') return null
    if (item.status !== 'pending' && item.status !== 'approved') return null
    const extend = item.status === 'approved' && item.membershipActive
    return (
      <button
        type="button"
        onClick={() => {
          setGrantPlanId('member_monthly')
          setGrantError('')
          setGrantTarget({ id: item.id, name: item.name, extend })
        }}
      >
        {extend ? '延長付費' : '開通付費'}
      </button>
    )
  }

  function starDrawButton(item: AuthUser) {
    if (item.role !== 'user' || item.status !== 'approved') return null
    return item.starDrawEnabled ? (
      <button type="button" className="danger" onClick={() => handleDisableStarDraw(item.id, item.name)}>
        取消神牌
      </button>
    ) : (
      <button type="button" onClick={() => handleEnableStarDraw(item.id, item.name)}>
        開通神牌
      </button>
    )
  }

  function renderActions(item: AuthUser) {
    if (item.role === 'admin') {
      return item.id === user?.id ? (
        '—'
      ) : (
        <div className="admin-actions">
          <button type="button" className="danger" onClick={() => handleRevokeAdmin(item.id, item.name)}>
            取消管理員
          </button>
        </div>
      )
    }

    if (item.status === 'pending') {
      return (
        <div className="admin-actions">
          <button type="button" onClick={() => setViewingCharts({ id: item.id, name: item.name })}>
            查看命盤
          </button>
          <button type="button" onClick={() => handleApprove(item.id)}>
            開通
          </button>
          {grantMembershipButton(item)}
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
      )
    }

    return (
      <div className="admin-actions">
        <button type="button" onClick={() => setViewingCharts({ id: item.id, name: item.name })}>
          查看命盤
        </button>
        {grantMembershipButton(item)}
        {starDrawButton(item)}
        <button type="button" onClick={() => handleMakeAdmin(item.id, item.name)}>
          設為管理員
        </button>
        <button type="button" className="danger" onClick={() => handleDelete(item.id, item.name)}>
          刪除
        </button>
      </div>
    )
  }

  if (viewingCharts) {
    return (
      <AdminUserChartsPanel
        userId={viewingCharts.id}
        userName={viewingCharts.name}
        onBack={() => setViewingCharts(null)}
        onLoadChart={onLoadChart}
      />
    )
  }

  if (grantTarget) {
    return (
      <div className="password-modal">
        <div className="password-modal-card">
          <h3>{grantTarget.extend ? '延長付費會員' : '開通付費會員'}</h3>
          <p className="auth-note">
            為「{grantTarget.name}」手動開通（線下付款），效果與線上訂閱相同。
          </p>
          <label>
            訂閱方案
            <select value={grantPlanId} onChange={(e) => setGrantPlanId(e.target.value)}>
              <option value="member_monthly">付費會員 · 單月（30 天）</option>
              <option value="member_half_year">付費會員 · 半年（182 天）</option>
              <option value="member_yearly">付費會員 · 一年（365 天）</option>
            </select>
          </label>
          {grantError && <div className="auth-error">{grantError}</div>}
          <div className="password-modal-actions">
            <button type="button" className="secondary" onClick={() => setGrantTarget(null)} disabled={grantSubmitting}>
              取消
            </button>
            <button type="button" className="primary" onClick={submitGrantMembership} disabled={grantSubmitting}>
              {grantSubmitting ? '處理中…' : '確認開通'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="admin-page admin-member-db">
      <header className="admin-member-header">
        <div>
          <h1>會員資料庫</h1>
          <p className="admin-member-subtitle">
            {tabTitle(tab)} · 共 {members.length} 筆
          </p>
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

      <div className="admin-member-tabs">
        {(
          [
            ['free', `免費會員（${summary.free}）`],
            ['paid', `付費會員（${summary.paid}）`],
            ['pending', `待審核（${summary.pending}）`],
            ['admins', `管理員（${summary.admins}）`],
          ] as const
        ).map(([segment, label]) => (
          <button
            key={segment}
            type="button"
            className={`admin-member-tab${tab === segment ? ' is-active' : ''}`}
            onClick={() => setTab(segment)}
          >
            {label}
          </button>
        ))}
      </div>

      <p className="admin-member-note">{tabNote(tab)}</p>

      {error && <div className="auth-error">{error}</div>}
      {loading ? (
        <p>載入中…</p>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table admin-member-table">
            <thead>
              <tr>
                <th>姓名</th>
                <th>電話</th>
                <th>Email</th>
                {tab === 'paid' ? (
                  <>
                    <th>出生資料</th>
                    <th>訂閱方案</th>
                    <th>有效至</th>
                    <th>神牌</th>
                    <th>註冊時間</th>
                  </>
                ) : tab === 'admins' ? (
                  <th>建立時間</th>
                ) : (
                  <>
                    <th>出生資料</th>
                    <th>會員類型</th>
                    <th>神牌</th>
                    <th>註冊時間</th>
                  </>
                )}
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {members.length === 0 ? (
                <tr>
                  <td colSpan={tab === 'paid' ? 9 : tab === 'admins' ? 5 : 8} className="admin-empty">
                    {tab === 'free'
                      ? '目前沒有免費會員'
                      : tab === 'paid'
                        ? '目前沒有付費會員'
                        : tab === 'pending'
                          ? '目前沒有待審核會員'
                          : '尚無其他管理員'}
                  </td>
                </tr>
              ) : (
                members.map((item) => (
                  <tr key={item.id}>
                    <td>{item.name}</td>
                    <td>{item.phone}</td>
                    <td>{item.email}</td>
                    {tab === 'paid' ? (
                      <>
                        <td>{item.birthDateTime || '—'}</td>
                        <td>{item.membershipPlanLabel || '付費會員'}</td>
                        <td>{formatExpiry(item.membershipExpiresAt)}</td>
                        <td>{item.starDrawEnabled ? '已開通' : '未開通'}</td>
                        <td>{new Date(item.createdAt).toLocaleString('zh-TW')}</td>
                      </>
                    ) : tab === 'admins' ? (
                      <td>{new Date(item.createdAt).toLocaleString('zh-TW')}</td>
                    ) : (
                      <>
                        <td>{item.birthDateTime || '—'}</td>
                        <td>{membershipTierLabel(item)}</td>
                        <td>{item.starDrawEnabled ? '已開通' : '未開通'}</td>
                        <td>{new Date(item.createdAt).toLocaleString('zh-TW')}</td>
                      </>
                    )}
                    <td>{renderActions(item)}</td>
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
