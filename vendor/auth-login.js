(function () {
  const auth = window.ZiweiAuth
  const ANCESTOR_IMG = './assets/zushi-jiangziya.png?v=20260717'
  const ANCESTOR_CAPTION = '日舜堂傳承中華文化'

  function showError(el, message) {
    el.textContent = message
    el.hidden = false
  }

  function hideError(el) {
    el.hidden = true
    el.textContent = ''
  }

  function renderLogin() {
    return (
      '<form id="loginForm" class="auth-form">' +
        '<h2>會員登入</h2>' +
        '<p class="auth-note">請使用 Email 與密碼登入；新會員註冊後即可免費排本命命盤</p>' +
        '<p class="auth-note auth-note-muted">忘記密碼？請聯絡管理員，提供註冊時的姓名與電話協助重設。</p>' +
        '<label>Email<input type="email" name="email" required></label>' +
        '<label>密碼<input type="password" name="password" required minlength="8"></label>' +
        '<div class="auth-error" id="loginError" hidden></div>' +
        '<button type="submit">登入</button>' +
        '<button type="button" class="auth-link-btn" id="goRegister">還沒有帳號？申請註冊</button>' +
      '</form>'
    )
  }

  function renderRegister() {
    const birth = window.ZiweiRegisterBirth
    const birthHtml = birth ? birth.renderBirthFieldsHtml() : ''
    return (
      '<form id="registerForm" class="auth-form">' +
        '<h2>申請會員帳號</h2>' +
        '<p class="auth-note">註冊即開通免費會員（本命命盤）</p>' +
        '<p class="auth-note auth-note-follow">付費訂閱可解鎖完整功能</p>' +
        '<label>姓名<input type="text" name="name" required></label>' +
        '<label>電話<input type="tel" name="phone" placeholder="例如 0912345678" required></label>' +
        birthHtml +
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

  function renderAuth(mode) {
    const gate = document.getElementById('authGate')
    if (!gate) return

    const formHtml = mode === 'login' ? renderLogin() : renderRegister()

    gate.innerHTML =
      '<div class="auth-split-wrap">' +
        '<div class="auth-ancestor-panel">' +
          '<img src="' + ANCESTOR_IMG + '" alt="' + ANCESTOR_CAPTION + '" loading="lazy" />' +
          '<p class="auth-ancestor-caption">' + ANCESTOR_CAPTION + '</p>' +
        '</div>' +
        '<div class="auth-card auth-card-in-split">' +
          '<div class="auth-brand">' +
            '<h1>國際日舜堂</h1>' +
            '<p>紫微斗數線上排盤 · 會員專區</p>' +
          '</div>' +
          formHtml +
        '</div>' +
      '</div>'

    if (mode === 'login') bindLogin()
    else bindRegister()
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
        const data = await auth.api('/api/auth/login', {
          method: 'POST',
          body: JSON.stringify({
            email: form.email.value.trim(),
            password: form.password.value,
          }),
        })
        auth.setToken(data.token)
        auth.redirectToChart()
      } catch (err) {
        showError(errorEl, err.message)
      }
    })
  }

  function bindRegister() {
    document.getElementById('goLogin').addEventListener('click', function () {
      renderAuth('login')
    })
    const form = document.getElementById('registerForm')
    if (window.ZiweiRegisterBirth) {
      window.ZiweiRegisterBirth.bindBirthFields(form)
    }
    form.addEventListener('submit', async function (e) {
      e.preventDefault()
      const errorEl = document.getElementById('registerError')
      const successEl = document.getElementById('registerSuccess')
      hideError(errorEl)
      hideError(successEl)
      try {
        let birth
        if (window.ZiweiRegisterBirth) {
          birth = window.ZiweiRegisterBirth.buildRegistrationBirth(form, form.name.value)
        } else {
          throw new Error('出生資料表單尚未載入，請重新整理頁面')
        }
        const data = await auth.api('/api/auth/register', {
          method: 'POST',
          body: JSON.stringify({
            name: form.name.value.trim(),
            phone: form.phone.value.trim(),
            email: form.email.value.trim(),
            password: form.password.value,
            confirmPassword: form.confirmPassword.value,
            birth: birth,
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

  async function boot() {
    const token = auth.getToken()
    if (token) {
      try {
        const data = await auth.api('/api/auth/me')
        if (data.user.status === 'rejected') {
          auth.setToken(null)
        } else {
          auth.redirectToChart()
          return
        }
      } catch (_err) {
        auth.setToken(null)
      }
    }
    renderAuth('login')
  }

  document.addEventListener('DOMContentLoaded', boot)
})()
