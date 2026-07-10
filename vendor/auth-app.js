(function () {
  const auth = window.ZiweiAuth
  let currentUser = null

  function setView(view) {
    const adminPanel = document.getElementById('adminPanel')
    const appRoot = document.getElementById('appRoot')
    const bar = document.getElementById('userBar')

    if (view === 'admin') {
      if (adminPanel) adminPanel.hidden = false
      if (appRoot) appRoot.hidden = true
      if (bar) bar.hidden = true
      return
    }

    if (adminPanel) adminPanel.hidden = true
    if (appRoot) appRoot.hidden = false
    if (bar) bar.hidden = false
  }

  async function renderAdminPanel() {
    const panel = document.getElementById('adminPanel')
    if (!panel) return

    setView('admin')
    panel.innerHTML = '<div class="auth-card"><p>載入中…</p></div>'

    try {
      const data = await auth.api('/api/admin/users')
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
            '<td>' + auth.statusLabel(user.status, user.role) + '</td>' +
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
        enterApp(currentUser)
      })

      panel.querySelectorAll('[data-approve]').forEach(function (btn) {
        btn.addEventListener('click', async function () {
          await auth.api('/api/admin/users/' + btn.dataset.approve + '/approve', { method: 'POST' })
          await renderAdminPanel()
        })
      })

      panel.querySelectorAll('[data-reject]').forEach(function (btn) {
        btn.addEventListener('click', async function () {
          await auth.api('/api/admin/users/' + btn.dataset.reject + '/reject', { method: 'POST' })
          await renderAdminPanel()
        })
      })
    } catch (err) {
      panel.innerHTML = '<div class="auth-card auth-error">' + err.message + '</div>'
    }
  }

  function enterApp(user) {
    currentUser = user
    setView('app')

    const bar = document.getElementById('userBar')
    if (bar) {
      bar.innerHTML =
        '<span>' + user.name + '</span>' +
        (user.role === 'admin'
          ? '<button type="button" id="openAdminBtn">會員管理</button>'
          : '') +
        '<button type="button" id="logoutBtn">登出</button>'

      document.getElementById('logoutBtn').addEventListener('click', function () {
        auth.setToken(null)
        auth.redirectToLogin()
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
    const token = auth.getToken()
    if (!token) {
      auth.redirectToLogin()
      return
    }

    try {
      const data = await auth.api('/api/auth/me')
      if (data.user.status !== 'approved') {
        auth.setToken(null)
        auth.redirectToLogin()
        return
      }
      enterApp(data.user)
    } catch (_err) {
      auth.setToken(null)
      auth.redirectToLogin()
    }
  }

  document.addEventListener('DOMContentLoaded', boot)
})()
