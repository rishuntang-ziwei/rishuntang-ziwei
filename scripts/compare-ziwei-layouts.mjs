/**
 * Compare iztro major-star layouts against 日舜堂 12-chart reference sheets.
 * Run: node scripts/compare-ziwei-layouts.mjs
 */
import { astro } from 'iztro'
import { RISHUNTANG_BRIGHTNESS_REF as REF } from './build-rishuntang-brightness.mjs'

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
