import { buildNatalReading, renderReadingPanel } from './vendor/natal-reading.mjs'

const GRID = [
  ['巳', '午', '未', '申'],
  ['辰', 'C', 'C', '酉'],
  ['卯', 'C', 'C', '戌'],
  ['寅', '丑', '子', '亥'],
]

const FOCUS_PALACES = new Set(['命宮', '財帛', '官祿', '夫妻', '疾厄'])

const PALACE_LABEL = {
  官祿: '事業',
  僕役: '交友',
}

const TIME_LABELS = [
  '早子時',
  '丑時',
  '寅時',
  '卯時',
  '辰時',
  '巳時',
  '午時',
  '未時',
  '申時',
  '酉時',
  '戌時',
  '亥時',
  '晚子時',
]

let currentReading = null
let activeTab = 'life'

const formView = document.getElementById('formView')
const resultView = document.getElementById('resultView')
const form = document.getElementById('paipanForm')
const formError = document.getElementById('formError')
const chartGrid = document.getElementById('chartGrid')
const readingPanel = document.getElementById('readingPanel')
const resultMeta = document.getElementById('resultMeta')
const backBtn = document.getElementById('backBtn')

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function formatBrightness(brightness) {
  if (!brightness) return ''
  const raw = String(brightness).trim()
  if (raw === '利') return '旺'
  if (raw === '地') return '閒'
  const canonical = new Set(['廟', '旺', '平', '陷', '閒'])
  if (canonical.has(raw)) return raw
  const s = raw.replace(/廟/g, '庙').replace(/閒/g, '闲')
  if (/不得/.test(s) || s === '不') return '平'
  if (/得地/.test(s) || s === '得') return '閒'
  if (/利益/.test(s) || s === '利') return '旺'
  if (/庙|米/.test(s)) return '廟'
  if (/旺/.test(s)) return '旺'
  if (/陷|落/.test(s)) return '陷'
  if (/闲/.test(s)) return '閒'
  if (/地/.test(s)) return '閒'
  if (/平/.test(s)) return '平'
  return '平'
}

function getZiweiBranch(astrolabe) {
  const palace = astrolabe.palaces.find((p) => p.majorStars.some((s) => s.name === '紫微'))
  return palace ? palace.earthlyBranch : null
}

function lookupRishuntangBrightness(ziweiBranch, palaceBranch, starName) {
  const table = window.RishuntangBrightness
  if (!table || !ziweiBranch || !palaceBranch) return null
  const stars = table[ziweiBranch]?.[palaceBranch]
  if (!stars) return null
  const hit = stars.find((s) => s.name === starName)
  return hit ? hit.brightness : null
}

function majorBrightnessForDisplay(astrolabe, palaceBranch, starName, iztroBrightness) {
  const ziweiBranch = getZiweiBranch(astrolabe)
  return lookupRishuntangBrightness(ziweiBranch, palaceBranch, starName) ?? iztroBrightness
}

function formatPalaceName(name) {
  const display = PALACE_LABEL[name] || name
  return display.replace(/宮$/, '')
}

function getAstro() {
  const iztro = window.iztro
  if (!iztro?.astro) {
    throw new Error('排盤引擎尚未載入，請重新開啟 App。')
  }
  return iztro.astro
}

function showError(message) {
  formError.hidden = !message
  formError.textContent = message || ''
}

function renderReading(personName) {
  if (!currentReading) return
  readingPanel.innerHTML = renderReadingPanel(currentReading, activeTab, personName)
  readingPanel.querySelectorAll('.mobile-reading-tab').forEach((btn) => {
    btn.addEventListener('click', () => {
      activeTab = btn.dataset.tab || 'life'
      renderReading(personName)
    })
  })
}

function renderPalaceCellAt(palace, astrolabe, row, col) {
  const focus = FOCUS_PALACES.has(palace.name) ? ' is-focus' : ''
  const bodyMark = palace.isBodyPalace ? '（身）' : ''
  const majors = (palace.majorStars || []).map((star) => {
    const brightness = formatBrightness(
      majorBrightnessForDisplay(astrolabe, palace.earthlyBranch, star.name, star.brightness),
    )
    const mutagen = star.mutagen ? `<span class="mut">${escapeHtml(star.mutagen)}</span>` : ''
    const bright = brightness ? `<span class="bright">${escapeHtml(brightness)}</span>` : ''
    return `<span class="star-chip">${escapeHtml(star.name)}${bright}${mutagen}</span>`
  })

  return (
    `<div class="chart-cell${focus}" style="grid-row:${row};grid-column:${col}">` +
    `<div class="palace-name">${escapeHtml(formatPalaceName(palace.name))}${escapeHtml(bodyMark)}</div>` +
    `<div class="palace-gz">${escapeHtml(palace.heavenlyStem)}${escapeHtml(palace.earthlyBranch)}</div>` +
    `<div class="palace-stars">${majors.join('') || '<span class="star-chip">空</span>'}</div>` +
    `</div>`
  )
}

function renderChart(astrolabe, personName, metaLine) {
  const byBranch = new Map(astrolabe.palaces.map((p) => [p.earthlyBranch, p]))
  let centerDone = false
  let html = ''

  GRID.forEach((row, ri) => {
    row.forEach((cell, ci) => {
      if (cell === 'C') {
        if (ri === 1 && ci === 1 && !centerDone) {
          centerDone = true
          html +=
            `<div class="chart-cell is-center" style="grid-column:2/4;grid-row:2/4">` +
            `<p class="chart-center-name">${escapeHtml(personName)}</p>` +
            `<p class="chart-center-meta">${escapeHtml(metaLine)}</p>` +
            `<p class="chart-center-meta">${escapeHtml(astrolabe.fiveElementsClass || '')} · ${escapeHtml(astrolabe.soul || '')}</p>` +
            `</div>`
        }
        return
      }
      const palace = byBranch.get(cell)
      if (!palace) return
      html += renderPalaceCellAt(palace, astrolabe, ri + 1, ci + 1)
    })
  })

  chartGrid.innerHTML = html
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

    const astro = getAstro()
    const astrolabe = astro.bySolar(solarDate, timeIndex, gender, true, 'zh-TW')
    const timeLabel = TIME_LABELS[timeIndex] || `${timeIndex}時`
    const metaLine = `${solarDate} · ${timeLabel} · ${gender}`

    activeTab = 'life'
    currentReading = buildNatalReading(astrolabe, personName)
    renderChart(astrolabe, personName, metaLine)
    renderReading(personName)
    resultMeta.textContent = metaLine

    formView.hidden = true
    resultView.hidden = false
    resultView.scrollIntoView({ behavior: 'smooth', block: 'start' })
  } catch (err) {
    showError(err?.message || String(err))
  }
})

backBtn.addEventListener('click', () => {
  resultView.hidden = true
  formView.hidden = false
  showError('')
  window.scrollTo({ top: 0, behavior: 'smooth' })
})

setDefaultDate()
