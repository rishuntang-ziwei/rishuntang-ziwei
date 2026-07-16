(function () {
  const auth = window.ZiweiAuth
  let currentUser = null

  function setView(view) {
    const adminPanel = document.getElementById('adminPanel')
    const appRoot = document.getElementById('appRoot')
    const toolbar = document.getElementById('appToolbar')

    if (view === 'admin') {
      if (adminPanel) adminPanel.hidden = false
      if (appRoot) appRoot.hidden = true
      if (toolbar) toolbar.hidden = true
      return
    }

    if (adminPanel) adminPanel.hidden = true
    if (appRoot) appRoot.hidden = false
    if (toolbar) toolbar.hidden = false
  }

  function renderUserActions(user) {
    const actions = []

    if (user.role === 'admin') {
      if (user.id !== currentUser.id) {
        actions.push(
          '<button type="button" data-revoke-admin="' + user.id + '" data-name="' + user.name + '">取消管理員</button>',
        )
      }
      return actions.length
        ? '<div class="admin-actions">' + actions.join('') + '</div>'
        : '—'
    }

    if (user.status === 'pending') {
      actions.push(
        '<button type="button" data-view-charts="' + user.id + '" data-name="' + user.name + '">查看命盤</button>',
        '<button type="button" data-approve="' + user.id + '">開通</button>',
        '<button type="button" class="danger" data-reject="' + user.id + '">拒絕</button>',
        '<button type="button" data-make-admin="' + user.id + '" data-name="' + user.name + '">設為管理員</button>',
      )
    } else if (user.status === 'approved') {
      actions.push(
        '<button type="button" data-view-charts="' + user.id + '" data-name="' + user.name + '">查看命盤</button>',
        user.starDrawEnabled
          ? '<button type="button" class="danger" data-disable-star-draw="' + user.id + '" data-name="' + user.name + '">取消神牌</button>'
          : '<button type="button" data-enable-star-draw="' + user.id + '" data-name="' + user.name + '">開通神牌</button>',
        '<button type="button" data-reset="' + user.id + '" data-name="' + user.name + '">重設密碼</button>',
        '<button type="button" data-make-admin="' + user.id + '" data-name="' + user.name + '">設為管理員</button>',
      )
    } else {
      actions.push(
        '<button type="button" data-view-charts="' + user.id + '" data-name="' + user.name + '">查看命盤</button>',
        '<button type="button" data-reset="' + user.id + '" data-name="' + user.name + '">重設密碼</button>',
      )
    }

    actions.push(
      '<button type="button" class="danger" data-delete="' + user.id + '" data-name="' + user.name + '">刪除</button>',
    )

    return '<div class="admin-actions">' + actions.join('') + '</div>'
  }

  async function makeUserAdmin(id, name) {
    if (!confirm('確定要將「' + name + '」設為管理員？\n對方將可審核會員並管理帳號。')) return
    await auth.api('/api/admin/users/' + id + '/make-admin', { method: 'POST' })
    alert('已設為管理員')
  }

  async function revokeUserAdmin(id, name) {
    if (!confirm('確定要取消「' + name + '」的管理員權限？')) return
    await auth.api('/api/admin/users/' + id + '/revoke-admin', { method: 'POST' })
    alert('已取消管理員權限')
  }

  async function deleteUserAccount(id, name) {
    if (!confirm('確定要永久刪除「' + name + '」的帳號？\n此操作無法復原。')) return
    await auth.api('/api/admin/users/' + id, { method: 'DELETE' })
    alert('帳號已刪除')
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

  let adminMemberTab = 'free'
  let adminChartSearchQuery = ''

  function bindAdminPanelEvents(panel) {
    panel.querySelectorAll('[data-admin-tab]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        renderAdminPanel(btn.dataset.adminTab)
      })
    })

    const backBtn = document.getElementById('backToAppBtn')
    if (backBtn) {
      backBtn.addEventListener('click', function () {
        enterApp(currentUser)
      })
    }

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
          await renderAdminPanel()
        } catch (err) {
          alert(err.message)
        }
      })
    })

    panel.querySelectorAll('[data-make-admin]').forEach(function (btn) {
      btn.addEventListener('click', async function () {
        try {
          await makeUserAdmin(btn.dataset.makeAdmin, btn.dataset.name)
          await renderAdminPanel()
        } catch (err) {
          alert(err.message)
        }
      })
    })

    panel.querySelectorAll('[data-revoke-admin]').forEach(function (btn) {
      btn.addEventListener('click', async function () {
        try {
          await revokeUserAdmin(btn.dataset.revokeAdmin, btn.dataset.name)
          await renderAdminPanel()
        } catch (err) {
          alert(err.message)
        }
      })
    })

    panel.querySelectorAll('[data-delete]').forEach(function (btn) {
      btn.addEventListener('click', async function () {
        try {
          await deleteUserAccount(btn.dataset.delete, btn.dataset.name)
          await renderAdminPanel()
        } catch (err) {
          alert(err.message)
        }
      })
    })

    panel.querySelectorAll('[data-view-charts]').forEach(function (btn) {
      btn.addEventListener('click', async function () {
        try {
          await renderUserChartsPanel(btn.dataset.viewCharts, btn.dataset.name)
        } catch (err) {
          alert(err.message)
        }
      })
    })

    panel.querySelectorAll('[data-enable-star-draw]').forEach(function (btn) {
      btn.addEventListener('click', async function () {
        if (!confirm('確定要為「' + btn.dataset.name + '」開通神牌功能？')) return
        try {
          await auth.api('/api/admin/users/' + btn.dataset.enableStarDraw + '/enable-star-draw', { method: 'POST' })
          await renderAdminPanel()
        } catch (err) {
          alert(err.message)
        }
      })
    })

    panel.querySelectorAll('[data-disable-star-draw]').forEach(function (btn) {
      btn.addEventListener('click', async function () {
        if (!confirm('確定要取消「' + btn.dataset.name + '」的神牌功能？')) return
        try {
          await auth.api('/api/admin/users/' + btn.dataset.disableStarDraw + '/disable-star-draw', { method: 'POST' })
          await renderAdminPanel()
        } catch (err) {
          alert(err.message)
        }
      })
    })
  }

  function renderAdminMemberTabs(summary, activeTab) {
    return (
      '<div class="admin-member-tabs">' +
        '<button type="button" class="admin-member-tab' + (activeTab === 'free' ? ' is-active' : '') + '" data-admin-tab="free">免費會員（' + summary.free + '）</button>' +
        '<button type="button" class="admin-member-tab' + (activeTab === 'paid' ? ' is-active' : '') + '" data-admin-tab="paid">付費會員（' + summary.paid + '）</button>' +
        '<button type="button" class="admin-member-tab' + (activeTab === 'pending' ? ' is-active' : '') + '" data-admin-tab="pending">待審核（' + summary.pending + '）</button>' +
        '<button type="button" class="admin-member-tab' + (activeTab === 'admins' ? ' is-active' : '') + '" data-admin-tab="admins">管理員（' + summary.admins + '）</button>' +
      '</div>'
    )
  }

  function renderAdminMemberRows(tab, members) {
    if (!members.length) {
      const emptyMsg =
        tab === 'free'
          ? '目前沒有免費會員'
          : tab === 'paid'
            ? '目前沒有付費會員'
            : tab === 'pending'
              ? '目前沒有待審核會員'
              : '尚無其他管理員'
      const colspan = tab === 'paid' ? 9 : tab === 'admins' ? 5 : 8
      return '<tr><td colspan="' + colspan + '" class="admin-empty">' + emptyMsg + '</td></tr>'
    }

    return members
      .map(function (user) {
        const starDrawCell =
          user.role === 'admin'
            ? '—'
            : user.starDrawEnabled
              ? '已開通'
              : '未開通'
        const birthCell = user.birthDateTime || '—'

        if (tab === 'paid') {
          return (
            '<tr>' +
              '<td>' + user.name + '</td>' +
              '<td>' + user.phone + '</td>' +
              '<td>' + user.email + '</td>' +
              '<td>' + birthCell + '</td>' +
              '<td>' + (user.membershipPlanLabel || '付費會員') + '</td>' +
              '<td>' + auth.formatMembershipExpiry(user.membershipExpiresAt) + '</td>' +
              '<td>' + starDrawCell + '</td>' +
              '<td>' + new Date(user.createdAt).toLocaleString('zh-TW') + '</td>' +
              '<td>' + renderUserActions(user) + '</td>' +
            '</tr>'
          )
        }

        if (tab === 'admins') {
          return (
            '<tr>' +
              '<td>' + user.name + '</td>' +
              '<td>' + user.phone + '</td>' +
              '<td>' + user.email + '</td>' +
              '<td>' + new Date(user.createdAt).toLocaleString('zh-TW') + '</td>' +
              '<td>' + renderUserActions(user) + '</td>' +
            '</tr>'
          )
        }

        return (
          '<tr>' +
            '<td>' + user.name + '</td>' +
            '<td>' + user.phone + '</td>' +
            '<td>' + user.email + '</td>' +
            '<td>' + birthCell + '</td>' +
            '<td>' + auth.membershipTierLabel(user) + '</td>' +
            '<td>' + starDrawCell + '</td>' +
            '<td>' + new Date(user.createdAt).toLocaleString('zh-TW') + '</td>' +
            '<td>' + renderUserActions(user) + '</td>' +
          '</tr>'
        )
      })
      .join('')
  }

  function renderAdminMemberTable(tab, members) {
    if (tab === 'paid') {
      return (
        '<table class="admin-member-table">' +
          '<thead><tr><th>姓名</th><th>電話</th><th>Email</th><th>出生資料</th><th>訂閱方案</th><th>有效至</th><th>神牌</th><th>註冊時間</th><th>操作</th></tr></thead>' +
          '<tbody>' + renderAdminMemberRows(tab, members) + '</tbody>' +
        '</table>'
      )
    }

    if (tab === 'admins') {
      return (
        '<table class="admin-member-table">' +
          '<thead><tr><th>姓名</th><th>電話</th><th>Email</th><th>建立時間</th><th>操作</th></tr></thead>' +
          '<tbody>' + renderAdminMemberRows(tab, members) + '</tbody>' +
        '</table>'
      )
    }

    return (
      '<table class="admin-member-table">' +
        '<thead><tr><th>姓名</th><th>電話</th><th>Email</th><th>出生資料</th><th>會員類型</th><th>神牌</th><th>註冊時間</th><th>操作</th></tr></thead>' +
        '<tbody>' + renderAdminMemberRows(tab, members) + '</tbody>' +
      '</table>'
    )
  }

  function adminTabDescription(tab) {
    if (tab === 'free') {
      return '註冊即列入免費會員資料庫，可使用本命命盤；付費訂閱後會自動移至付費會員。'
    }
    if (tab === 'paid') {
      return '付費訂閱中的會員，可完整使用大限流年、列印儲存與神牌等功能。'
    }
    if (tab === 'pending') {
      return '尚未審核通過的申請（若仍使用人工審核流程）。'
    }
    return '系統管理員帳號。'
  }

  async function renderAdminPanel(tab) {
    if (tab) adminMemberTab = tab
    const panel = document.getElementById('adminPanel')
    if (!panel) return

    setView('admin')
    panel.innerHTML = '<div class="auth-card"><p>載入中…</p></div>'

    try {
      const data = await auth.api('/api/admin/members/' + adminMemberTab)
      const summary = data.summary || { free: 0, paid: 0, pending: 0, admins: 0 }
      const members = data.members || []
      const tabTitle =
        adminMemberTab === 'free'
          ? '免費會員資料庫'
          : adminMemberTab === 'paid'
            ? '付費會員資料庫'
            : adminMemberTab === 'pending'
              ? '待審核會員'
              : '管理員'

      panel.innerHTML =
        '<div id="adminPanelInner" class="admin-member-db">' +
          '<div class="admin-member-header">' +
            '<div>' +
              '<h2>會員資料庫</h2>' +
              '<p class="admin-member-subtitle">' + tabTitle + ' · 共 ' + members.length + ' 筆</p>' +
            '</div>' +
            '<button type="button" id="backToAppBtn">返回排盤</button>' +
          '</div>' +
          renderAdminMemberTabs(summary, adminMemberTab) +
          '<p class="admin-member-note">' + adminTabDescription(adminMemberTab) + '</p>' +
          '<div class="admin-table-wrap">' + renderAdminMemberTable(adminMemberTab, members) + '</div>' +
        '</div>'

      bindAdminPanelEvents(panel)
    } catch (err) {
      panel.innerHTML = '<div class="auth-card auth-error">' + err.message + '</div>'
    }
  }

  async function loadAdminChartAndShow(userId, chartId) {
    const data = await auth.api('/api/admin/users/' + userId + '/charts/' + chartId)
    enterApp(currentUser)
    if (typeof window.loadSavedChartPayload === 'function') {
      window.loadSavedChartPayload(data.chart.payload)
    } else {
      alert('排盤功能尚未就緒，請重新整理頁面後再試')
    }
  }

  async function loadAdminBirthChartAndShow(userId) {
    const data = await auth.api('/api/admin/users/' + userId + '/birth-chart')
    enterApp(currentUser)
    if (typeof window.loadSavedChartPayload === 'function') {
      window.loadSavedChartPayload(data.chart.payload)
    } else {
      alert('排盤功能尚未就緒，請重新整理頁面後再試')
    }
  }

  async function renderUserChartsPanel(userId, userName) {
    const panel = document.getElementById('adminPanel')
    if (!panel) return

    setView('admin')
    panel.innerHTML = '<div class="auth-card"><p>載入中…</p></div>'

    let registrationChart = null
    try {
      const birthData = await auth.api('/api/admin/users/' + userId + '/birth-chart')
      registrationChart = birthData.chart
    } catch (_err) {
      registrationChart = null
    }

    async function loadCharts(search) {
      adminChartSearchQuery = search || ''
      const q = adminChartSearchQuery.trim() ? '?q=' + encodeURIComponent(adminChartSearchQuery.trim()) : ''
      const data = await auth.api('/api/admin/users/' + userId + '/charts' + q)
      const charts = data.charts || []
      const statusText = adminChartSearchQuery.trim()
        ? (charts.length
          ? '搜尋「' + adminChartSearchQuery.trim() + '」共 ' + charts.length + ' 筆'
          : '搜尋「' + adminChartSearchQuery.trim() + '」找不到符合的命盤')
        : (charts.length ? '共 ' + charts.length + ' 筆已存命盤' : '尚無已存命盤')

      const regSection = registrationChart
        ? (
          '<div class="admin-birth-chart-section">' +
            '<h3>註冊出生資料（本命）</h3>' +
            '<table>' +
              '<thead><tr><th>姓名</th><th>性別</th><th>出生年月日時</th><th>操作</th></tr></thead>' +
              '<tbody><tr>' +
                '<td>' + registrationChart.subjectName + '</td>' +
                '<td>' + registrationChart.gender + '</td>' +
                '<td>' + (registrationChart.birthDateTime || registrationChart.payload.bazi) + '</td>' +
                '<td><button type="button" id="loadRegistrationBirthChart">提取命盤</button></td>' +
              '</tr></tbody>' +
            '</table>' +
          '</div>'
        )
        : (
          '<div class="admin-birth-chart-section admin-birth-chart-empty">' +
            '<p style="color:#888;font-size:14px;margin:0 0 12px;">此會員尚未登記出生資料（舊帳號可能未填寫）</p>' +
          '</div>'
        )

      const rows = charts.length
        ? charts.map(function (chart) {
            return (
              '<tr>' +
                '<td>' + chart.subjectName + '</td>' +
                '<td>' + chart.gender + '</td>' +
                '<td>' + (chart.birthDateTime || chart.bazi) + '</td>' +
                '<td>' + new Date(chart.createdAt).toLocaleString('zh-TW') + '</td>' +
                '<td><button type="button" data-load-admin-chart="' + chart.id + '">提取命盤</button></td>' +
              '</tr>'
            )
          }).join('')
        : '<tr><td colspan="5" style="text-align:center;color:#888;">' +
            (adminChartSearchQuery.trim() ? '找不到符合的命盤' : '尚無已存命盤') +
          '</td></tr>'

      panel.innerHTML =
        '<div id="adminPanelInner">' +
          '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">' +
            '<h2>「' + userName + '」的命盤</h2>' +
            '<button type="button" id="backToAdminBtn">返回會員資料庫</button>' +
          '</div>' +
          regSection +
          '<h3 style="margin:16px 0 8px;font-size:16px;">已存命盤</h3>' +
          '<div style="display:flex;gap:8px;margin-bottom:8px;">' +
            '<input type="search" id="adminChartSearch" placeholder="搜尋姓名或電話…" style="flex:1;padding:8px;font-family:inherit;" />' +
            '<button type="button" id="adminChartSearchBtn" style="padding:8px 14px;">搜尋</button>' +
          '</div>' +
          '<div id="adminChartSearchStatus" style="font-size:12px;color:#666;margin-bottom:12px;">' + statusText + '</div>' +
          '<table>' +
            '<thead><tr><th>姓名</th><th>性別</th><th>出生年月日時</th><th>儲存時間</th><th>操作</th></tr></thead>' +
            '<tbody>' + rows + '</tbody>' +
          '</table>' +
        '</div>'

      document.getElementById('backToAdminBtn').addEventListener('click', function () {
        renderAdminPanel()
      })

      const regBtn = document.getElementById('loadRegistrationBirthChart')
      if (regBtn) {
        regBtn.addEventListener('click', async function () {
          try {
            await loadAdminBirthChartAndShow(userId)
          } catch (err) {
            alert(err.message)
          }
        })
      }

      document.getElementById('adminChartSearchBtn').addEventListener('click', function () {
        loadCharts(document.getElementById('adminChartSearch').value || '')
      })

      const searchInput = document.getElementById('adminChartSearch')
      if (searchInput) {
        searchInput.value = adminChartSearchQuery
        searchInput.addEventListener('keydown', function (e) {
          if (e.key === 'Enter') {
            e.preventDefault()
            loadCharts(e.target.value || '')
          }
        })
      }

      panel.querySelectorAll('[data-load-admin-chart]').forEach(function (btn) {
        btn.addEventListener('click', async function () {
          try {
            await loadAdminChartAndShow(userId, btn.dataset.loadAdminChart)
          } catch (err) {
            alert(err.message)
          }
        })
      })
    }

    try {
      await loadCharts('')
    } catch (err) {
      panel.innerHTML = '<div class="auth-card auth-error">' + err.message + '</div>'
    }
  }

  function canUseStarDraw(user) {
    return user.role === 'admin' || user.starDrawEnabled
  }

  function isPremiumMember(user) {
    return user.role === 'admin' || user.membershipActive
  }

  function updateMemberFeatures(user) {
    const premium = isPremiumMember(user)
    const starDrawBtn = document.getElementById('starDrawBtn')
    const saveChartBtn = document.getElementById('saveChartBtn')
    const printChartBtn = document.getElementById('printChartBtn')
    const chartDbBtn = document.getElementById('chartDbBtn')

    window.ZiweiMember = {
      currentUser: user,
      isPremium: function () {
        return isPremiumMember(window.ZiweiMember.currentUser)
      },
      requirePremium: function (featureName) {
        if (isPremiumMember(window.ZiweiMember.currentUser)) return true
        alert((featureName || '此功能') + '需訂閱付費會員，請在左側選擇方案升級')
        return false
      },
    }

    function requireUpgrade(featureName) {
      return window.ZiweiMember.requirePremium(featureName)
    }

    ;[saveChartBtn, printChartBtn, chartDbBtn, starDrawBtn].forEach(function (btn) {
      if (!btn) return
      btn.disabled = false
      btn.classList.toggle('member-feature-locked', !premium)
      btn.title = premium ? '' : '付費會員專屬功能，請升級訂閱'
    })

    if (printChartBtn) {
      printChartBtn.onclick = function () {
        if (!requireUpgrade('列印功能')) return
        const view = document.getElementById('chartView')
        if (!view || view.querySelector('.chart-placeholder') || view.querySelector('.error-box')) {
          alert('請先完成排盤後再列印')
          return
        }
        window.print()
      }
    }

    if (saveChartBtn) {
      saveChartBtn.onclick = async function () {
        if (!requireUpgrade('儲存命盤')) return
        if (typeof window.saveCurrentChartAction !== 'function') {
          alert('排盤程式尚未就緒，請重新整理頁面')
          return
        }
        try {
          await window.saveCurrentChartAction()
        } catch (err) {
          alert(err.message || '儲存失敗')
        }
      }
    }

    if (chartDbBtn) {
      chartDbBtn.onclick = function () {
        if (!requireUpgrade('命盤資料庫')) return
        if (typeof window.showChartDatabaseAction !== 'function') {
          alert('排盤程式尚未就緒，請重新整理頁面')
          return
        }
        window.showChartDatabaseAction()
      }
    }

    if (starDrawBtn) {
      starDrawBtn.onclick = function () {
        if (!requireUpgrade('神牌功能')) return
        if (canUseStarDraw(user)) {
          location.href = 'star-draw/index.html'
        } else {
          alert('神牌功能尚未開通，請聯絡管理員')
        }
      }
    }

    if (typeof window.applyMemberTierUI === 'function') {
      window.applyMemberTierUI()
    }
  }

  async function enterApp(user) {
    currentUser = user
    setView('app')
    updateMemberFeatures(user)

    if (window.ZiweiPayment) {
      window.ZiweiPayment.showPaymentToast()
      user = await window.ZiweiPayment.renderMembershipPanel(user)
      currentUser = user
      updateMemberFeatures(user)
    }

    const bar = document.getElementById('userBar')
    const toolbar = document.getElementById('appToolbar')
    if (toolbar) toolbar.hidden = false
    if (bar) {
      bar.innerHTML =
        '<span class="user-bar-name">' + user.name + '</span>' +
        '<button type="button" id="changePasswordBtn">修改密碼</button>' +
        (user.role === 'admin'
          ? '<button type="button" id="openAdminBtn">會員資料庫</button>'
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
    updateMemberFeatures(user)

    if (typeof window.loadRegistrationBirthChart === 'function') {
      await window.loadRegistrationBirthChart()
    }
    if (typeof window.applyMemberTierUI === 'function') window.applyMemberTierUI()
  }

  async function boot() {
    const token = auth.getToken()
    if (!token) {
      auth.redirectToLogin()
      return
    }

    try {
      const data = await auth.api('/api/auth/me')
      if (data.user.status === 'rejected') {
        auth.setToken(null)
        auth.redirectToLogin()
        return
      }
      await enterApp(data.user)
    } catch (_err) {
      auth.setToken(null)
      auth.redirectToLogin()
    }
  }

  document.addEventListener('DOMContentLoaded', boot)
})()
