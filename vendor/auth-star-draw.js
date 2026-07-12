(function () {
  const auth = window.ZiweiAuth

  function appRoot() {
    return location.pathname.includes('/star-draw/') ? '../' : ''
  }

  function redirectToLogin() {
    location.href = appRoot() + 'index.html'
  }

  function showDenied(message) {
    const gate = document.getElementById('accessGate')
    const denied = document.getElementById('accessDenied')
    const app = document.getElementById('starDrawApp')
    if (gate) gate.hidden = true
    if (app) app.hidden = true
    if (denied) {
      denied.hidden = false
      const msg = denied.querySelector('[data-denied-message]')
      if (msg) msg.textContent = message || '您尚未開通神牌功能，請聯絡管理員。'
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
    script.src = 'js/app.js'
    script.dataset.starDrawApp = '1'
    document.body.appendChild(script)
  }

  function apiWithTimeout(path, ms) {
    return Promise.race([
      auth.api(path),
      new Promise(function (_, reject) {
        setTimeout(function () {
          reject(new Error('連線逾時，伺服器可能正在喚醒，請稍後再試'))
        }, ms)
      }),
    ])
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

      if (user.role !== 'admin' && !user.starDrawEnabled) {
        showDenied('您尚未開通神牌功能，請聯絡管理員。')
        return
      }

      showApp()
      loadStarDrawApp()
    } catch (err) {
      const message = err instanceof Error ? err.message : '驗證失敗'
      if (message.includes('登入') || message.includes('401')) {
        auth.setToken(null)
        redirectToLogin()
        return
      }
      showDenied(message)
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    const backBtn = document.getElementById('backToChartBtn')
    if (backBtn) {
      backBtn.addEventListener('click', function () {
        location.href = appRoot() + 'chart.html'
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

    boot()
  })
})()
