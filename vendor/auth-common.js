window.ZiweiAuth = (function () {
  const TOKEN_KEY = 'ziwei_auth_token'
  const LOGIN_PAGE = 'index.html'
  const CHART_PAGE = 'chart.html'

  function apiBase() {
    return (window.API_BASE || '').replace(/\/$/, '')
  }

  function getToken() {
    return localStorage.getItem(TOKEN_KEY)
  }

  function setToken(token) {
    if (token) localStorage.setItem(TOKEN_KEY, token)
    else localStorage.removeItem(TOKEN_KEY)
  }

  async function api(path, options) {
    const headers = Object.assign({ 'Content-Type': 'application/json' }, options && options.headers)
    const token = getToken()
    if (token) headers.Authorization = 'Bearer ' + token
    const res = await fetch(apiBase() + path, Object.assign({}, options, { headers }))
    const data = await res.json().catch(function () { return {} })
    if (!res.ok) throw new Error(data.error || '請求失敗')
    return data
  }

  function statusLabel(status, role) {
    if (role === 'admin') return '管理員'
    if (status === 'pending') return '待審核'
    if (status === 'approved') return '已開通'
    return '已拒絕'
  }

  function membershipTierLabel(user) {
    if (user.role === 'admin') return '管理員'
    if (user.membershipActive) return '付費會員'
    if (user.status === 'pending') return '待審核'
    if (user.status === 'rejected') return '已拒絕'
    return '免費會員'
  }

  function memberTierDetailedLabel(user) {
    if (user.role === 'admin') return '管理員'
    if (user.status === 'pending') return '待審核'
    if (user.status === 'rejected') return '已拒絕'
    var parts = []
    parts.push(user.membershipActive ? '付費會員' : '免費會員')
    if (user.starDrawEnabled) parts.push('神牌已開通')
    return parts.join(' · ')
  }

  function daysUntilMembershipExpiry(user) {
    if (!user || !user.membershipActive || !user.membershipExpiresAt) return null
    var d = new Date(user.membershipExpiresAt)
    if (Number.isNaN(d.getTime()) || d.getFullYear() >= 2099) return null
    var diff = d.getTime() - Date.now()
    if (diff <= 0) return 0
    return Math.ceil(diff / (24 * 60 * 60 * 1000))
  }

  function formatMembershipExpiry(iso) {
    if (!iso) return '—'
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return '—'
    if (d.getFullYear() >= 2099) return '終身'
    return d.toLocaleDateString('zh-TW')
  }

  function redirectToLogin() {
    location.href = LOGIN_PAGE
  }

  function redirectToChart() {
    location.href = CHART_PAGE
  }

  return {
    TOKEN_KEY,
    LOGIN_PAGE,
    CHART_PAGE,
    apiBase,
    getToken,
    setToken,
    api,
    statusLabel,
    membershipTierLabel,
    memberTierDetailedLabel,
    daysUntilMembershipExpiry,
    formatMembershipExpiry,
    redirectToLogin,
    redirectToChart,
  }
})()
