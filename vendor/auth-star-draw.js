(function () {
  const auth = window.ZiweiAuth
  const CHART_PAGE = auth.CHART_PAGE || 'chart.html'

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

  async function boot() {
    const token = auth.getToken()
    if (!token) {
      auth.redirectToLogin()
      return
    }

    try {
      await auth.api('/api/star-draw/access')
      showApp()
      loadStarDrawApp()
    } catch (err) {
      if (err.message && err.message.includes('登入')) {
        auth.setToken(null)
        auth.redirectToLogin()
        return
      }
      showDenied(err.message)
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    const backBtn = document.getElementById('backToChartBtn')
    if (backBtn) {
      backBtn.addEventListener('click', function () {
        location.href = '../' + CHART_PAGE
      })
    }
    boot()
  })
})()
