(function () {
  const TOKEN_KEY = 'ziwei_auth_token'
  let currentUser = null

  function statusLabel(status, role) {
    if (role === 'admin') return '管理員'
    if (status === 'pending') return '待審核'
    if (status === 'approved') return '已開通'
    return '已拒絕'
  }

  async function renderAdminPanel() {
    const panel = document.getElementById('adminPanel')
    const appRoot = document.getElementById('appRoot')
    const bar = document.getElementById('userBar')
    if (!panel) return

    panel.hidden = false
    if (appRoot) appRoot.hidden = true
    if (bar) bar.hidden = true
    panel.innerHTML = '<div class="auth-card"><p>載入中…</p></div>'

    try {
      const data = await api('/api/admin/users')
      const rows = data.users.map(function (user) {
        const actions = user.role === 'user' && user.status === 'pending'
          ? '<div class="admin-actions">' +
              '<button type="button" data-approve="' + user.id + '">開通</button>' +
              '<button type="button" class="danger" data-reject="' + user.id + '">拒絕</button>' +
            '</div>'
          : '—'
        return (
          '<tr>' +
            '<td>' + user.name + '</td>' +
            '<td>' + user.phone + '</td>' +
            '<td>' + user.email + '</td>' +
            '<td>' + statusLabel(user.status, user.role) + '</td>' +
            '<td>' + new Date(user.createdAt).toLocaleString('zh-TW') + '</td>' +
            '<td>' + actions + '</td>' +
          '</tr>'
        )
      }).join('')

      panel.innerHTML =
        '<div id="adminPanelInner">' +
          '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">' +
            '<h2>會員管理</h2>' +
            '<button type="button" id="backToAppBtn">返回排盤</button>' +
          '</div>' +
          '<table>' +
            '<thead><tr><th>姓名</th><th>電話</th><th>Email</th><th>狀態</th><th>申請時間</th><th>操作</th></tr></thead>' +
            '<tbody>' + rows + '</tbody>' +
          '</table>' +
        '</div>'

      document.getElementById('backToAppBtn').addEventListener('click', function () {
        panel.hidden = true
        enterApp(currentUser)
      })

      panel.querySelectorAll('[data-approve]').forEach(function (btn) {
        btn.addEventListener('click', async function () {
          await api('/api/admin/users/' + btn.dataset.approve + '/approve', { method: 'POST' })
          await renderAdminPanel()
        })
      })

      panel.querySelectorAll('[data-reject]').forEach(function (btn) {
        btn.addEventListener('click', async function () {
          await api('/api/admin/users/' + btn.dataset.reject + '/reject', { method: 'POST' })
          await renderAdminPanel()
        })
      })
    } catch (err) {
      panel.innerHTML = '<div class="auth-card auth-error">' + err.message + '</div>'
    }
  }

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

  function showError(el, message) {
    el.textContent = message
    el.hidden = false
  }

  function hideError(el) {
    el.hidden = true
    el.textContent = ''
  }

  function renderAuth(mode) {
    const gate = document.getElementById('authGate')
    if (!gate) return

    gate.innerHTML =
      '<div class="auth-card">' +
        '<div class="auth-brand"><h1>紫微斗數線上排盤</h1><p>國際日舜堂會員專區</p></div>' +
        (mode === 'login' ? renderLogin() : renderRegister()) +
      '</div>'

    if (mode === 'login') bindLogin()
    else bindRegister()
  }

  function renderLogin() {
    return (
      '<form id="loginForm" class="auth-form">' +
        '<h2>會員登入</h2>' +
        '<p class="auth-note">請使用已開通的 Email 與密碼登入</p>' +
        '<label>Email<input type="email" name="email" required></label>' +
        '<label>密碼<input type="password" name="password" required minlength="8"></label>' +
        '<div class="auth-error" id="loginError" hidden></div>' +
        '<button type="submit">登入</button>' +
        '<button type="button" class="auth-link-btn" id="goRegister">還沒有帳號？申請註冊</button>' +
      '</form>'
    )
  }

  function renderRegister() {
    return (
      '<form id="registerForm" class="auth-form">' +
        '<h2>申請會員帳號</h2>' +
        '<p class="auth-note">註冊後需等待管理員開通，開通後才能登入排盤</p>' +
        '<label>姓名<input type="text" name="name" required></label>' +
        '<label>電話<input type="tel" name="phone" placeholder="例如 0912345678" required></label>' +
        '<label>Email<input type="email" name="email" required></label>' +
        '<label>密碼<input type="password" name="password" required minlength="8"></label>' +
        '<label>確認密碼<input type="password" name="confirmPassword" required minlength="8"></label>' +
        '<div class="auth-error" id="registerError" hidden></div>' +
        '<div class="auth-success" id="registerSuccess" hidden></div>' +
        '<button type="submit">送出申請</button>' +
        '<button type="button" class="auth-link-btn" id="goLogin">已有帳號？返回登入</button>' +
      '</form>'
    )
  }

  function bindLogin() {
    document.getElementById('goRegister').addEventListener('click', function () {
      renderAuth('register')
    })
    document.getElementById('loginForm').addEventListener('submit', async function (e) {
      e.preventDefault()
      const form = e.target
      const errorEl = document.getElementById('loginError')
      hideError(errorEl)
      try {
        const data = await api('/api/auth/login', {
          method: 'POST',
          body: JSON.stringify({
            email: form.email.value.trim(),
            password: form.password.value,
          }),
        })
        setToken(data.token)
        enterApp(data.user)
      } catch (err) {
        showError(errorEl, err.message)
      }
    })
  }

  function bindRegister() {
    document.getElementById('goLogin').addEventListener('click', function () {
      renderAuth('login')
    })
    document.getElementById('registerForm').addEventListener('submit', async function (e) {
      e.preventDefault()
      const form = e.target
      const errorEl = document.getElementById('registerError')
      const successEl = document.getElementById('registerSuccess')
      hideError(errorEl)
      hideError(successEl)
      try {
        const data = await api('/api/auth/register', {
          method: 'POST',
          body: JSON.stringify({
            name: form.name.value.trim(),
            phone: form.phone.value.trim(),
            email: form.email.value.trim(),
            password: form.password.value,
            confirmPassword: form.confirmPassword.value,
          }),
        })
        successEl.textContent = data.message
        successEl.hidden = false
        form.reset()
      } catch (err) {
        showError(errorEl, err.message)
      }
    })
  }

  function enterApp(user) {
    currentUser = user
    const gate = document.getElementById('authGate')
    const adminPanel = document.getElementById('adminPanel')
    const appRoot = document.getElementById('appRoot')
    if (gate) gate.hidden = true
    if (adminPanel) adminPanel.hidden = true
    if (appRoot) appRoot.hidden = false

    const bar = document.getElementById('userBar')
    if (bar) {
      bar.hidden = false
      bar.innerHTML =
        '<span>' + user.name + '</span>' +
        (user.role === 'admin'
          ? '<button type="button" id="openAdminBtn">會員管理</button>'
          : '') +
        '<button type="button" id="logoutBtn">登出</button>'

      document.getElementById('logoutBtn').addEventListener('click', function () {
        setToken(null)
        location.reload()
      })

      if (user.role === 'admin') {
        document.getElementById('openAdminBtn').addEventListener('click', function () {
          renderAdminPanel()
        })
      }
    }

    if (typeof window.initChartApp === 'function') window.initChartApp()
  }

  async function boot() {
    const token = getToken()
    if (!token) {
      renderAuth('login')
      return
    }
    try {
      const data = await api('/api/auth/me')
      if (data.user.status !== 'approved') {
        setToken(null)
        renderAuth('login')
        return
      }
      enterApp(data.user)
    } catch (_err) {
      setToken(null)
      renderAuth('login')
    }
  }

  document.addEventListener('DOMContentLoaded', boot)
})()
