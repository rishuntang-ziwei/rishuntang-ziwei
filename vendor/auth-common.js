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

  function formatMembershipExpiry(iso) {
    if (!iso) return '—'
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return '—'
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
    formatMembershipExpiry,
    redirectToLogin,
    redirectToChart,
  }
})()
