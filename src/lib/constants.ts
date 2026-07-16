/** 地支在傳統方盤上的固定位置（4×4 外圈） */
export const BRANCH_GRID: Record<string, { row: number; col: number }> = {
  巳: { row: 0, col: 0 },
  午: { row: 0, col: 1 },
  未: { row: 0, col: 2 },
  申: { row: 0, col: 3 },
  辰: { row: 1, col: 0 },
  酉: { row: 1, col: 3 },
  卯: { row: 2, col: 0 },
  戌: { row: 2, col: 3 },
  寅: { row: 3, col: 0 },
  丑: { row: 3, col: 1 },
  子: { row: 3, col: 2 },
  亥: { row: 3, col: 3 },
}

/** 流日順排地支 */
export const BRANCH_ROTATION_ORDER = [
  '子',
  '丑',
  '寅',
  '卯',
  '辰',
  '巳',
  '午',
  '未',
  '申',
  '酉',
  '戌',
  '亥',
] as const

export const LUNAR_MONTH_LABELS = [
  '正月',
  '二月',
  '三月',
  '四月',
  '五月',
  '六月',
  '七月',
  '八月',
  '九月',
  '十月',
  '冬月',
  '腊月',
] as const

export function palaceIndexByBranch(
  astrolabe: { palaces: Array<{ index: number; earthlyBranch: string }> },
  branch: string,
): number | undefined {
  return astrolabe.palaces.find((p) => p.earthlyBranch === branch)?.index
}

/** 命盤外框比例 6:4 */
export const CHART_VIEW_W = 600
export const CHART_VIEW_H = 400

export function branchChartPoint(branch: string): { x: number; y: number } | null {
  const pos = BRANCH_GRID[branch]
  if (!pos) return null

  const cellW = CHART_VIEW_W / 4
  const cellH = CHART_VIEW_H / 4
  const centerLeft = cellW
  const centerRight = cellW * 3
  const centerTop = cellH
  const centerBottom = cellH * 3
  const { row, col } = pos

  if (row === 0) {
    if (col === 0) return { x: centerLeft, y: centerTop }
    if (col === 3) return { x: centerRight, y: centerTop }
    return { x: (col + 0.5) * cellW, y: centerTop }
  }

  if (row === 3) {
    if (col === 0) return { x: centerLeft, y: centerBottom }
    if (col === 3) return { x: centerRight, y: centerBottom }
    return { x: (col + 0.5) * cellW, y: centerBottom }
  }

  if (col === 0) return { x: centerLeft, y: (row + 0.5) * cellH }
  if (col === 3) return { x: centerRight, y: (row + 0.5) * cellH }

  return null
}
export const TIME_OPTIONS = [
  { index: 0, label: '早子時', range: '00:00 – 01:00' },
  { index: 1, label: '丑時', range: '01:00 – 03:00' },
  { index: 2, label: '寅時', range: '03:00 – 05:00' },
  { index: 3, label: '卯時', range: '05:00 – 07:00' },
  { index: 4, label: '辰時', range: '07:00 – 09:00' },
  { index: 5, label: '巳時', range: '09:00 – 11:00' },
  { index: 6, label: '午時', range: '11:00 – 13:00' },
  { index: 7, label: '未時', range: '13:00 – 15:00' },
  { index: 8, label: '申時', range: '15:00 – 17:00' },
  { index: 9, label: '酉時', range: '17:00 – 19:00' },
  { index: 10, label: '戌時', range: '19:00 – 21:00' },
  { index: 11, label: '亥時', range: '21:00 – 23:00' },
  { index: 12, label: '晚子時', range: '23:00 – 00:00' },
] as const

/** 右側重點輔星（放大、綠色，與主星同字級） */
export const HIGHLIGHT_GREEN_STARS = new Set([
  '天馬',
  '天鉞',
  '天魁',
  '左輔',
  '右弼',
  '文昌',
  '文曲',
  '地劫',
  '地空',
  '擎羊',
  '祿存',
  '鈴星',
  '火星',
  '陀羅',
])

/** 左側第一列（紫色） */
export const LEFT_PURPLE_STARS = new Set([
  '解神',
  '天刑',
  '天廚',
  '咸池',
  '天空',
  '天姚',
  '陰煞',
  '紅鸞',
  '華蓋',
])

/** 左側第二列（綠色） */
export const LEFT_GREEN_STARS = new Set(['三台', '八座', '恩光', '天貴'])

/** 主星由右而左的標準順序（最右為紫微） */
export const MAJOR_STAR_ORDER_RTL = [
  '紫微',
  '廉貞',
  '武曲',
  '天相',
  '天府',
  '七殺',
  '破軍',
  '貪狼',
  '太陽',
  '太陰',
  '天機',
  '巨門',
  '天同',
  '天梁',
] as const

const MAJOR_STAR_ORDER_MAP = new Map<string, number>(
  MAJOR_STAR_ORDER_RTL.map((name, index) => [name, index]),
)

/** 依命盤慣例排序主星（畫面由左至右：…天同、天梁 → 紫微在最右） */
export function sortMajorStars<T extends { name: string }>(stars: T[]): T[] {
  return [...stars].sort(
    (a, b) =>
      (MAJOR_STAR_ORDER_MAP.get(b.name) ?? -1) - (MAJOR_STAR_ORDER_MAP.get(a.name) ?? -1),
  )
}

/** 不顯示的輔星／雜曜 */
export const EXCLUDED_STARS = new Set([
  '天德',
  '台輔',
  '天月',
  '天喜',
  '寡宿',
  '天才',
  '年解',
  '鳳閣',
  '天使',
  '天哭',
  '天官',
  '天虛',
  '天福',
  '天巫',
  '月德',
  '天壽',
  '龍池',
  '孤辰',
  '破碎',
  '封誥',
  '旬空',
  '空亡',
  '截路',
  '蜚廉',
  '截空',
  '天傷',
])

export function filterDisplayStars<T extends { name: string }>(stars: T[]): T[] {
  return stars.filter((s) => !EXCLUDED_STARS.has(s.name))
}

export interface SplitMinorStars<T extends { name: string }> {
  leftPurple: T[]
  leftGreen: T[]
  rightGreen: T[]
}

export function splitPalaceMinors<T extends { name: string }>(stars: T[]): SplitMinorStars<T> {
  const filtered = filterDisplayStars(stars)
  return {
    leftPurple: filtered.filter((s) => LEFT_PURPLE_STARS.has(s.name)),
    leftGreen: filtered.filter((s) => LEFT_GREEN_STARS.has(s.name)),
    rightGreen: filtered.filter((s) => HIGHLIGHT_GREEN_STARS.has(s.name)),
  }
}

/** 宮名顯示對照（iztro 原名 → 畫面顯示） */
export const PALACE_DISPLAY_NAMES: Record<string, string> = {
  官祿: '事業',
  僕役: '交友',
}

export function shouldShowDecadal(range: [number, number]): boolean {
  const [start, end] = range
  return end <= 90 && start <= 80
}

export function formatPalaceName(name: string): string {
  const display = PALACE_DISPLAY_NAMES[name] ?? name
  return display.split('').join(' ')
}

/** 星曜亮度顯示（得、不 → 平） */
export function formatBrightness(brightness?: string): string | undefined {
  if (!brightness) return undefined
  return brightness.replace(/庙/g, '廟').replace(/闲/g, '閒')
}

/** 四化顏色（雙框線用） */
export const MUTAGEN_COLORS: Record<string, string> = {
  祿: '#2e7d32',
  權: '#1565c0',
  科: '#2e7d32',
  忌: '#c62828',
}

/** 十天干四化表（祿、權、科、忌） */
export const MUTAGEN_BY_STEM: Record<string, [string, string, string, string]> = {
  甲: ['廉貞', '破軍', '武曲', '太陽'],
  乙: ['天機', '天梁', '紫微', '太陰'],
  丙: ['天同', '天機', '文昌', '廉貞'],
  丁: ['太陰', '天同', '天機', '巨門'],
  戊: ['貪狼', '太陰', '右弼', '天機'],
  己: ['武曲', '貪狼', '天梁', '文曲'],
  庚: ['太陽', '武曲', '太陰', '天同'],
  辛: ['巨門', '太陽', '文曲', '文昌'],
  壬: ['天梁', '紫微', '左輔', '武曲'],
  癸: ['破軍', '巨門', '太陰', '貪狼'],
}

const MUTAGEN_LABELS = ['祿', '權', '科', '忌'] as const

/** 依天干四化表查詢星曜是否帶四化（僅表列四星） */
export function getMutagenForStar(stem: string, starName: string): string | undefined {
  const stars = MUTAGEN_BY_STEM[stem]
  if (!stars) return undefined
  const idx = stars.indexOf(starName)
  return idx >= 0 ? MUTAGEN_LABELS[idx] : undefined
}
