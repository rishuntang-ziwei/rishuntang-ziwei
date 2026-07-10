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

  function renderUserActions(user) {
    if (user.role === 'admin') return '—'

    const actions = []
    if (user.status === 'pending') {
      actions.push(
        '<button type="button" data-approve="' + user.id + '">開通</button>',
        '<button type="button" class="danger" data-reject="' + user.id + '">拒絕</button>',
      )
    }
    actions.push('<button type="button" data-reset="' + user.id + '" data-name="' + user.name + '">重設密碼</button>')
    return '<div class="admin-actions">' + actions.join('') + '</div>'
  }

  async function resetUserPassword(id, name) {
    const password = prompt('請輸入「' + name + '」的新密碼（至少 8 字元）：')
    if (!password) return
    if (password.length < 8) {
      alert('密碼至少 8 個字元')
      return
    }
    await auth.api('/api/admin/users/' + id + '/reset-password', {
      method: 'POST',
      body: JSON.stringify({ password }),
    })
    alert('密碼已重設，請通知會員使用新密碼登入')
  }

  function showChangePasswordDialog() {
    const existing = document.getElementById('passwordModal')
    if (existing) existing.remove()

    const modal = document.createElement('div')
    modal.id = 'passwordModal'
    modal.className = 'password-modal'
    modal.innerHTML =
      '<div class="password-modal-card">' +
        '<h3>修改密碼</h3>' +
        '<form id="changePasswordForm">' +
          '<label>目前密碼<input type="password" name="currentPassword" required minlength="8"></label>' +
          '<label>新密碼<input type="password" name="newPassword" required minlength="8"></label>' +
          '<label>確認新密碼<input type="password" name="confirmPassword" required minlength="8"></label>' +
          '<div class="auth-error" id="changePasswordError" hidden></div>' +
          '<div class="password-modal-actions">' +
            '<button type="button" class="secondary" id="cancelChangePassword">取消</button>' +
            '<button type="submit" class="primary">更新密碼</button>' +
          '</div>' +
        '</form>' +
      '</div>'

    document.body.appendChild(modal)

    function closeModal() {
      modal.remove()
    }

    modal.addEventListener('click', function (e) {
      if (e.target === modal) closeModal()
    })
    document.getElementById('cancelChangePassword').addEventListener('click', closeModal)

    document.getElementById('changePasswordForm').addEventListener('submit', async function (e) {
      e.preventDefault()
      const form = e.target
      const errorEl = document.getElementById('changePasswordError')
      errorEl.hidden = true
      errorEl.textContent = ''
      try {
        const data = await auth.api('/api/auth/change-password', {
          method: 'POST',
          body: JSON.stringify({
            currentPassword: form.currentPassword.value,
            newPassword: form.newPassword.value,
            confirmPassword: form.confirmPassword.value,
          }),
        })
        alert(data.message || '密碼已更新')
        closeModal()
      } catch (err) {
        errorEl.textContent = err.message
        errorEl.hidden = false
      }
    })
  }

  async function renderAdminPanel() {
    const panel = document.getElementById('adminPanel')
    if (!panel) return

    setView('admin')
    panel.innerHTML = '<div class="auth-card"><p>載入中…</p></div>'

    try {
      const data = await auth.api('/api/admin/users')
      const rows = data.users.map(function (user) {
        return (
          '<tr>' +
            '<td>' + user.name + '</td>' +
            '<td>' + user.phone + '</td>' +
            '<td>' + user.email + '</td>' +
            '<td>' + auth.statusLabel(user.status, user.role) + '</td>' +
            '<td>' + new Date(user.createdAt).toLocaleString('zh-TW') + '</td>' +
            '<td>' + renderUserActions(user) + '</td>' +
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

      panel.querySelectorAll('[data-reset]').forEach(function (btn) {
        btn.addEventListener('click', async function () {
          try {
            await resetUserPassword(btn.dataset.reset, btn.dataset.name)
          } catch (err) {
            alert(err.message)
          }
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
        '<button type="button" id="changePasswordBtn">修改密碼</button>' +
        (user.role === 'admin'
          ? '<button type="button" id="openAdminBtn">會員管理</button>'
          : '') +
        '<button type="button" id="logoutBtn">登出</button>'

      document.getElementById('changePasswordBtn').addEventListener('click', showChangePasswordDialog)
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
