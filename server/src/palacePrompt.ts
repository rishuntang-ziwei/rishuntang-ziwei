type StarEntry = { name?: string } | string

type PalaceEntry = {
  宮位?: string
  地支?: string
  主星?: StarEntry[]
  主星名稱?: string[]
  借對宮?: string
  借對宮主星?: StarEntry[]
}

function starNames(stars: StarEntry[] | undefined): string[] {
  if (!stars?.length) return []
  return stars
    .map((star) => (typeof star === 'string' ? star : star.name || ''))
    .filter(Boolean)
}

function formatPalaceLine(entry: PalaceEntry): string {
  const label = entry.宮位 || '未知宮'
  const branch = entry.地支 || '?'
  const nativeStars = entry.主星名稱?.length ? entry.主星名稱 : starNames(entry.主星)

  if (nativeStars.length > 0) {
    return `- ${label}（${branch}）：主星 ${nativeStars.join('、')}`
  }

  const borrowed = starNames(entry.借對宮主星)
  if (borrowed.length > 0) {
    const from = entry.借對宮 || '對宮'
    return `- ${label}（${branch}）：本宮無主星，借 ${from} 主星 ${borrowed.join('、')}`
  }

  return `- ${label}（${branch}）：本宮無主星`
}

export function buildPalaceInterpretPrompt(palaceJson: string, prefix = ''): string {
  let palaces: PalaceEntry[] = []
  try {
    const parsed = JSON.parse(palaceJson)
    if (Array.isArray(parsed)) palaces = parsed
  } catch {
    /* keep empty — fall back to raw JSON only */
  }

  const summary =
    palaces.length > 0
      ? palaces.map(formatPalaceLine).join('\n')
      : '（無法解析宮位摘要，請依 JSON 內容）'

  const header = `【以下為命盤已排定之宮位與主星，解析時必須逐字引用，禁止自行排盤、推算或替換星名】
${summary}`

  const body = prefix ? `${prefix}\n\n${header}\n\n完整 JSON：${palaceJson}` : `${header}\n\n完整 JSON：${palaceJson}`
  return body
}
