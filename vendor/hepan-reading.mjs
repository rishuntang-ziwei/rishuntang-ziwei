/** 雙人合盤簡述（規則式，供教學參考） */

const RELATION_LABEL = {
  love: '感情合盤',
  family: '六親合盤',
  business: '合作合盤',
  general: '綜合合盤',
}

const PALACE_LABEL = {
  命宮: '命宮',
  夫妻: '夫妻宮',
  福德: '福德宮',
  官祿: '事業宮',
  財帛: '財帛宮',
  子女: '子女宮',
  遷移: '遷移宮',
  田宅: '田宅宮',
  兄弟: '兄弟宮',
  父母: '父母宮',
  疾厄: '疾厄宮',
  奴僕: '交友宮',
}

function palaceStars(astrolabe, palaceName) {
  const palace = astrolabe.palace(palaceName)
  if (!palace) return { borrowed: false, borrowFrom: '', stars: [] }
  if (palace.majorStars?.length) {
    return {
      borrowed: false,
      borrowFrom: '',
      stars: palace.majorStars.map((s) => ({
        name: s.name,
        brightness: s.brightness || '',
        mutagen: s.mutagen || '',
      })),
    }
  }
  const opp = astrolabe.surroundedPalaces(palaceName)?.opposite
  return {
    borrowed: true,
    borrowFrom: opp?.name || '',
    stars: (opp?.majorStars || []).map((s) => ({
      name: s.name,
      brightness: s.brightness || '',
      mutagen: s.mutagen || '',
    })),
  }
}

function formatStars(stars) {
  if (!stars.length) return '（無主星，宜看對宮或輔星）'
  return stars
    .map((s) => {
      let t = s.name
      if (s.brightness) t += `(${s.brightness})`
      if (s.mutagen) t += `[${s.mutagen}]`
      return t
    })
    .join('、')
}

function pairBlock(title, a, palaceA, b, palaceB) {
  const left = palaceStars(a, palaceA)
  const right = palaceStars(b, palaceB)
  const borrowNote =
    left.borrowed && left.borrowFrom
      ? `${PALACE_LABEL[palaceA] || palaceA}借${PALACE_LABEL[left.borrowFrom] || left.borrowFrom} `
      : ''
  const borrowNoteB =
    right.borrowed && right.borrowFrom
      ? `${PALACE_LABEL[palaceB] || palaceB}借${PALACE_LABEL[right.borrowFrom] || right.borrowFrom} `
      : ''
  return {
    title,
    lines: [
      `${borrowNote}${PALACE_LABEL[palaceA] || palaceA}：${formatStars(left.stars)}`,
      `${borrowNoteB}${PALACE_LABEL[palaceB] || palaceB}：${formatStars(right.stars)}`,
      '互動時宜觀察雙方主星 temperament 是否互補；忌星重疊時需多溝通、放慢步調。',
    ],
  }
}

function pairsForRelationship(relationship) {
  if (relationship === 'love') {
    return [
      ['雙方命宮', '命宮', '命宮'],
      ['甲夫妻 × 乙命宮', '夫妻', '命宮'],
      ['乙夫妻 × 甲命宮', '命宮', '夫妻'],
      ['雙方福德', '福德', '福德'],
    ]
  }
  if (relationship === 'family') {
    return [
      ['雙方命宮', '命宮', '命宮'],
      ['甲子女 × 乙命宮', '子女', '命宮'],
      ['乙子女 × 甲命宮', '命宮', '子女'],
      ['雙方田宅', '田宅', '田宅'],
    ]
  }
  if (relationship === 'business') {
    return [
      ['雙方命宮', '命宮', '命宮'],
      ['甲官祿 × 乙財帛', '官祿', '財帛'],
      ['乙官祿 × 甲財帛', '官祿', '財帛'],
      ['雙方遷移', '遷移', '遷移'],
    ]
  }
  return [
    ['雙方命宮', '命宮', '命宮'],
    ['甲夫妻 × 乙命宮', '夫妻', '命宮'],
    ['乙夫妻 × 甲命宮', '命宮', '夫妻'],
    ['雙方官祿', '官祿', '官祿'],
  ]
}

export function buildHepanReading(astrolabeA, nameA, astrolabeB, nameB, relationship = 'love') {
  const rel = RELATION_LABEL[relationship] || RELATION_LABEL.general
  const blocks = pairsForRelationship(relationship).map(([title, pA, pB]) =>
    pairBlock(title, astrolabeA, pA, astrolabeB, pB),
  )
  return {
    title: rel,
    subtitle: `${nameA || '甲'} · ${nameB || '乙'}`,
    blocks,
    disclaimer: '合盤簡述依主星配置概括，供教學與參考；細節請洽專業老師。',
  }
}

export function renderHepanPanelHtml(reading) {
  const blocks = reading.blocks
    .map(
      (b) =>
        `<section class="hepan-block"><h4>${escapeHtml(b.title)}</h4>` +
        b.lines.map((line) => `<p>${escapeHtml(line)}</p>`).join('') +
        `</section>`,
    )
    .join('')
  return (
    `<div class="hepan-panel-inner">` +
    `<div class="hepan-panel-header">` +
    `<h3>${escapeHtml(reading.title)}</h3>` +
    `<p class="hepan-panel-sub">${escapeHtml(reading.subtitle)}</p>` +
    `</div>` +
    `<div class="hepan-panel-body">${blocks}</div>` +
    `<p class="hepan-disclaimer">${escapeHtml(reading.disclaimer)}</p>` +
    `</div>`
  )
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
