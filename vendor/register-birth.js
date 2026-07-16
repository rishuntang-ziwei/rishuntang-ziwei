(function () {
  function normalizeDate(date) {
    const parts = date.split('-')
    return parts[0] + '-' + Number(parts[1]) + '-' + Number(parts[2])
  }

  function formatBazi(a) {
    const cd = a.rawDates.chineseDate
    return cd.yearly[0] + cd.yearly[1] + ' ' + cd.monthly[0] + cd.monthly[1] + ' ' + cd.daily[0] + cd.daily[1] + ' ' + cd.hourly[0] + cd.hourly[1]
  }

  function computeBirth(input) {
    if (typeof iztro === 'undefined') {
      throw new Error('排盤程式尚未載入，請重新整理頁面')
    }
    const astro = iztro.astro
    const d = normalizeDate(input.date)
    if (input.calendar === 'lunar') {
      return astro.byLunar(d, input.timeIndex, input.gender, input.isLeap, true, 'zh-TW')
    }
    return astro.bySolar(d, input.timeIndex, input.gender, true, 'zh-TW')
  }

  function updateCalendarUI(form) {
    const lunar = form.querySelector('input[name="regCalendar"]:checked').value === 'lunar'
    form.querySelector('#regLunarDateFields').classList.toggle('hidden', !lunar)
    form.querySelector('#regSolarDateFields').classList.toggle('hidden', lunar)
    form.querySelector('#regLeapRow').classList.toggle('hidden', !lunar)
    form.querySelector('#regDateLabel').textContent = lunar ? '農曆出生日期' : '國曆出生日期'
    form.querySelector('#regCalendarNote').textContent = lunar ? '以農曆排盤（陰曆）' : '以國曆排盤（陽曆）'
  }

  function renderBirthFieldsHtml() {
    return (
      '<fieldset class="register-birth-fieldset">' +
        '<legend>出生資料（必填）</legend>' +
        '<div class="register-birth-row inline">' +
          '<label>性別</label>' +
          '<label><input type="radio" name="regGender" value="男" required /> 男</label>' +
          '<label><input type="radio" name="regGender" value="女" /> 女</label>' +
        '</div>' +
        '<div class="register-birth-row inline">' +
          '<label>曆法</label>' +
          '<label><input type="radio" name="regCalendar" value="lunar" /> 農曆</label>' +
          '<label><input type="radio" name="regCalendar" value="solar" checked /> 國曆</label>' +
        '</div>' +
        '<div class="register-birth-row">' +
          '<label id="regDateLabel">國曆出生日期</label>' +
          '<p class="auth-note auth-note-muted" id="regCalendarNote">以國曆排盤（陽曆）</p>' +
          '<div id="regLunarDateFields" class="hidden">' +
            '<div class="register-date-row">' +
              '<div><label for="regLunarYear">年</label><input id="regLunarYear" type="number" min="1900" max="2100" placeholder="年" /></div>' +
              '<div><label for="regLunarMonth">月</label><input id="regLunarMonth" type="number" min="1" max="12" placeholder="月" /></div>' +
              '<div><label for="regLunarDay">日</label><input id="regLunarDay" type="number" min="1" max="30" placeholder="日" /></div>' +
            '</div>' +
          '</div>' +
          '<div id="regSolarDateFields">' +
            '<input id="regSolarDate" type="date" />' +
          '</div>' +
        '</div>' +
        '<div class="register-birth-row hidden" id="regLeapRow">' +
          '<label><input id="regIsLeap" type="checkbox" /> 閏月</label>' +
        '</div>' +
        '<div class="register-birth-row">' +
          '<label for="regTime">出生時辰</label>' +
          '<select id="regTime" required>' +
            '<option value="" selected>請選擇時辰</option>' +
            '<option value="0">早子時 (00:00-01:00)</option>' +
            '<option value="1">丑時 (01:00-03:00)</option>' +
            '<option value="2">寅時 (03:00-05:00)</option>' +
            '<option value="3">卯時 (05:00-07:00)</option>' +
            '<option value="4">辰時 (07:00-09:00)</option>' +
            '<option value="5">巳時 (09:00-11:00)</option>' +
            '<option value="6">午時 (11:00-13:00)</option>' +
            '<option value="7">未時 (13:00-15:00)</option>' +
            '<option value="8">申時 (15:00-17:00)</option>' +
            '<option value="9">酉時 (17:00-19:00)</option>' +
            '<option value="10">戌時 (19:00-21:00)</option>' +
            '<option value="11">亥時 (21:00-23:00)</option>' +
            '<option value="12">晚子時 (23:00-24:00)</option>' +
          '</select>' +
        '</div>' +
      '</fieldset>'
    )
  }

  function getBirthInput(form, name) {
    const genderEl = form.querySelector('input[name="regGender"]:checked')
    if (!genderEl) throw new Error('請選擇性別')

    const calendar = form.querySelector('input[name="regCalendar"]:checked').value
    let date
    if (calendar === 'lunar') {
      const y = form.querySelector('#regLunarYear').value
      const m = form.querySelector('#regLunarMonth').value
      const d = form.querySelector('#regLunarDay').value
      if (!y || !m || !d) throw new Error('請輸入農曆出生日期')
      date = y + '-' + m + '-' + d
    } else {
      date = form.querySelector('#regSolarDate').value
      if (!date) throw new Error('請輸入國曆出生日期')
    }

    const timeVal = form.querySelector('#regTime').value
    if (timeVal === '') throw new Error('請選擇出生時辰')

    return {
      name: name,
      gender: genderEl.value,
      calendar: calendar,
      date: date,
      timeIndex: Number(timeVal),
      isLeap: form.querySelector('#regIsLeap').checked,
      initialChartType: 'natal',
      yearlyYear: new Date().getFullYear(),
    }
  }

  function buildRegistrationBirth(form, name) {
    const trimmedName = String(name || '').trim()
    if (!trimmedName) throw new Error('請填寫姓名')
    const input = getBirthInput(form, trimmedName)
    const a = computeBirth(input)
    return {
      name: input.name,
      gender: input.gender,
      calendar: input.calendar,
      date: input.date,
      timeIndex: input.timeIndex,
      isLeap: input.isLeap,
      initialChartType: 'natal',
      yearlyYear: input.yearlyYear,
      bazi: formatBazi(a),
    }
  }

  function bindBirthFields(form) {
    form.querySelectorAll('input[name="regCalendar"]').forEach(function (el) {
      el.addEventListener('change', function () {
        updateCalendarUI(form)
      })
    })
    updateCalendarUI(form)
  }

  window.ZiweiRegisterBirth = {
    renderBirthFieldsHtml: renderBirthFieldsHtml,
    bindBirthFields: bindBirthFields,
    buildRegistrationBirth: buildRegistrationBirth,
  }
})()
