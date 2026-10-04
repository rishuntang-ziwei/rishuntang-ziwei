window.ZiweiAuth = (function () {
  const TOKEN_KEY = 'ziwei_auth_token'
  const DEVICE_ID_KEY = 'ziwei_device_id'
  const DEVICE_TOKEN_KEY = 'ziwei_device_token'
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

  function randomDeviceId() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID()
    return 'd' + Date.now().toString(36) + Math.random().toString(36).slice(2, 12)
  }

  function getOrCreateDeviceId() {
    let id = localStorage.getItem(DEVICE_ID_KEY)
    if (!id) {
      id = randomDeviceId()
      localStorage.setItem(DEVICE_ID_KEY, id)
    }
    return id
  }

  function getDeviceToken() {
    return localStorage.getItem(DEVICE_TOKEN_KEY)
  }

  function setDeviceToken(token) {
    if (token) localStorage.setItem(DEVICE_TOKEN_KEY, token)
    else localStorage.removeItem(DEVICE_TOKEN_KEY)
  }

  function clearDeviceTrust() {
    localStorage.removeItem(DEVICE_TOKEN_KEY)
  }

  function isAdminUser(user) {
    return user && user.role === 'admin'
  }

  function isSuperAdminUser(user) {
    return isAdminUser(user) && Boolean(user.isSuperAdmin)
  }

  function adminRoleLabel(user) {
    if (isSuperAdminUser(user)) return '超級管理員'
    if (isAdminUser(user)) return '管理員'
    return ''
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

  function statusLabel(status, role, isSuperAdmin) {
    if (role === 'admin') return isSuperAdmin ? '超級管理員' : '管理員'
    if (status === 'pending') return '待審核'
    if (status === 'approved') return '已開通'
    return '已拒絕'
  }

  function membershipTierLabel(user) {
    var adminLabel = adminRoleLabel(user)
    if (adminLabel) return adminLabel
    if (user.membershipActive) return '付費會員'
    if (user.status === 'pending') return '待審核'
    if (user.status === 'rejected') return '已拒絕'
    return '免費會員'
  }

  function memberTierDetailedLabel(user) {
    var adminLabel = adminRoleLabel(user)
    if (adminLabel) return adminLabel
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

  async function tryDeviceLogin() {
    const deviceId = getOrCreateDeviceId()
    const deviceToken = getDeviceToken()
    if (!deviceToken) return null
    return api('/api/auth/device-login', {
      method: 'POST',
      body: JSON.stringify({ deviceId: deviceId, deviceToken: deviceToken }),
    })
  }

  return {
    TOKEN_KEY,
    DEVICE_ID_KEY,
    DEVICE_TOKEN_KEY,
    LOGIN_PAGE,
    CHART_PAGE,
    apiBase,
    getToken,
    setToken,
    getOrCreateDeviceId,
    getDeviceToken,
    setDeviceToken,
    clearDeviceTrust,
    isAdminUser,
    isSuperAdminUser,
    adminRoleLabel,
    tryDeviceLogin,
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
