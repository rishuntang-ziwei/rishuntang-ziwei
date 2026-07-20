import type { IFunctionalPalace } from 'iztro/lib/astro/FunctionalPalace'
import type { IFunctionalHoroscope } from 'iztro/lib/astro/FunctionalHoroscope'
import type FunctionalAstrolabe from 'iztro/lib/astro/FunctionalAstrolabe'
import { majorBrightnessForDisplay } from '../lib/brightness'
import { formatPalaceName, shouldShowDecadal, sortMajorStars, splitPalaceMinors } from '../lib/constants'
import {
  type ChartMode,
  getDisplayMutagen,
  getScopePalaceName,
  type YearlyDisplayOptions,
  type YearlyMonthlyEntry,
} from '../lib/horoscope'
import { StarDisplay } from './StarDisplay'

interface PalaceCellProps {
  palace: IFunctionalPalace
  astrolabe: FunctionalAstrolabe
  highlight?: boolean
  focused?: boolean
  footerDimmed?: boolean
  chartMode?: ChartMode
  horoscope?: IFunctionalHoroscope | null
  activeDecadalIndex?: number
  onDecadalSelect?: (palace: IFunctionalPalace) => void
  yearlyMonthlyEntry?: YearlyMonthlyEntry | null
  yearlyDailyDays?: number[]
  activeYearlyMonth?: number
  yearlyDisplayOptions?: YearlyDisplayOptions
  isActiveMonthlyPalace?: boolean
  ageBadge?: number | null
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
  astrolabe,
  highlight,
  focused,
  footerDimmed,
  chartMode = 'origin',
  horoscope = null,
  activeDecadalIndex = -1,
  onDecadalSelect,
  yearlyMonthlyEntry = null,
  yearlyDailyDays,
  activeYearlyMonth,
  yearlyDisplayOptions,
  isActiveMonthlyPalace = false,
  ageBadge = null,
}: PalaceCellProps) {
  const { leftPurple, leftGreen, rightGreen } = splitPalaceMinors([
    ...palace.minorStars.map((s) => ({ name: s.name, mutagen: s.mutagen })),
    ...palace.adjectiveStars.map((s) => ({ name: s.name, mutagen: s.mutagen })),
  ])

  const mapStar = (s: { name: string; mutagen?: string; brightness?: string }) =>
    mapStarForDisplay(s, chartMode, horoscope)

  const displayPalaceName = getScopePalaceName(
    horoscope,
    palace.index,
    chartMode,
    palace.name,
    yearlyDisplayOptions,
  )

  const showDecadalAge = chartMode === 'origin' || chartMode === 'decadal'
  const decadalRange =
    showDecadalAge && palace.decadal && shouldShowDecadal(palace.decadal.range)
      ? palace.decadal.range
      : null
  const isActiveDecadal =
    chartMode === 'decadal' && activeDecadalIndex >= 0 && palace.index === activeDecadalIndex

  return (
    <div
      className={`palace-cell ${highlight ? 'highlight' : ''} ${focused ? 'focus-palace' : ''} ${isActiveMonthlyPalace ? 'active-monthly-palace' : ''}`}
    >
      {palace.isBodyPalace && chartMode === 'origin' && <span className="body-badge">身</span>}

      {yearlyDailyDays && yearlyDailyDays.length > 0 && (
        <div className="daily-days">{yearlyDailyDays.join(', ')}</div>
      )}

      <div className="palace-stars">
        <div className="stars-left">
          <div className="stars-row stars-row-1" aria-hidden={leftPurple.length === 0}>
            <StarDisplay variant="left-purple" stars={leftPurple.map(mapStar)} chartMode={chartMode} />
          </div>
          <div className="stars-row stars-row-2">
            <StarDisplay variant="left-green" stars={leftGreen.map(mapStar)} chartMode={chartMode} />
          </div>
          {ageBadge != null && (
            <span className="mutagen-box palace-age-badge" aria-label={`虛歲 ${ageBadge}`}>
              {ageBadge}
            </span>
          )}
        </div>
        <div className="stars-right">
          <StarDisplay variant="right-green" stars={rightGreen.map(mapStar)} chartMode={chartMode} />
          {palace.majorStars.length > 0 ? (
            <StarDisplay
              variant="major"
              stars={sortMajorStars(palace.majorStars).map((s) => ({
                ...mapStar(s),
                brightness: majorBrightnessForDisplay(
                  astrolabe,
                  chartMode,
                  palace.earthlyBranch,
                  s.name,
                  s.brightness,
                ),
              }))}
              chartMode={chartMode}
            />
          ) : (
            <span className="major-star-slot" aria-hidden="true">
              <span className="star-vcol major">
                <span className="vcol-inner">
                  <span className="vname">空</span>
                  <span className="vbright">空</span>
                </span>
              </span>
            </span>
          )}
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
          <span className="palace-name">
            {chartMode === 'yearly' && yearlyMonthlyEntry && (
              <span className="monthly-badges">
                <span
                  className={`monthly-badge ${activeYearlyMonth !== undefined && yearlyMonthlyEntry.month === activeYearlyMonth ? 'active' : ''}`}
                  title={`${yearlyMonthlyEntry.month}月 ${yearlyMonthlyEntry.gz}`}
                >
                  {yearlyMonthlyEntry.month}
                </span>
              </span>
            )}
            ({formatPalaceName(displayPalaceName)})
          </span>
          <span className="gz-zhi">{palace.earthlyBranch}</span>
        </div>
      </div>
    </div>
  )
}
