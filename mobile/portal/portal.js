(function () {
  const auth = window.ZiweiAuth

  const bootEl = document.getElementById('portalBoot')
  const loginEl = document.getElementById('portalLogin')
  const statusEl = document.getElementById('portalStatus')
  const loginError = document.getElementById('portalLoginError')
  const statusError = document.getElementById('portalStatusError')
  const userNameEl = document.getElementById('portalUserName')
  const statusTextEl = document.getElementById('portalStatusText')
  const enterCoreBtn = document.getElementById('enterCoreBtn')
  const requestAccessBtn = document.getElementById('requestAccessBtn')
  const refreshStatusBtn = document.getElementById('refreshStatusBtn')
  const logoutBtn = document.getElementById('logoutBtn')

  let currentUser = null

  function showOnly(view) {
    if (bootEl) bootEl.hidden = view !== 'boot'
    if (loginEl) loginEl.hidden = view !== 'login'
    if (statusEl) statusEl.hidden = view !== 'status'
  }

  function setError(el, message) {
    if (!el) return
    if (!message) {
      el.hidden = true
      el.textContent = ''
      return
    }
    el.hidden = false
    el.textContent = message
  }

  function canEnterCore(user) {
    return Boolean(user && (user.role === 'admin' || user.starDrawEnabled))
  }

  function renderStatus(user, message) {
    currentUser = user
    showOnly('status')
    setError(statusError, '')
    if (userNameEl) {
      userNameEl.textContent = user.name + ' · ' + (auth.memberTierDetailedLabel(user) || '')
    }

    const allowed = canEnterCore(user)
    const pending = Boolean(user.starDrawRequestPending)

    if (statusTextEl) {
      if (allowed) {
        statusTextEl.textContent = message || '神牌功能已開通，可以進入核心。'
      } else if (pending) {
        statusTextEl.textContent =
          message || '已送出神牌授權申請，請等候管理員開通。'
      } else if (user.status !== 'approved') {
        statusTextEl.textContent = '會員尚未審核通過，通過後才能申請神牌授權。'
      } else {
        statusTextEl.textContent =
          message || '尚未開通神牌功能，請先申請授權。'
      }
    }

    if (enterCoreBtn) enterCoreBtn.hidden = !allowed
    if (requestAccessBtn) {
      requestAccessBtn.hidden = allowed || pending || user.status !== 'approved'
      requestAccessBtn.disabled = false
      requestAccessBtn.textContent = pending ? '已申請授權' : '申請授權'
    }
  }

  async function fetchMe() {
    const data = await auth.api('/api/auth/me')
    return data.user
  }

  async function showLoggedIn(user) {
    if (!user || user.status === 'rejected') {
      auth.setToken(null)
      showOnly('login')
      return
    }
    renderStatus(user)
  }

  async function refreshStatus() {
    setError(statusError, '')
    if (refreshStatusBtn) refreshStatusBtn.disabled = true
    try {
      const user = await fetchMe()
      renderStatus(user)
    } catch (err) {
      const message = err instanceof Error ? err.message : '重新檢查失敗'
      if (message.includes('登入') || message.includes('401')) {
        auth.setToken(null)
        showOnly('login')
        return
      }
      setError(statusError, message)
    } finally {
      if (refreshStatusBtn) refreshStatusBtn.disabled = false
    }
  }

  async function requestAccess() {
    setError(statusError, '')
    if (requestAccessBtn) requestAccessBtn.disabled = true
    try {
      const data = await auth.api('/api/star-draw/request-access', { method: 'POST' })
      if (data.user) {
        renderStatus(data.user, data.message)
      } else {
        await refreshStatus()
      }
      if (data.starDrawEnabled) {
        enterCore()
      }
    } catch (err) {
      setError(statusError, err instanceof Error ? err.message : '申請失敗')
      if (requestAccessBtn) requestAccessBtn.disabled = false
    }
  }

  function enterCore() {
    location.href = './star-draw/index.html'
  }

  function bindEvents() {
    const form = document.getElementById('portalLoginForm')
    if (form) {
      form.addEventListener('submit', async function (e) {
        e.preventDefault()
        setError(loginError, '')
        const submitBtn = form.querySelector('button[type=submit]')
        if (submitBtn) submitBtn.disabled = true
        try {
          const data = await auth.api('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({
              email: form.email.value.trim(),
              password: form.password.value,
            }),
          })
          if (!data.token || !data.user) {
            throw new Error('登入回應異常')
          }
          auth.setToken(data.token)
          await showLoggedIn(data.user)
        } catch (err) {
          setError(loginError, err instanceof Error ? err.message : '登入失敗')
        } finally {
          if (submitBtn) submitBtn.disabled = false
        }
      })
    }

    if (enterCoreBtn) enterCoreBtn.addEventListener('click', enterCore)
    if (requestAccessBtn) requestAccessBtn.addEventListener('click', requestAccess)
    if (refreshStatusBtn) refreshStatusBtn.addEventListener('click', refreshStatus)
    if (logoutBtn) {
      logoutBtn.addEventListener('click', function () {
        auth.setToken(null)
        currentUser = null
        showOnly('login')
        setError(loginError, '')
      })
    }
  }

  async function boot() {
    showOnly('boot')
    bindEvents()

    const token = auth.getToken()
    if (!token) {
      showOnly('login')
      return
    }

    try {
      const user = await fetchMe()
      await showLoggedIn(user)
    } catch (_err) {
      auth.setToken(null)
      showOnly('login')
    }
  }

  document.addEventListener('DOMContentLoaded', boot)
})()
