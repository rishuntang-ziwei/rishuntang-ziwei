import type FunctionalAstrolabe from 'iztro/lib/astro/FunctionalAstrolabe'
import type { IFunctionalStar } from 'iztro/lib/star/FunctionalStar'

const TARGET_PALACE_KEYS = [
  { name: '命宮', label: '命宮' },
  { name: '官祿', label: '事業宮（官祿）' },
  { name: '夫妻', label: '夫妻宮' },
] as const

function formatStar(star: IFunctionalStar) {
  return {
    name: star.name,
    brightness: star.brightness || '',
    mutagen: star.mutagen || '',
  }
}

function collectMutagens(stars: IFunctionalStar[]) {
  return stars
    .filter((star) => star.mutagen)
    .map((star) => `${star.name}${star.mutagen}`)
}

function formatPalaceEntry(astrolabe: FunctionalAstrolabe, palace: FunctionalAstrolabe['palaces'][number], label: string) {
  const allStars = [...palace.majorStars, ...palace.minorStars, ...palace.adjectiveStars]
  const entry: Record<string, unknown> = {
    宮位: label,
    地支: palace.earthlyBranch,
    主星: palace.majorStars.map(formatStar),
    主星名稱: palace.majorStars.map((star) => star.name),
    輔星: palace.minorStars.map(formatStar),
    煞星: palace.adjectiveStars.map(formatStar),
    四化: collectMutagens(allStars),
    廟旺: palace.majorStars
      .map((star) => (star.brightness ? `${star.name}:${star.brightness}` : star.name))
      .join('、'),
  }

  if (palace.majorStars.length === 0) {
    const opposite = astrolabe.palaces[(palace.index + 6) % 12]
    if (opposite && opposite.majorStars.length > 0) {
      entry.借對宮 = opposite.name
      entry.借對宮地支 = opposite.earthlyBranch
      entry.借對宮主星 = opposite.majorStars.map(formatStar)
    }
  }

  return entry
}

export function formatPalaceDataFromAstrolabe(astrolabe: FunctionalAstrolabe) {
  const byName = new Map(astrolabe.palaces.map((palace) => [palace.name, palace]))
  return TARGET_PALACE_KEYS.map(({ name, label }) => {
    const palace = byName.get(name)
    return palace ? formatPalaceEntry(astrolabe, palace, label) : null
  }).filter(Boolean)
}

export function formatPalaceData(allPalaces: Record<string, { name: string; branch?: string; earthlyBranch?: string; majorStars?: unknown[]; minorStars?: unknown[]; badStars?: unknown[]; adjectiveStars?: unknown[]; transformations?: unknown[]; intensity?: string }>) {
  const targetNames = TARGET_PALACE_KEYS.map((item) => item.name)

  const filteredData = Object.keys(allPalaces)
    .filter((key) => targetNames.includes(allPalaces[key].name))
    .map((key) => {
      const p = allPalaces[key]
      const meta = TARGET_PALACE_KEYS.find((item) => item.name === p.name)
      return {
        宮位: meta?.label ?? p.name,
        地支: p.branch ?? p.earthlyBranch ?? '',
        主星: p.majorStars || [],
        輔星: p.minorStars || [],
        煞星: p.badStars || p.adjectiveStars || [],
        四化: p.transformations || [],
        廟旺: p.intensity || '',
      }
    })

  return JSON.stringify(filteredData, null, 2)
}
