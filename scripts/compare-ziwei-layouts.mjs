/**
 * Compare iztro major-star layouts against 日舜堂 12-chart reference sheets.
 * Run: node scripts/compare-ziwei-layouts.mjs
 */
import { astro } from 'iztro'

/** @type {Record<string, Record<string, string[][]>>} */
const REF = {
  子: {
    子: [['紫微', '平']],
    寅: [['破軍', '陷']],
    辰: [['廉貞', '旺'], ['天府', '庙']],
    巳: [['太陰', '陷']],
    午: [['貪狼', '旺']],
    未: [['巨門', '陷'], ['天同', '陷']],
    申: [['武曲', '庙'], ['天相', '平']],
    酉: [['太陽', '庙'], ['天梁', '得']], // 紙本寫「地」，常作得地
    戌: [['七殺', '庙']],
    亥: [['天機', '平']],
  },
  丑: {
    子: [['天機', '庙']],
    丑: [['紫微', '庙'], ['破軍', '旺']],
    卯: [['天府', '得']],
    辰: [['太陰', '陷']],
    巳: [['廉貞', '陷'], ['貪狼', '陷']],
    午: [['巨門', '旺']],
    未: [['天相', '得']],
    申: [['天同', '庙'], ['天梁', '陷']],
    酉: [['武曲', '旺'], ['七殺', '闲']],
    戌: [['太陽', '陷']],
  },
  寅: {
    寅: [['紫微', '庙'], ['天府', '庙']],
    卯: [['太陰', '陷']],
    辰: [['貪狼', '庙']],
    巳: [['巨門', '平']],
    午: [['廉貞', '平'], ['天相', '旺']],
    未: [['天梁', '旺']],
    申: [['七殺', '庙']],
    酉: [['天同', '平']],
    戌: [['武曲', '庙']],
    亥: [['太陽', '陷']],
    子: [['破軍', '庙']],
    丑: [['天機', '陷']],
  },
  卯: {
    卯: [['紫微', '旺'], ['貪狼', '地']],
    辰: [['巨門', '平']],
    巳: [['天相', '平']],
    午: [['天梁', '庙']],
    未: [['七殺', '旺'], ['廉貞', '庙']],
    戌: [['天同', '平']],
    亥: [['武曲', '平'], ['破軍', '平']],
    子: [['太陽', '陷']],
    丑: [['天府', '庙']],
    寅: [['天機', '旺'], ['太陰', '闲']],
  },
  辰: {
    辰: [['紫微', '陷'], ['天相', '旺']],
    巳: [['天梁', '陷']],
    午: [['七殺', '旺']],
    申: [['廉貞', '庙']],
    戌: [['破軍', '旺']],
    亥: [['天同', '庙']],
    子: [['武曲', '旺'], ['天府', '庙']],
    丑: [['太陽', '陷'], ['太陰', '庙']],
    寅: [['貪狼', '平']],
    卯: [['天機', '旺'], ['巨門', '庙']],
  },
  巳: {
    巳: [['紫微', '旺'], ['七殺', '平']],
    酉: [['廉貞', '平'], ['破軍', '陷']],
    亥: [['天府', '旺']],
    子: [['天同', '旺'], ['太陰', '庙']],
    丑: [['武曲', '庙'], ['貪狼', '庙']],
    寅: [['太陽', '旺'], ['巨門', '庙']],
    卯: [['天相', '陷']],
    辰: [['天機', '旺'], ['天梁', '庙']],
  },
  午: {
    午: [['紫微', '庙']],
    巳: [['天機', '平']],
    辰: [['七殺', '旺']],
    卯: [['太陽', '庙'], ['天梁', '庙']],
    寅: [['武曲', '得'], ['天相', '庙']],
    丑: [['天同', '陷'], ['巨門', '庙']],
    子: [['貪狼', '旺']],
    亥: [['太陰', '庙']],
    戌: [['廉貞', '庙'], ['天府', '旺']],
    申: [['破軍', '陷']],
  },
  未: {
    午: [['天機', '庙']],
    未: [['紫微', '庙'], ['破軍', '庙']],
    酉: [['天府', '陷']],
    戌: [['太陰', '旺']],
    亥: [['廉貞', '陷'], ['貪狼', '陷']],
    子: [['巨門', '旺']],
    丑: [['天相', '庙']],
    寅: [['天同', '庙'], ['天梁', '庙']],
    卯: [['武曲', '陷'], ['七殺', '陷']],
    辰: [['太陽', '旺']],
  },
  申: {
    巳: [['太陽', '旺']],
    午: [['破軍', '庙']],
    未: [['天機', '陷']],
    申: [['紫微', '旺'], ['天府', '平']],
    酉: [['太陰', '旺']],
    戌: [['貪狼', '庙']],
    亥: [['巨門', '旺']],
    子: [['廉貞', '平'], ['天相', '庙']],
    丑: [['天梁', '旺']],
    寅: [['七殺', '庙']],
    卯: [['天同', '庙']],
    辰: [['武曲', '庙']],
  },
  酉: {
    巳: [['武曲', '平'], ['破軍', '闲']],
    午: [['太陽', '庙']],
    未: [['天府', '庙']],
    申: [['天機', '平'], ['太陰', '平']],
    酉: [['紫微', '平'], ['貪狼', '平']],
    戌: [['巨門', '旺']],
    亥: [['天相', '平']],
    子: [['天梁', '庙']],
    丑: [['廉貞', '庙'], ['七殺', '庙']],
    辰: [['天同', '平']],
  },
  戌: {
    戌: [['紫微', '闲'], ['天相', '闲']],
    亥: [['天梁', '陷']],
    子: [['七殺', '旺']],
    寅: [['廉貞', '庙']],
    辰: [['破軍', '旺']],
    巳: [['天同', '庙']],
    午: [['武曲', '旺'], ['天府', '旺']],
    未: [['太陽', '平'], ['太陰', '平']],
    申: [['貪狼', '平']],
    酉: [['天機', '庙'], ['巨門', '旺']],
  },
  亥: {
    巳: [['天府', '平']],
    午: [['太陰', '陷'], ['天同', '陷']],
    未: [['貪狼', '庙'], ['武曲', '庙']],
    申: [['巨門', '庙'], ['太陽', '陷']],
    酉: [['天相', '陷']],
    戌: [['天梁', '旺'], ['天機', '庙']],
    亥: [['七殺', '平'], ['紫微', '旺']],
    卯: [['破軍', '旺'], ['廉貞', '平']],
  },
}

const BRIGHT_ALIAS = {
  庙: ['庙', '廟', '米'],
  旺: ['旺'],
  得: ['得', '得地', '地'],
  平: ['平'],
  闲: ['闲', '閒'],
  陷: ['陷', '落'],
  利: ['利'],
  不: ['不'],
}

function normBright(b) {
  if (!b) return ''
  const s = String(b).replace(/廟/g, '庙').replace(/閒/g, '闲')
  for (const [canonical, aliases] of Object.entries(BRIGHT_ALIAS)) {
    if (aliases.some((a) => s.includes(a))) return canonical
  }
  return s
}

function starsKey(stars) {
  return stars
    .map(([n, b]) => `${n}:${b}`)
    .sort()
    .join('|')
}

function getIztroLayout(date, timeIndex = 6, gender = '男') {
  const a = astro.bySolar(date, timeIndex, gender, true, 'zh-TW')
  const ziweiBranch = a.palaces.find((p) => p.majorStars.some((s) => s.name === '紫微'))?.earthlyBranch
  /** @type {Record<string, string[][]>} */
  const layout = {}
  for (const p of a.palaces) {
    layout[p.earthlyBranch] = p.majorStars.map((s) => [s.name, normBright(s.brightness || '')])
  }
  return { ziweiBranch, layout, date }
}

const SAMPLE_DATES = {
  子: '1980-01-24',
  丑: '1980-01-21',
  寅: '1980-01-04',
  卯: '1980-01-01',
  辰: '1980-01-02',
  巳: '1980-01-07',
  午: '1980-01-12',
  未: '1980-01-05',
  申: '1980-01-10',
  酉: '1980-01-03',
  戌: '1980-01-08',
  亥: '1980-01-13',
}

const branches = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']
let totalDiffs = 0
const allDiffs = []

for (const ziweiAt of branches) {
  const ref = REF[ziweiAt]
  const { layout, date, ziweiBranch } = getIztroLayout(SAMPLE_DATES[ziweiAt])
  if (ziweiBranch !== ziweiAt) {
    console.log(`WARN sample date ${date} has 紫微 in ${ziweiBranch}, expected ${ziweiAt}`)
  }

  const diffs = []
  for (const branch of branches) {
    const refStars = ref[branch] ?? []
    const izStars = layout[branch] ?? []
    const refKey = starsKey(refStars.map(([n, b]) => [n, normBright(b)]))
    const izKey = starsKey(izStars)

    if (refKey !== izKey) {
      if (refStars.length === 0 && izStars.length === 0) continue
      diffs.push({
        branch,
        ref: refStars,
        iztro: izStars,
      })
    }
  }

  if (diffs.length) {
    totalDiffs += diffs.length
    allDiffs.push({ ziweiAt, date, diffs })
  }
}

console.log('=== 日舜堂 12 局 vs iztro 比對 ===')
console.log(`共 ${branches.length} 局，有差異的宮位數：${totalDiffs}`)
console.log('')

for (const { ziweiAt, date, diffs } of allDiffs) {
  console.log(`【紫微在${ziweiAt}】測試日 ${date} — ${diffs.length} 處不同`)
  for (const d of diffs) {
    const fmt = (stars) => (stars.length ? stars.map(([n, b]) => `${n}(${b})`).join('、') : '（無主星）')
    console.log(`  ${d.branch}宮  紙本: ${fmt(d.ref)}  |  iztro: ${fmt(d.iztro)}`)
  }
  console.log('')
}

if (!allDiffs.length) {
  console.log('全部 12 局主星配置與紙本一致（亮度正規化後）。')
}
