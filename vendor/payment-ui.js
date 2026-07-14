(function () {
  const auth = window.ZiweiAuth

  const PLAN_LABELS = {
    member_monthly: '付費會員 · 單月',
    member_half_year: '付費會員 · 半年',
    member_yearly: '付費會員 · 一年',
  }

  function formatAmount(amount) {
    return 'NT$ ' + Number(amount).toLocaleString('zh-TW')
  }

  function formatExpiry(iso) {
    if (!iso) return ''
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return ''
    return d.toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric' })
  }

  function planLabel(planId) {
    return PLAN_LABELS[planId] || '付費會員'
  }

  function submitNewebPayForm(checkout) {
    const form = document.createElement('form')
    form.method = 'POST'
    form.action = checkout.gatewayUrl
    form.style.display = 'none'

    const fields = {
      MerchantID: checkout.merchantId,
      TradeInfo: checkout.tradeInfo,
      TradeSha: checkout.tradeSha,
      Version: checkout.version,
    }

    Object.keys(fields).forEach(function (key) {
      const input = document.createElement('input')
      input.type = 'hidden'
      input.name = key
      input.value = fields[key]
      form.appendChild(input)
    })

    document.body.appendChild(form)
    form.submit()
  }

  function renderPlans(plans) {
    if (!plans.length) {
      return '<p class="membership-note">目前無可訂閱方案，請聯絡管理員。</p>'
    }

    return (
      '<div class="membership-plans">' +
        plans
          .map(function (plan) {
            const period = plan.periodLabel || plan.days + ' 天'
            return (
              '<div class="membership-plan-card">' +
                '<h4>' + plan.name + '</h4>' +
                '<p class="membership-plan-desc">' + plan.description + '</p>' +
                '<p class="membership-plan-price">' + formatAmount(plan.amount) + ' / ' + period + '</p>' +
                '<button type="button" class="primary membership-pay-btn" data-plan-id="' + plan.id + '">訂閱付款</button>' +
              '</div>'
            )
          })
          .join('') +
      '</div>'
    )
  }

  function renderPaidActive(status) {
    const expiry = formatExpiry(status.membershipExpiresAt)
    const label = status.membershipPlanLabel || planLabel(status.membershipPlan)

    return (
      '<div class="membership-active">' +
        '<p>會員等級：<strong>付費會員</strong></p>' +
        '<p>訂閱方案：' + label + '</p>' +
        (expiry ? '<p>有效至：' + expiry + '</p>' : '') +
        '<p class="membership-plan-tag">已解鎖大限流年、列印儲存、神牌等完整功能</p>' +
      '</div>'
    )
  }

  function renderFreeUpgrade(status) {
    let html =
      '<div class="membership-free">' +
        '<p class="membership-alert">您目前是 <strong>免費會員</strong>，可排本命命盤。</p>' +
        '<p class="membership-note">升級付費訂閱後，可解鎖大限流年命盤、列印、儲存命盤、神牌等完整功能。</p>'

    if (!status.paymentEnabled) {
      html += '<p class="membership-note">線上付款尚未啟用，請聯絡管理員。</p></div>'
      return html
    }

    html += renderPlans(window.__membershipPlans || []) + '</div>'
    return html
  }

  async function handleCheckout(planId, btn) {
    btn.disabled = true
    const original = btn.textContent
    btn.textContent = '處理中…'
    try {
      const data = await auth.api('/api/payment/checkout', {
        method: 'POST',
        body: JSON.stringify({ planId: planId }),
      })
      if (data.mock && data.redirectUrl) {
        location.href = data.redirectUrl
        return
      }
      if (data.checkout) {
        submitNewebPayForm(data.checkout)
        return
      }
      throw new Error('無法建立付款')
    } catch (err) {
      alert(err.message || '付款失敗')
      btn.disabled = false
      btn.textContent = original
    }
  }

  function bindPayButtons(container) {
    container.querySelectorAll('.membership-pay-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        handleCheckout(btn.dataset.planId, btn)
      })
    })
  }

  async function refreshUser() {
    const data = await auth.api('/api/auth/me')
    return data.user
  }

  async function renderMembershipPanel(user) {
    const panel = document.getElementById('membershipPanel')
    if (!panel) return user

    if (user.role === 'admin') {
      panel.innerHTML =
        '<div class="membership-active"><p>會員等級：<strong>管理員</strong>（完整功能）</p></div>'
      panel.hidden = false
      return user
    }

    try {
      const [plansData, statusData] = await Promise.all([
        auth.api('/api/payment/plans'),
        auth.api('/api/payment/status'),
      ])
      window.__membershipPlans = plansData.plans || []

      if (user.membershipActive) {
        panel.innerHTML = renderPaidActive(statusData)
      } else {
        panel.innerHTML = renderFreeUpgrade(statusData)
        bindPayButtons(panel)
      }
      panel.hidden = false
      return user
    } catch (err) {
      panel.innerHTML = '<p class="membership-note">' + (err.message || '無法載入會員資訊') + '</p>'
      panel.hidden = false
      return user
    }
  }

  function showPaymentToast() {
    const params = new URLSearchParams(location.search)
    const payment = params.get('payment')
    if (!payment) return

    if (payment === 'success') {
      alert('付款成功！付費會員已開通，完整功能已解鎖。')
    } else if (payment === 'failed') {
      alert('付款未完成，請重試或聯絡管理員。')
    }

    params.delete('payment')
    const next = location.pathname + (params.toString() ? '?' + params.toString() : '')
    history.replaceState(null, '', next)
  }

  window.ZiweiPayment = {
    renderMembershipPanel: renderMembershipPanel,
    refreshUser: refreshUser,
    showPaymentToast: showPaymentToast,
  }
})()
