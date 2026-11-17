(function () {
  const auth = window.ZiweiAuth

  function isCapacitorApp() {
    return Boolean(window.Capacitor && (window.Capacitor.isNativePlatform ? window.Capacitor.isNativePlatform() : true))
  }

  function appRoot() {
    return location.pathname.includes('/star-draw/') ? '../' : ''
  }

  function redirectToLogin() {
    location.href = appRoot() + 'index.html'
  }

  function goBack() {
    if (isCapacitorApp()) {
      location.href = appRoot() + 'index.html'
      return
    }
    location.href = appRoot() + 'chart.html'
  }

  function showDenied(message, options) {
    const pending = Boolean(options && options.pending)
    const gate = document.getElementById('accessGate')
    const denied = document.getElementById('accessDenied')
    const app = document.getElementById('starDrawApp')
    if (gate) gate.hidden = true
    if (app) app.hidden = true
    if (denied) {
      denied.hidden = false
      const msg = denied.querySelector('[data-denied-message]')
      if (msg) {
        msg.textContent =
          message ||
          (pending
            ? '已送出神牌授權申請，請等候管理員開通。'
            : '您尚未開通神牌功能，請申請授權或聯絡管理員。')
      }
      const requestBtn = document.getElementById('requestAccessBtn')
      if (requestBtn) requestBtn.hidden = pending
    }
  }

  function showApp() {
    const gate = document.getElementById('accessGate')
    const denied = document.getElementById('accessDenied')
    const app = document.getElementById('starDrawApp')
    if (gate) gate.hidden = true
    if (denied) denied.hidden = true
    if (app) app.hidden = false
  }

  function loadStarDrawApp() {
    if (document.querySelector('script[data-star-draw-app]')) return
    const script = document.createElement('script')
    script.type = 'module'
    script.src = new URL('js/app.js', location.href).href
    script.dataset.starDrawApp = '1'
    script.onerror = function () {
      const hint = document.getElementById('hint')
      if (hint) hint.textContent = '神牌模組載入失敗，請重新安裝或聯絡管理員'
      console.error('[star-draw] failed to load js/app.js')
    }
    document.body.appendChild(script)
  }

  function apiWithTimeout(path, ms, options) {
    return Promise.race([
      auth.api(path, options),
      new Promise(function (_, reject) {
        setTimeout(function () {
          reject(new Error('連線逾時，伺服器可能正在喚醒，請稍後再試'))
        }, ms)
      }),
    ])
  }

  async function requestAccess() {
    const requestBtn = document.getElementById('requestAccessBtn')
    if (requestBtn) requestBtn.disabled = true
    try {
      const data = await apiWithTimeout('/api/star-draw/request-access', 20000, { method: 'POST' })
      if (data.starDrawEnabled) {
        showApp()
        loadStarDrawApp()
        return
      }
      showDenied(data.message || '已送出神牌授權申請，請等候管理員開通。', {
        pending: Boolean(data.starDrawRequestPending),
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : '申請失敗'
      showDenied(message, { pending: false })
      if (requestBtn) requestBtn.disabled = false
    }
  }

  async function boot() {
    const token = auth.getToken()
    if (!token) {
      redirectToLogin()
      return
    }

    const gateMsg = document.querySelector('#accessGate [data-gate-message]')

    try {
      if (gateMsg) gateMsg.textContent = '正在驗證會員權限…'
      const data = await apiWithTimeout('/api/auth/me', 20000)
      const user = data.user

      if (!user || user.status !== 'approved') {
        auth.setToken(null)
        redirectToLogin()
        return
      }

      if (user.role === 'admin' || user.starDrawEnabled) {
        showApp()
        loadStarDrawApp()
        return
      }

      showDenied(
        user.starDrawRequestPending
          ? '已送出神牌授權申請，請等候管理員開通。'
          : '您尚未開通神牌功能，請申請授權或聯絡管理員。',
        { pending: Boolean(user.starDrawRequestPending) },
      )
    } catch (err) {
      const message = err instanceof Error ? err.message : '驗證失敗'
      if (message.includes('登入') || message.includes('401')) {
        auth.setToken(null)
        redirectToLogin()
        return
      }
      showDenied(message, { pending: false })
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    const backBtn = document.getElementById('backToChartBtn')
    if (backBtn) {
      backBtn.addEventListener('click', function () {
        goBack()
      })
    }

    const retryBtn = document.getElementById('retryAccessBtn')
    if (retryBtn) {
      retryBtn.addEventListener('click', function () {
        const gate = document.getElementById('accessGate')
        const denied = document.getElementById('accessDenied')
        if (denied) denied.hidden = true
        if (gate) gate.hidden = false
        boot()
      })
    }

    const requestBtn = document.getElementById('requestAccessBtn')
    if (requestBtn) {
      requestBtn.addEventListener('click', function () {
        requestAccess()
      })
    }

    boot()
  })
})()
