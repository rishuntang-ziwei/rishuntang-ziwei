(function () {
  const auth = window.ZiweiAuth

  const bootEl = document.getElementById('portalBoot')
  const homeEl = document.getElementById('portalHome')
  const introEl = document.getElementById('portalIntro')
  const registerEl = document.getElementById('portalRegister')
  const loginEl = document.getElementById('portalLogin')
  const statusEl = document.getElementById('portalStatus')
  const loginError = document.getElementById('portalLoginError')
  const registerError = document.getElementById('portalRegisterError')
  const registerSuccess = document.getElementById('portalRegisterSuccess')
  const statusError = document.getElementById('portalStatusError')
  const userNameEl = document.getElementById('portalUserName')
  const statusTextEl = document.getElementById('portalStatusText')
  const enterCoreBtn = document.getElementById('enterCoreBtn')
  const requestAccessBtn = document.getElementById('requestAccessBtn')
  const refreshStatusBtn = document.getElementById('refreshStatusBtn')
  const logoutBtn = document.getElementById('logoutBtn')
  const taglineEl = document.getElementById('portalTagline')

  let currentUser = null
  let registerFieldsReady = false

  const TAGLINES = {
    home: '四輪抽選 · 會員授權進入',
    intro: '認識先知斗數神牌',
    register: '申請會員帳號',
    login: '會員登入後即可申請或進入神牌',
    status: '授權狀態',
    boot: '正在連線會員系統…',
  }

  function showOnly(view) {
    if (bootEl) bootEl.hidden = view !== 'boot'
    if (homeEl) homeEl.hidden = view !== 'home'
    if (introEl) introEl.hidden = view !== 'intro'
    if (registerEl) registerEl.hidden = view !== 'register'
    if (loginEl) loginEl.hidden = view !== 'login'
    if (statusEl) statusEl.hidden = view !== 'status'
    if (taglineEl && TAGLINES[view]) {
      taglineEl.textContent = TAGLINES[view]
    }
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

  function setSuccess(el, message) {
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

  function ensureRegisterFields() {
    if (registerFieldsReady) return
    const phoneMount = document.getElementById('portalPhoneMount')
    const birthMount = document.getElementById('portalBirthMount')
    const form = document.getElementById('portalRegisterForm')

    if (phoneMount && window.ZiweiPhoneIntl) {
      phoneMount.innerHTML = window.ZiweiPhoneIntl.renderPhoneFieldHtml({
        label: '電話',
        localName: 'phoneLocal',
        countryName: 'phoneCountry',
      })
    }

    if (birthMount && window.ZiweiRegisterBirth) {
      birthMount.innerHTML = window.ZiweiRegisterBirth.renderBirthFieldsHtml()
      if (form) window.ZiweiRegisterBirth.bindBirthFields(form)
    }

    registerFieldsReady = true
  }

  function showHome() {
    currentUser = null
    setError(loginError, '')
    setError(registerError, '')
    setSuccess(registerSuccess, '')
    showOnly('home')
  }

  function showIntro() {
    showOnly('intro')
  }

  function showRegister() {
    ensureRegisterFields()
    setError(registerError, '')
    setSuccess(registerSuccess, '')
    showOnly('register')
  }

  function showLogin() {
    setError(loginError, '')
    showOnly('login')
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
      showHome()
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
        showHome()
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
    const goIntroBtn = document.getElementById('goIntroBtn')
    const goRegisterBtn = document.getElementById('goRegisterBtn')
    const goLoginBtn = document.getElementById('goLoginBtn')
    const introToRegisterBtn = document.getElementById('introToRegisterBtn')
    const introToLoginBtn = document.getElementById('introToLoginBtn')
    const introBackBtn = document.getElementById('introBackBtn')
    const registerBackBtn = document.getElementById('registerBackBtn')
    const registerToLoginBtn = document.getElementById('registerToLoginBtn')
    const loginBackBtn = document.getElementById('loginBackBtn')
    const loginToRegisterBtn = document.getElementById('loginToRegisterBtn')

    if (goIntroBtn) goIntroBtn.addEventListener('click', showIntro)
    if (goRegisterBtn) goRegisterBtn.addEventListener('click', showRegister)
    if (goLoginBtn) goLoginBtn.addEventListener('click', showLogin)
    if (introToRegisterBtn) introToRegisterBtn.addEventListener('click', showRegister)
    if (introToLoginBtn) introToLoginBtn.addEventListener('click', showLogin)
    if (introBackBtn) introBackBtn.addEventListener('click', showHome)
    if (registerBackBtn) registerBackBtn.addEventListener('click', showHome)
    if (registerToLoginBtn) registerToLoginBtn.addEventListener('click', showLogin)
    if (loginBackBtn) loginBackBtn.addEventListener('click', showHome)
    if (loginToRegisterBtn) loginToRegisterBtn.addEventListener('click', showRegister)

    const registerForm = document.getElementById('portalRegisterForm')
    if (registerForm) {
      registerForm.addEventListener('submit', async function (e) {
        e.preventDefault()
        setError(registerError, '')
        setSuccess(registerSuccess, '')
        const submitBtn = registerForm.querySelector('button[type=submit]')
        if (submitBtn) submitBtn.disabled = true
        try {
          if (!window.ZiweiRegisterBirth) {
            throw new Error('出生資料表單尚未載入，請重新整理頁面')
          }
          const birth = window.ZiweiRegisterBirth.buildRegistrationBirth(
            registerForm,
            registerForm.name.value,
          )
          const data = await auth.api('/api/auth/register', {
            method: 'POST',
            body: JSON.stringify({
              name: registerForm.name.value.trim(),
              phone: window.ZiweiPhoneIntl
                ? window.ZiweiPhoneIntl.readPhoneFromForm(registerForm)
                : registerForm.phoneLocal.value.trim(),
              email: registerForm.email.value.trim(),
              password: registerForm.password.value,
              confirmPassword: registerForm.confirmPassword.value,
              birth: birth,
            }),
          })
          setSuccess(
            registerSuccess,
            data.message || '申請已送出，請等候審核通過後再登入。',
          )
          registerForm.reset()
          if (window.ZiweiRegisterBirth) {
            window.ZiweiRegisterBirth.bindBirthFields(registerForm)
          }
        } catch (err) {
          setError(registerError, err instanceof Error ? err.message : '申請失敗')
        } finally {
          if (submitBtn) submitBtn.disabled = false
        }
      })
    }

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
        showHome()
      })
    }
  }

  async function boot() {
    showOnly('boot')
    bindEvents()

    const token = auth.getToken()
    if (!token) {
      showHome()
      return
    }

    try {
      const user = await fetchMe()
      await showLoggedIn(user)
    } catch (_err) {
      auth.setToken(null)
      showHome()
    }
  }

  document.addEventListener('DOMContentLoaded', boot)
})()
