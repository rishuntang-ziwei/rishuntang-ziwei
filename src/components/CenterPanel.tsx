import type FunctionalAstrolabe from 'iztro/lib/astro/FunctionalAstrolabe'
import type { IFunctionalHoroscope } from 'iztro/lib/astro/FunctionalHoroscope'
import type { CalendarType, InitialChartType } from '../lib/astrolabe'
import {
  daysInLunarMonth,
  formatBazi,
  formatLunarBirthLine,
} from '../lib/astrolabe'
import { buildWuxingPanel, countBaziElements } from '../../vendor/wuxing-panel.mjs'
import {
  type ChartMode,
  chartModeTag,
  chartModeTitle,
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
  yearlyMonthSelected?: boolean
  selectedFlowMonth?: number | null
  selectedFlowLunarYear?: number | null
  selectedFlowIsLeap?: boolean
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
  yearlyMonthSelected = false,
  selectedFlowMonth = null,
  selectedFlowLunarYear = null,
  selectedFlowIsLeap = false,
  onBackToNatal,
}: CenterPanelProps) {
  const birth = formatLunarBirthLine(astrolabe, calendar, birthDate)
  const baziLine = formatBazi(astrolabe)
  const age = horoscope.age.nominalAge
  const flowDaysInMonth =
    selectedFlowMonth != null && selectedFlowLunarYear != null
      ? daysInLunarMonth(selectedFlowLunarYear, selectedFlowMonth, selectedFlowIsLeap)
      : 0

  const scopeItem = chartMode === 'decadal' ? horoscope.decadal : chartMode === 'yearly' ? horoscope.yearly : null
  const scopeGz = scopeItem ? `${scopeItem.heavenlyStem}${scopeItem.earthlyBranch}` : ''
  const decadalRange =
    chartMode === 'decadal' && horoscope.decadal.index >= 0
      ? astrolabe.palace(horoscope.decadal.index)?.decadal?.range
      : null

  const wuxingHtml = buildWuxingPanel(countBaziElements(astrolabe.rawDates.chineseDate), {
    title: '',
    size: 'center',
    showSummary: false,
    markerId: 'center-wuxing-arrow',
  })

  return (
    <div className="center">
      <div className="center-header">
        <div className="center-top-left">
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
          {chartMode === 'yearly' && yearlyMonthSelected && selectedFlowMonth != null && (
            <div className="center-scope center-flow-scope">
              <div>
                流月：{horoscope.monthly.heavenlyStem}
                {horoscope.monthly.earthlyBranch}（農曆 {selectedFlowMonth} 月）
              </div>
              {showYearlyDaily && flowDaysInMonth > 0 && (
                <div className="center-control-meta">
                  流日：農曆 {selectedFlowMonth} 月 1–{flowDaysInMonth} 日分布
                </div>
              )}
            </div>
          )}
        </div>

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
                disabled={!yearlyMonthSelected}
                title={yearlyMonthSelected ? undefined : '請先雙擊宮位選擇流月'}
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
      </div>

      <div className="center-main">
        <div
          className="center-wuxing-cross"
          dangerouslySetInnerHTML={{ __html: wuxingHtml }}
        />

        <div className="center-right">
          <div className="center-birth">
            <div className="center-birth-line">{wrapCenterNums(birth)}</div>
            <div className="center-bazi-line">{baziLine}</div>
          </div>

          <div className="center-person">
            <div className="center-person-namecol">
              <div className="vtext name">{name || '匿名'}</div>
              <div className="center-age">
                <div className="center-age-year">
                  <span className="center-num">
                    {new Date(horoscopeDate + 'T12:00:00').getFullYear()}
                  </span>
                </div>
                <div className="center-age-value">
                  <span className="center-num">{age}</span> 歲
                </div>
              </div>
            </div>

            <div className="vtext title center-chart-title">{chartModeTitle(chartMode)}</div>
          </div>
        </div>
      </div>

      <div className="center-footer">
        <div className="center-brand">國際日舜堂</div>
      </div>
    </div>
  )
}

function wrapCenterNums(text: string) {
  return text.split(/(\d+)/).map((part, index) =>
    /^\d+$/.test(part) ? (
      <span key={`${part}-${index}`} className="center-num">
        {part}
      </span>
    ) : (
      part
    ),
  )
}
