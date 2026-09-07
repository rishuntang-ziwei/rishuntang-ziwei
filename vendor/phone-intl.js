window.ZiweiPhoneIntl = (function () {
  const COUNTRY_OPTIONS = [
    { code: '+886', label: '台灣 +886' },
    { code: '+86', label: '中國 +86' },
    { code: '+852', label: '香港 +852' },
    { code: '+853', label: '澳門 +853' },
    { code: '+81', label: '日本 +81' },
    { code: '+82', label: '韓國 +82' },
    { code: '+1', label: '美國／加拿大 +1' },
    { code: '+44', label: '英國 +44' },
    { code: '+33', label: '法國 +33' },
    { code: '+49', label: '德國 +49' },
    { code: '+39', label: '義大利 +39' },
    { code: '+34', label: '西班牙 +34' },
    { code: '+31', label: '荷蘭 +31' },
    { code: '+41', label: '瑞士 +41' },
    { code: '+46', label: '瑞典 +46' },
    { code: '+47', label: '挪威 +47' },
    { code: '+45', label: '丹麥 +45' },
    { code: '+61', label: '澳洲 +61' },
    { code: '+64', label: '紐西蘭 +64' },
    { code: '+65', label: '新加坡 +65' },
    { code: '+60', label: '馬來西亞 +60' },
    { code: '+66', label: '泰國 +66' },
    { code: '+84', label: '越南 +84' },
    { code: '+63', label: '菲律賓 +63' },
    { code: '+91', label: '印度 +91' },
    { code: '+971', label: '阿聯 +971' },
    { code: '+other', label: '其他（請含國碼）' },
  ]

  function renderPhoneFieldHtml(options) {
    const opts = options || {}
    const label = opts.label || '電話'
    const localName = opts.localName || 'phoneLocal'
    const countryName = opts.countryName || 'phoneCountry'
    const placeholder = opts.placeholder || '請輸入電話號碼'
    const note = opts.note || '可輸入當地號碼；選「其他」時請直接輸入完整國際號碼（如 +44…）'

    const optionsHtml = COUNTRY_OPTIONS.map(function (item) {
      const selected = item.code === '+886' ? ' selected' : ''
      return '<option value="' + item.code + '"' + selected + '>' + item.label + '</option>'
    }).join('')

    return (
      '<label class="auth-phone-label">' + label +
        '<div class="auth-phone-row">' +
          '<select name="' + countryName + '" class="auth-phone-country" aria-label="國碼">' + optionsHtml + '</select>' +
          '<input type="tel" name="' + localName + '" class="auth-phone-local" placeholder="' + placeholder + '" required autocomplete="tel">' +
        '</div>' +
        '<span class="auth-phone-hint">' + note + '</span>' +
      '</label>'
    )
  }

  function combinePhone(countryCode, localInput) {
    const local = String(localInput || '').trim()
    if (!local) return ''

    if (countryCode === '+other' || local.startsWith('+')) {
      const digits = local.replace(/[^\d+]/g, '')
      if (digits.startsWith('+')) return '+' + digits.slice(1).replace(/\D/g, '')
      if (/^\d+$/.test(local.replace(/\D/g, ''))) return '+' + local.replace(/\D/g, '')
      return local
    }

    const localDigits = local.replace(/\D/g, '')
    if (!localDigits) return ''

    let digits = localDigits
    if (countryCode === '+886' && digits.startsWith('0')) {
      digits = digits.slice(1)
    }

    return countryCode + digits
  }

  function readPhoneFromForm(form, countryName, localName) {
    const country = form.elements[countryName || 'phoneCountry']
    const local = form.elements[localName || 'phoneLocal']
    if (!local) return ''
    const countryCode = country ? country.value : '+886'
    return combinePhone(countryCode, local.value)
  }

  return {
    COUNTRY_OPTIONS: COUNTRY_OPTIONS,
    renderPhoneFieldHtml: renderPhoneFieldHtml,
    combinePhone: combinePhone,
    readPhoneFromForm: readPhoneFromForm,
  }
})()
