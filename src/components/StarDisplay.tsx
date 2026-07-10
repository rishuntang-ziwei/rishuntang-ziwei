import { formatBrightness } from '../lib/constants'
import type { ChartMode } from '../lib/horoscope'

interface StarItem {
  name: string
  brightness?: string
  mutagen?: string
  horoscopeMutagen?: string
}

export type StarDisplayVariant = 'major' | 'left-purple' | 'left-green' | 'right-green' | 'flow'

interface StarDisplayProps {
  stars: StarItem[]
  variant: StarDisplayVariant
  chartMode?: ChartMode
}

const VARIANT_CLASS: Record<StarDisplayVariant, string> = {
  major: 'major',
  'left-purple': 'p-sm',
  'left-green': 'g-sm',
  'right-green': 'g-lg',
  flow: 'flow',
}

function mutagenClass(mutagen: string): string {
  return { 祿: 'lu', 權: 'quan', 科: 'ke', 忌: 'ji' }[mutagen] ?? 'lu'
}

function MutagenBadge({
  mutagen,
  chartMode,
  natal,
}: {
  mutagen: string
  chartMode: ChartMode
  natal?: boolean
}) {
  if (natal) {
    return <span className={`mutagen-box ${mutagenClass(mutagen)}`}>{mutagen}</span>
  }
  if (chartMode === 'yearly') {
    return <span className={`mutagen-circle ${mutagenClass(mutagen)}`}>{mutagen}</span>
  }
  return (
    <span className={`mutagen-box horoscope-mutagen ${mutagenClass(mutagen)}`}>{mutagen}</span>
  )
}

export function StarDisplay({ stars, variant, chartMode = 'origin' }: StarDisplayProps) {
  if (stars.length === 0) return null

  const cls = VARIANT_CLASS[variant]

  return (
    <>
      {stars.map((star) => (
        <span key={star.name} className={`star-vcol ${cls}`}>
          <span className="vcol-inner">
            <span className="vname">{star.name}</span>
            {star.brightness && variant === 'major' && (
              <span className="vbright">{formatBrightness(star.brightness)}</span>
            )}
          </span>
          {star.mutagen && chartMode !== 'yearly' && (
            <MutagenBadge mutagen={star.mutagen} chartMode={chartMode} natal />
          )}
          {star.horoscopeMutagen && chartMode !== 'origin' && (
            <MutagenBadge mutagen={star.horoscopeMutagen} chartMode={chartMode} />
          )}
        </span>
      ))}
    </>
  )
}
