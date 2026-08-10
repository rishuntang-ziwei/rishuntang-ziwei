const TARGET_PALACE_KEYS = [
  { name: '命宮', label: '命宮' },
  { name: '官祿', label: '事業宮（官祿）' },
  { name: '夫妻', label: '夫妻宮' },
]

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

function formatPalaceEntry(astrolabe, palace, label) {
  const allStars = [...palace.majorStars, ...palace.minorStars, ...palace.adjectiveStars]
  const entry = {
    宮位: label,
    地支: palace.earthlyBranch,
    主星: palace.majorStars.map(formatStar),
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

export function formatPalaceDataFromAstrolabe(astrolabe) {
  const byName = new Map(astrolabe.palaces.map((palace) => [palace.name, palace]))
  return TARGET_PALACE_KEYS.map(({ name, label }) => {
    const palace = byName.get(name)
    return palace ? formatPalaceEntry(astrolabe, palace, label) : null
  }).filter(Boolean)
}
