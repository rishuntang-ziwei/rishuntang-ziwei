// utils/aiFormatter.ts

export function formatPalaceData(allPalaces: any) {
  // 篩選出命宮、事業宮、夫妻宮
  const targetPalaces = ['命宮', '官祿宮', '夫妻宮'];

  const filteredData = Object.keys(allPalaces)
    .filter((key) => targetPalaces.includes(allPalaces[key].name))
    .map((key) => {
      const p = allPalaces[key];
      return {
        宮位: p.name,
        地支: p.branch,
        主星: p.majorStars || [],
        輔星: p.minorStars || [],
        煞星: p.badStars || [],
        四化: p.transformations || [],
        廟旺: p.intensity || '',
      };
    });

  return JSON.stringify(filteredData, null, 2);
}
