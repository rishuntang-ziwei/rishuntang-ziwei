import type { IFunctionalPalace } from 'iztro/lib/astro/FunctionalPalace'
import type { IFunctionalHoroscope } from 'iztro/lib/astro/FunctionalHoroscope'
import { formatPalaceName, shouldShowDecadal, splitPalaceMinors } from '../lib/constants'
import {
  type ChartMode,
  getDisplayMutagen,
  getScopePalaceName,
} from '../lib/horoscope'
import { StarDisplay } from './StarDisplay'

interface PalaceCellProps {
  palace: IFunctionalPalace
  highlight?: boolean
  focused?: boolean
  footerDimmed?: boolean
  chartMode?: ChartMode
  horoscope?: IFunctionalHoroscope | null
  activeDecadalIndex?: number
  onDecadalSelect?: (palace: IFunctionalPalace) => void
}

function mapStarForDisplay(
  star: { name: string; mutagen?: string; brightness?: string },
  chartMode: ChartMode,
  horoscope: IFunctionalHoroscope | null,
) {
  const tableMutagen = getDisplayMutagen(horoscope, chartMode, star.name)

  if (chartMode === 'yearly' || chartMode === 'decadal') {
    return {
      name: star.name,
      brightness: star.brightness,
      horoscopeMutagen: tableMutagen,
    }
  }

  return {
    name: star.name,
    brightness: star.brightness,
    mutagen: tableMutagen,
  }
}

export function PalaceCell({
  palace,
  highlight,
  focused,
  footerDimmed,
  chartMode = 'origin',
  horoscope = null,
  activeDecadalIndex = -1,
  onDecadalSelect,
}: PalaceCellProps) {
  const { leftPurple, leftGreen, rightGreen } = splitPalaceMinors([
    ...palace.minorStars.map((s) => ({ name: s.name, mutagen: s.mutagen })),
    ...palace.adjectiveStars.map((s) => ({ name: s.name, mutagen: s.mutagen })),
  ])

  const mapStar = (s: { name: string; mutagen?: string; brightness?: string }) =>
    mapStarForDisplay(s, chartMode, horoscope)

  const displayPalaceName = getScopePalaceName(horoscope, palace.index, chartMode, palace.name)

  const showDecadalAge = chartMode === 'origin' || chartMode === 'decadal'
  const decadalRange =
    showDecadalAge && palace.decadal && shouldShowDecadal(palace.decadal.range)
      ? palace.decadal.range
      : null
  const isActiveDecadal =
    chartMode === 'decadal' && activeDecadalIndex >= 0 && palace.index === activeDecadalIndex

  return (
    <div className={`palace-cell ${highlight ? 'highlight' : ''} ${focused ? 'focus-palace' : ''}`}>
      {palace.isBodyPalace && chartMode === 'origin' && <span className="body-badge">身</span>}

      <div className="palace-stars">
        <div className="stars-left">
          <div className="stars-row stars-row-1" aria-hidden={leftPurple.length === 0}>
            <StarDisplay variant="left-purple" stars={leftPurple.map(mapStar)} chartMode={chartMode} />
          </div>
          <div className="stars-row stars-row-2">
            <StarDisplay variant="left-green" stars={leftGreen.map(mapStar)} chartMode={chartMode} />
          </div>
        </div>
        <div className="stars-right">
          <StarDisplay variant="right-green" stars={rightGreen.map(mapStar)} chartMode={chartMode} />
          <StarDisplay variant="major" stars={palace.majorStars.map(mapStar)} chartMode={chartMode} />
        </div>
      </div>

      <div className={`palace-bottom ${footerDimmed ? 'palace-footer-dimmed' : ''}`}>
        <div className="palace-footer-grid">
          {decadalRange ? (
            <button
              type="button"
              className={`decadal-range ${isActiveDecadal ? 'active' : ''}`}
              onClick={(e) => {
                e.stopPropagation()
                onDecadalSelect?.(palace)
              }}
            >
              {decadalRange[0]} - {decadalRange[1]}
            </button>
          ) : (
            <span className="decadal-range" />
          )}
          <span className="gz-gan">{palace.heavenlyStem}</span>
          <span className="palace-name">({formatPalaceName(displayPalaceName)})</span>
          <span className="gz-zhi">{palace.earthlyBranch}</span>
        </div>
      </div>
    </div>
  )
}
