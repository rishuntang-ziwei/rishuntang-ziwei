import type FunctionalAstrolabe from 'iztro/lib/astro/FunctionalAstrolabe'
import type { IFunctionalStar } from 'iztro/lib/star/FunctionalStar'

const TARGET_PALACES = ['命宮', '官祿宮', '夫妻宮'] as const

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

export function formatPalaceDataFromAstrolabe(astrolabe: FunctionalAstrolabe) {
  return astrolabe.palaces
    .filter((palace) => (TARGET_PALACES as readonly string[]).includes(palace.name))
    .map((palace) => {
      const allStars = [...palace.majorStars, ...palace.minorStars, ...palace.adjectiveStars]
      return {
        宮位: palace.name,
        地支: palace.earthlyBranch,
        主星: palace.majorStars.map(formatStar),
        輔星: palace.minorStars.map(formatStar),
        煞星: palace.adjectiveStars.map(formatStar),
        四化: collectMutagens(allStars),
        廟旺: palace.majorStars
          .map((star) => (star.brightness ? `${star.name}:${star.brightness}` : star.name))
          .join('、'),
      }
    })
}

export function formatPalaceData(allPalaces: Record<string, { name: string; branch?: string; earthlyBranch?: string; majorStars?: unknown[]; minorStars?: unknown[]; badStars?: unknown[]; adjectiveStars?: unknown[]; transformations?: unknown[]; intensity?: string }>) {
  const targetPalaces = [...TARGET_PALACES]

  const filteredData = Object.keys(allPalaces)
    .filter((key) => targetPalaces.includes(allPalaces[key].name))
    .map((key) => {
      const p = allPalaces[key]
      return {
        宮位: p.name,
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
