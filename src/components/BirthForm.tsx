import type { BirthInput, CalendarType, Gender, InitialChartType } from '../lib/astrolabe'
import { currentGregorianYear, todaySolarDate } from '../lib/astrolabe'
import { TIME_OPTIONS } from '../lib/constants'

interface BirthFormProps {
  input: BirthInput
  onChange: (input: BirthInput) => void
  onSubmit: () => void
  error?: string
}

function parseLunarDate(date: string): { y: number | ''; m: number | ''; d: number | '' } {
  const [y, m, d] = date.split('-')
  return {
    y: y ? Number(y) : '',
    m: m ? Number(m) : '',
    d: d ? Number(d) : '',
  }
}

export function BirthForm({ input, onChange, onSubmit, error }: BirthFormProps) {
  const lunar = parseLunarDate(input.date)
  const isLunar = input.calendarType === 'lunar'

  const update = <K extends keyof BirthInput>(key: K, value: BirthInput[K]) => {
    onChange({ ...input, [key]: value })
  }

  const updateLunar = (y: number | '', m: number | '', d: number | '') => {
    if (y === '' || m === '' || d === '') {
      onChange({ ...input, calendarType: 'lunar', date: '' })
      return
    }
    onChange({ ...input, calendarType: 'lunar', date: `${y}-${m}-${d}` })
  }

  return (
    <form
      className="birth-form"
      autoComplete="off"
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit()
      }}
    >
      <h2>排盤資料</h2>

      <div className="form-row">
        <label htmlFor="name">姓名</label>
        <input
          id="name"
          type="text"
          value={input.name}
          placeholder="請輸入姓名"
          autoComplete="off"
          onChange={(e) => update('name', e.target.value)}
        />
      </div>

      <div className="form-row">
        <label>性別</label>
        <div className="radio-group">
          {(['男', '女'] as Gender[]).map((g) => (
            <label key={g} className="radio-label">
              <input
                type="radio"
                name="gender"
                checked={input.gender === g}
                onChange={() => update('gender', g)}
              />
              {g}
            </label>
          ))}
        </div>
      </div>

      <div className="form-row">
        <label>曆法</label>
        <div className="radio-group">
          {(
            [
              { value: 'lunar', label: '農曆（陰曆）' },
              { value: 'solar', label: '國曆（陽曆）' },
            ] as { value: CalendarType; label: string }[]
          ).map(({ value, label }) => (
            <label key={value} className="radio-label">
              <input
                type="radio"
                name="calendar"
                checked={input.calendarType === value}
                onChange={() => {
                  if (value === 'solar') {
                    onChange({ ...input, calendarType: value, date: todaySolarDate() })
                  } else {
                    onChange({ ...input, calendarType: value, date: '' })
                  }
                }}
              />
              {label}
            </label>
          ))}
        </div>
      </div>

      <div className="form-row">
        <label>{isLunar ? '農曆出生日期' : '國曆出生日期'}</label>
        <p style={{ fontSize: '0.82rem', color: '#2e7d32', marginBottom: '0.4rem' }}>
          {isLunar ? '以農曆排盤（陰曆）' : '以國曆排盤（陽曆）'}
        </p>

        {isLunar ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
            <div>
              <label htmlFor="lunarYear">年</label>
              <input
                id="lunarYear"
                type="number"
                value={lunar.y}
                placeholder="年"
                min={1900}
                max={2100}
                onChange={(e) =>
                  updateLunar(
                    e.target.value === '' ? '' : Number(e.target.value),
                    lunar.m,
                    lunar.d,
                  )
                }
              />
            </div>
            <div>
              <label htmlFor="lunarMonth">月</label>
              <input
                id="lunarMonth"
                type="number"
                value={lunar.m}
                placeholder="月"
                min={1}
                max={12}
                onChange={(e) =>
                  updateLunar(
                    lunar.y,
                    e.target.value === '' ? '' : Number(e.target.value),
                    lunar.d,
                  )
                }
              />
            </div>
            <div>
              <label htmlFor="lunarDay">日</label>
              <input
                id="lunarDay"
                type="number"
                value={lunar.d}
                placeholder="日"
                min={1}
                max={30}
                onChange={(e) =>
                  updateLunar(
                    lunar.y,
                    lunar.m,
                    e.target.value === '' ? '' : Number(e.target.value),
                  )
                }
              />
            </div>
          </div>
        ) : (
          <input
            id="date"
            type="date"
            value={input.date}
            required
            onChange={(e) => update('date', e.target.value)}
          />
        )}
      </div>

      {isLunar && (
        <div className="form-row">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={input.isLeapMonth}
              onChange={(e) => update('isLeapMonth', e.target.checked)}
            />
            閏月
          </label>
        </div>
      )}

      <div className="form-row">
        <label>排盤類型</label>
        <div className="radio-group">
          {(
            [
              { value: 'natal', label: '本命命盤' },
              { value: 'yearly', label: '流年命盤' },
            ] as { value: InitialChartType; label: string }[]
          ).map(({ value, label }) => (
            <label key={value} className="radio-label">
              <input
                type="radio"
                name="chartType"
                checked={input.initialChartType === value}
                onChange={() => update('initialChartType', value)}
              />
              {label}
            </label>
          ))}
        </div>
      </div>

      {input.initialChartType === 'yearly' && (
        <div className="form-row">
          <label htmlFor="yearlyYear">流年年份（西元）</label>
          <input
            id="yearlyYear"
            type="number"
            min={1900}
            max={2100}
            value={input.yearlyYear}
            onChange={(e) => update('yearlyYear', Number(e.target.value) || currentGregorianYear())}
          />
        </div>
      )}

      <div className="form-row">
        <label htmlFor="time">出生時辰</label>
        <select
          id="time"
          value={input.timeIndex}
          onChange={(e) =>
            update('timeIndex', e.target.value === '' ? '' : Number(e.target.value))
          }
        >
          <option value="">請選擇時辰</option>
          {TIME_OPTIONS.map((t) => (
            <option key={t.index} value={t.index}>
              {t.label}（{t.range}）
            </option>
          ))}
        </select>
      </div>

      {error && <p className="form-error">{error}</p>}

      <button type="submit" className="submit-btn">
        開始排盤
      </button>
    </form>
  )
}
