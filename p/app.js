const form = document.getElementById('paipanForm')
const formError = document.getElementById('formError')

function showError(message) {
  formError.hidden = !message
  formError.textContent = message || ''
}

function setDefaultDate() {
  const input = document.getElementById('solarDate')
  if (input.value) return
  input.value = '1990-01-01'
}

form.addEventListener('submit', (event) => {
  event.preventDefault()
  showError('')

  try {
    const personName = (document.getElementById('name').value || '').trim() || '命主'
    const gender = document.getElementById('gender').value
    const solarDate = document.getElementById('solarDate').value
    const timeIndex = Number(document.getElementById('timeIndex').value)

    if (!solarDate) throw new Error('請選擇國曆生日')
    if (!Number.isInteger(timeIndex) || timeIndex < 0 || timeIndex > 12) {
      throw new Error('請選擇出生時辰')
    }

    const payload = {
      name: personName,
      gender,
      calendar: 'solar',
      date: solarDate,
      timeIndex,
      isLeap: false,
      initialChartType: 'natal',
      source: 'p',
      showNatalReading: true,
    }
    sessionStorage.setItem('guestChartPayload', JSON.stringify(payload))
    location.href = '../chart.html?guest=1&from=p'
  } catch (err) {
    showError(err?.message || String(err))
  }
})

setDefaultDate()
