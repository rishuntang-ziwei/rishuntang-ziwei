/** 本命簡易解盤 — 事業（官祿）、愛情（夫妻）、健康（疾厄） */

const PALACE_DISPLAY = { 官祿: '事業', 僕役: '交友' }

const TOPICS = [
  {
    id: 'career',
    label: '事業',
    palace: '官祿',
    intro: '官祿宮主職場、仕途與社會成就。以下依本命主星簡述方向，供參考。',
    emptyHint: '事業方向常受對宮環境與外出機會牽引，宜觀察職場變化並主動歷練。',
    tips: ['設定階段性目標，比一次求成更穩。', '贵人與合作比單打獨鬥省力。'],
  },
  {
    id: 'love',
    label: '愛情',
    palace: '夫妻',
    intro: '夫妻宮主感情、婚姻與親密互動。以下依本命主星簡述傾向，供參考。',
    emptyHint: '感情表達較內斂或隨環境而動，需透過相處慢慢顯現真實需求。',
    tips: ['直接溝通期待，勝過猜測對方心思。', '保留個人空間，關係反而長久。'],
  },
  {
    id: 'health',
    label: '健康',
    palace: '疾厄',
    intro: '疾厄宮反映體質與身心負擔。以下為一般性參考，不能取代醫療診斷。',
    emptyHint: '體質強弱需綜合命宮與生活習慣觀察，宜定期檢查、規律作息。',
    tips: ['固定睡眠與飲食節奏，是最基本的養生。', '壓力大時先減量再硬撐。'],
  },
]

const STAR_HINTS = {
  紫微: { theme: '自主', keywords: '掌控、領導、創造' },
  天機: { theme: '策劃', keywords: '思考、變通、勞心' },
  太陽: { theme: '能量', keywords: '付出、名望、忙碌' },
  武曲: { theme: '開拓', keywords: '執行、資源、剛毅' },
  天同: { theme: '分享', keywords: '享受、溫和、知足' },
  廉貞: { theme: '需求', keywords: '原則、情感、細膩' },
  天府: { theme: '儲存', keywords: '穩定、包容、積累' },
  太陰: { theme: '養分', keywords: '敏感、照顧、內斂' },
  貪狼: { theme: '資源', keywords: '才華、慾望、學習' },
  巨門: { theme: '協調', keywords: '溝通、分析、口舌' },
  天相: { theme: '操盤', keywords: '服務、協調、安排' },
  天梁: { theme: '背景', keywords: '庇護、原則、長輩' },
  七殺: { theme: '執行', keywords: '魄力、競爭、開創' },
  破軍: { theme: '整合', keywords: '變革、衝勁、破立' },
}

const TOPIC_PREFIX = {
  career: '在事業上',
  love: '在感情上',
  health: '在身心方面',
}

const BRIGHT_NOTE = {
  庙: '星力強旺，特質容易顯現在外。',
  旺: '星力充沛，發揮相對穩定。',
  得: '星力得所，需時間累積成果。',
  利: '星力尚可，配合努力可見成效。',
  平: '星力平和，起伏不至劇烈。',
  不: '星力稍弱，宜謹慎調整步調。',
  陷: '星力受阻，需多一份耐心與方法。',
}

const MUTAGEN_NOTE = {
  祿: '化祿同宮，資源與順遂感較佳。',
  權: '化權同宮，主動性與掌控力提升。',
  科: '化科同宮，名望與學習力加分。',
  忌: '化忌同宮，此領域宜多留心思經營。',
}

const AUX_STARS = {
  career: {
    左輔: '有助力或貴人提攜。',
    右弼: '團隊協作機會增多。',
    天魁: '易遇長輩或貴人提點。',
    天鉞: '關鍵時刻常有轉機。',
    文昌: '文書、專業或考試有利。',
    文曲: '口才與技藝可發揮。',
    祿存: '重視穩健與資源累積。',
  },
  love: {
    紅鸞: '桃花與喜悅緣分較動。',
    天喜: '感情易有開心進展。',
    天姚: '社交與異性互動增加。',
    咸池: '重視親密與感官連結。',
  },
  health: {
    擎羊: '留意急性壓力或意外小傷。',
    陀羅: '慢性困擾或拖延性不適。',
    火星: '注意火氣、發炎或急躁。',
    鈴星: '隱性煩躁影響睡眠與神經。',
    地空: '易有虛耗感或思緒過多。',
    地劫: '作息失衡時體力下降快。',
  },
}

function formatPalaceName(name) {
  return PALACE_DISPLAY[name] || name
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function getPalaceStars(astrolabe, palaceName) {
  const palace = astrolabe.palace(palaceName)
  if (!palace) return { palace: null, stars: [], borrowed: false, borrowFrom: '' }

  if (palace.majorStars?.length) {
    return { palace, stars: palace.majorStars, borrowed: false, borrowFrom: '' }
  }

  const surrounded = astrolabe.surroundedPalaces(palaceName)
  const opposite = surrounded?.opposite
  return {
    palace,
    stars: opposite?.majorStars || [],
    borrowed: true,
    borrowFrom: opposite?.name || '',
  }
}

function collectMinorNames(palace) {
  if (!palace) return []
  const list = []
  for (const group of [palace.minorStars, palace.adjectiveStars]) {
    if (!group) continue
    for (const star of group) {
      if (star?.name) list.push(star.name)
    }
  }
  return list
}

function describeStar(star, topicId) {
  const hint = STAR_HINTS[star.name]
  const prefix = TOPIC_PREFIX[topicId] || ''
  if (!hint) {
    return `${prefix}，${star.name}坐守此宮，相關特質值得細細觀察。`
  }
  let line = `${prefix}，${star.name}星帶有「${hint.theme}」色彩，常見${hint.keywords.split('、').slice(0, 2).join('、')}等表現。`
  if (star.brightness && BRIGHT_NOTE[star.brightness]) {
    line += BRIGHT_NOTE[star.brightness]
  }
  if (star.mutagen && MUTAGEN_NOTE[star.mutagen]) {
    line += MUTAGEN_NOTE[star.mutagen]
  }
  return line
}

function describeAuxStars(minors, topicId) {
  const map = AUX_STARS[topicId]
  if (!map) return []
  const lines = []
  for (const name of minors) {
    if (map[name]) lines.push(`${name}：${map[name]}`)
  }
  return lines.slice(0, 2)
}

function buildTopicReading(astrolabe, topic) {
  const { palace, stars, borrowed, borrowFrom } = getPalaceStars(astrolabe, topic.palace)
  const paragraphs = [topic.intro]

  if (!palace) {
    paragraphs.push('未能讀取此宮資料，請重新排盤。')
    return {
      id: topic.id,
      label: topic.label,
      title: `${topic.label}解盤`,
      paragraphs,
      tip: topic.tips[0],
    }
  }

  const gz = `${palace.heavenlyStem}${palace.earthlyBranch}`
  const palaceLine = borrowed
    ? `${formatPalaceName(topic.palace)}（${gz}）無主星，借對宮${formatPalaceName(borrowFrom)}星曜。${topic.emptyHint}`
    : `${formatPalaceName(topic.palace)}（${gz}）有主星坐守。`
  paragraphs.push(palaceLine)

  if (stars.length) {
    const mainNames = stars.map((s) => s.name).join('、')
    paragraphs.push(`主星為 ${mainNames}。`)
    for (const star of stars.slice(0, 2)) {
      paragraphs.push(describeStar(star, topic.id))
    }
  } else {
    paragraphs.push(topic.emptyHint)
  }

  const auxLines = describeAuxStars(collectMinorNames(palace), topic.id)
  if (auxLines.length) {
    paragraphs.push(`輔星提示：${auxLines.join(' ')}`)
  }

  if (palace.isBodyPalace) {
    paragraphs.push('此宮為身宮，上述特質在人生選擇上會格外明顯。')
  }

  const soul = astrolabe.palace('命宮')
  if (soul?.majorStars?.length && topic.id === 'career') {
    paragraphs.push(
      `綜合命宮主星 ${soul.majorStars.map((s) => s.name).join('、')}，整體人生節奏會影響職涯取捨，宜與官祿宮一併參考。`,
    )
  }

  return {
    id: topic.id,
    label: topic.label,
    title: `${topic.label}解盤`,
    paragraphs,
    tip: topic.tips[topic.id === 'love' ? 1 : 0],
  }
}

export function buildNatalReading(astrolabe, personName) {
  const sections = TOPICS.map((topic) => buildTopicReading(astrolabe, topic))
  return {
    personName: personName || '命主',
    sections,
    byId: Object.fromEntries(sections.map((s) => [s.id, s])),
  }
}

export function renderReadingPanel(reading, activeTab, personName) {
  const tab = reading.byId[activeTab] ? activeTab : 'career'
  const section = reading.byId[tab]
  const tabsHtml = reading.sections
    .map(
      (s) =>
        `<button type="button" class="mobile-reading-tab${s.id === tab ? ' is-active' : ''}" data-tab="${s.id}">${escapeHtml(s.label)}</button>`,
    )
    .join('')

  const bodyHtml = section.paragraphs
    .map((p) => `<p class="mobile-reading-p">${escapeHtml(p)}</p>`)
    .join('')

  return (
    `<div class="mobile-reading-inner">` +
    `<div class="mobile-reading-header">` +
    `<h3 class="mobile-reading-title">本命簡易解盤</h3>` +
    `<p class="mobile-reading-sub">${escapeHtml(personName || reading.personName)} · 僅供參考</p>` +
    `</div>` +
    `<div class="mobile-reading-tabs" role="tablist">${tabsHtml}</div>` +
    `<div class="mobile-reading-body">` +
    `<h4 class="mobile-reading-section-title">${escapeHtml(section.title)}</h4>` +
    bodyHtml +
    `<p class="mobile-reading-tip"><strong>小提示：</strong>${escapeHtml(section.tip)}</p>` +
    `<p class="mobile-reading-disclaimer">簡易解盤依星曜組合作概括說明，詳細命勢請洽專業老師。</p>` +
    `</div>` +
    `</div>`
  )
}
