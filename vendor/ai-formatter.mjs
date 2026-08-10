const TARGET_PALACES = ['命宮', '官祿宮', '夫妻宮']

function formatStar(star) {
  return {
    name: star.name,
    brightness: star.brightness || '',
    mutagen: star.mutagen || '',
  }
}

function collectMutagens(stars) {
  return stars.filter((star) => star.mutagen).map((star) => `${star.name}${star.mutagen}`)
}

export function formatPalaceDataFromAstrolabe(astrolabe) {
  return astrolabe.palaces
    .filter((palace) => TARGET_PALACES.includes(palace.name))
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
