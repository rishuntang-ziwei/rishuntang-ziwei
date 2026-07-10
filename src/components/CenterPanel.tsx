import type FunctionalAstrolabe from 'iztro/lib/astro/FunctionalAstrolabe'
import type { IFunctionalHoroscope } from 'iztro/lib/astro/FunctionalHoroscope'
import type { CalendarType, InitialChartType } from '../lib/astrolabe'
import {
  daysInLunarMonth,
  getYearStemBranch,
} from '../lib/astrolabe'
import {
  type ChartMode,
  chartModeTag,
  chartModeTitle,
  getLunarPartsFromHoroscopeDate,
} from '../lib/horoscope'

interface CenterPanelProps {
  name: string
  astrolabe: FunctionalAstrolabe
  horoscope: IFunctionalHoroscope
  calendar: CalendarType
  birthDate: string
  initialChartType: InitialChartType
  chartMode: ChartMode
  horoscopeDate: string
  onHoroscopeDateChange: (date: string) => void
  yearlyYear: number
  onYearlyYearChange: (year: number) => void
  showYearlyDaily: boolean
  onShowYearlyDailyChange: (value: boolean) => void
  onBackToNatal?: () => void
}

export function CenterPanel({
  name,
  astrolabe,
  horoscope,
  calendar,
  birthDate,
  initialChartType,
  chartMode,
  horoscopeDate,
  onHoroscopeDateChange,
  yearlyYear,
  onYearlyYearChange,
  showYearlyDaily,
  onShowYearlyDailyChange,
  onBackToNatal,
}: CenterPanelProps) {
  const birth = centerBirthText(astrolabe, calendar, birthDate)
  const age = horoscope.age.nominalAge
  const activeLunar = getLunarPartsFromHoroscopeDate(horoscopeDate)
  const daysInActiveLunarMonth = daysInLunarMonth(
    activeLunar.year,
    activeLunar.month,
    activeLunar.isLeap,
  )

  const scopeItem = chartMode === 'decadal' ? horoscope.decadal : chartMode === 'yearly' ? horoscope.yearly : null
  const scopeGz = scopeItem ? `${scopeItem.heavenlyStem}${scopeItem.earthlyBranch}` : ''
  const decadalRange =
    chartMode === 'decadal' && horoscope.decadal.index >= 0
      ? astrolabe.palace(horoscope.decadal.index)?.decadal?.range
      : null

  return (
    <div className="center">
      <div className="center-top-right">
        {initialChartType === 'yearly' ? (
          <>
            <label className="center-control-row">
              <span>流年年份</span>
              <input
                type="number"
                min={1900}
                max={2100}
                value={yearlyYear}
                onChange={(e) => {
                  const year = Number(e.target.value)
                  if (year >= 1900 && year <= 2100) {
                    onYearlyYearChange(year)
                  }
                }}
              />
            </label>
            <button
              type="button"
              className={`center-toggle-btn ${showYearlyDaily ? 'active' : ''}`}
              onClick={() => onShowYearlyDailyChange(!showYearlyDaily)}
            >
              {showYearlyDaily ? '隱藏流日' : '顯示流日'}
            </button>
          </>
        ) : (
          <label className="center-control-row">
            <span>論命日期</span>
            <input
              type="date"
              value={horoscopeDate}
              onChange={(e) => onHoroscopeDateChange(e.target.value)}
            />
          </label>
        )}
      </div>

      <div className="center-body">
        <div className="center-info">
          <div>
            {onBackToNatal && (
              <button type="button" className="back-to-natal" onClick={onBackToNatal}>
                回到本命盤
              </button>
            )}

            {scopeGz && (
              <div className="center-scope">
                {chartModeTag(chartMode)}：{scopeGz}
                {decadalRange && (
                  <span className="scope-range">
                    {' '}
                    ({decadalRange[0]}–{decadalRange[1]} 歲)
                  </span>
                )}
              </div>
            )}
            {chartMode === 'yearly' && (
              <div className="center-scope center-flow-scope">
                <div>
                  流月：{horoscope.monthly.heavenlyStem}
                  {horoscope.monthly.earthlyBranch}（農曆 {activeLunar.month} 月）
                </div>
                {showYearlyDaily && (
                  <div className="center-control-meta">
                    流日：農曆 {activeLunar.month} 月 1–{daysInActiveLunarMonth} 日分布
                  </div>
                )}
              </div>
            )}
            <div className="center-birth">
              <div>{birth.line1}</div>
              <div>{birth.line2}</div>
              {birth.lunarNote && <div className="lunar-note">{birth.lunarNote}</div>}
            </div>
            <div className="center-age">
              {new Date(horoscopeDate + 'T12:00:00').getFullYear()}
              <br />
              {age} 歲
            </div>
          </div>
          <div className="center-brand">國際日舜堂</div>
        </div>

        <div className="center-vtext">
          <div className="vtext tag">{chartModeTag(chartMode)}</div>
          <div className="vtext name">{name || '匿名'}</div>
          <div className="vtext title">{chartModeTitle(chartMode)}</div>
        </div>
      </div>
    </div>
  )
}

function centerBirthText(
  astrolabe: FunctionalAstrolabe,
  calendar: CalendarType,
  birthDate: string,
) {
  const { hourly } = astrolabe.rawDates.chineseDate
  const gz = getYearStemBranch(astrolabe)
  const hour = hourly[1] || '寅'

  const lm = astrolabe.lunarDate.match(/([正二三四五六七八九十冬臘閏]+)月([初十廿三]*[一二三四五六七八九十]+)/)
  const lunarLine = lm ? `農曆 ${lm[1]}月${lm[2]}` : ''

  if (calendar === 'lunar') {
    const [y, m, d] = birthDate.split('-').map(Number)
    return {
      line1: `${y} ${gz} 年`,
      line2: `${m} 月 ${d} 日 ${hour} 時`,
      lunarNote: '',
    }
  }

  const [sy, sm, sd] = astrolabe.solarDate.split('-').map(Number)
  return {
    line1: `${sy} ${gz} 年`,
    line2: `${sm} 月 ${sd} 日 ${hour} 時`,
    lunarNote: lunarLine,
  }
}
