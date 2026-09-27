import {
  WUXING_COLORS,
  WUXING_ORDER,
  buildWuxingPanel,
  countBaziElements,
  getFormationAdvice,
} from '../../vendor/wuxing-panel.mjs?v=20260928j';

const STEM_ELEMENT = {
  甲: '木', 乙: '木', 丙: '火', 丁: '火', 戊: '土',
  己: '土', 庚: '金', 辛: '金', 壬: '水', 癸: '水',
};

export { countBaziElements, getFormationAdvice, WUXING_COLORS, WUXING_ORDER };

const TEMPLE_PHOTO_LEFT = './assets/temple-guanyin.png';
const TEMPLE_PHOTO_RIGHT = './assets/temple-sanqing.png';

export function dayMasterElement(chineseDate) {
  const daily = chineseDate?.daily;
  if (!daily?.[0]) return null;
  return STEM_ELEMENT[daily[0]] || null;
}

export function formatBazi(chineseDate) {
  if (!chineseDate) return '';
  const keys = ['yearly', 'monthly', 'daily', 'hourly'];
  return keys.map((key) => chineseDate[key] || '　').join(' ');
}

const TIME_BRANCH = {
  0: '早子',
  1: '丑',
  2: '寅',
  3: '卯',
  4: '辰',
  5: '巳',
  6: '午',
  7: '未',
  8: '申',
  9: '酉',
  10: '戌',
  11: '亥',
  12: '晚子',
};

export function formatSolarBirthParts(date, timeIndex) {
  const [y, m, d] = date.split('-');
  const branch = TIME_BRANCH[timeIndex] ?? '';
  return {
    label: '生辰 西元',
    year: `${Number(y)}年`,
    md: `${String(Number(m)).padStart(2, '0')}月${String(Number(d)).padStart(2, '0')}日`,
    time: `${branch}時`,
  };
}

export function formatLunarBirthParts(astrolabe, timeIndex) {
  let lunar = astrolabe?.lunarDate?.trim() ?? '';
  if (lunar && !lunar.endsWith('日')) lunar += '日';
  const branch = TIME_BRANCH[timeIndex] ?? astrolabe?.rawDates?.chineseDate?.hourly?.[1] ?? '';
  const yearMatch = lunar.match(/^(.+?年)/);
  const year = yearMatch?.[1] ?? '';
  const md = year ? lunar.slice(year.length) : lunar;
  return {
    label: '農曆',
    year,
    md,
    time: `${branch}時`,
  };
}

export function formatSolarBirthLine(date, timeIndex) {
  const { label, year, md, time } = formatSolarBirthParts(date, timeIndex);
  return `${label} ${year}${md}${time}`;
}

export function formatLunarBirthLine(astrolabe, timeIndex) {
  const { label, year, md, time } = formatLunarBirthParts(astrolabe, timeIndex);
  return `${label} ${year}${md}${time}`;
}

function formatSolarBirthCompact(solarBirth) {
  if (!solarBirth) return '';
  return `${solarBirth.year}${solarBirth.md}${solarBirth.time}`;
}

function buildWuxingHalf(data) {
  const {
    counts,
    advice,
    markerId = 'bracelet-wuxing-arrow',
    displayName = '',
    solarBirth,
  } = data;

  const wuxingHtml = buildWuxingPanel(counts, {
    title: '',
    showSummary: false,
    numbersOnly: false,
    equalCenterRadius: false,
    showCycleLabels: false,
    scale: 1.04,
    textScale: 1.0,
    centerX: 98,
    centerYOffset: -8,
    highlightFrom: advice.from,
    highlightTo: advice.to,
    dimOthers: false,
    vivid: true,
    markerId,
    highlightNodeStroke: false,
  });

  const identityName = displayName
    ? `<span class="panel-name-inline">${displayName}</span>`
    : '';
  const identityBirth = solarBirth
    ? `<span class="panel-birth-inline">${formatSolarBirthCompact(solarBirth)}</span>`
    : '';
  const identityRow = (identityName || identityBirth)
    ? `<p class="panel-identity-row">${identityName}${identityBirth}</p>`
    : '<p class="panel-identity-row panel-identity-row-empty" aria-hidden="true">　</p>';

  return `
    <div class="card-panel card-panel-wuxing">
      <header class="panel-head">
        <p class="panel-brand-row">
          <span class="panel-brand">國際日舜堂</span>
          <span class="panel-tagline">五行相生開運手環</span>
        </p>
        ${identityRow}
      </header>
      <div class="panel-body">
        <div class="panel-diagram">
          <div class="panel-wuxing">${wuxingHtml}</div>
        </div>
        <aside class="panel-aside">
          <p class="panel-phrase panel-phrase-large"><span class="panel-phrase-blank"></span>生</p>
          <div class="panel-foot">
            <p class="panel-wear-guide">本靈能手環可全天配戴或睡眠時配戴，忌水，請洗手或洗澡時先取下，並且不可與其他任何物品(如手錶或其他手環)戴在同一隻手上。</p>
            <div class="panel-wear-colors-block">
              <p class="panel-wear-colors">先戴<span class="panel-wear-blank">　　　</span>色，</p>
              <p class="panel-wear-colors">再戴<span class="panel-wear-blank">　　　</span>色。</p>
            </div>
          </div>
        </aside>
      </div>
    </div>`;
}

function buildBlessingHalf() {
  return `
    <div class="card-panel card-panel-bless">
      <header class="bless-head">
        <div class="bless-title-grid">
          <p class="bless-line bless-line-place">玉旨清道院</p>
          <div class="bless-title-right">
            <p class="bless-line bless-line-primary">觀世音菩薩</p>
            <p class="bless-line bless-line-secondary">三清道祖</p>
          </div>
          <p class="bless-line bless-line-power">靈能加持</p>
        </div>
      </header>
      <div class="bless-photo-wrap">
        <img class="bless-photo" src="${TEMPLE_PHOTO_LEFT}" alt="玉旨清道院觀世音法壇（左）" />
        <img class="bless-photo" src="${TEMPLE_PHOTO_RIGHT}" alt="三清道祖法壇（右）" />
      </div>
      <footer class="bless-foot">
        <p class="bless-line bless-line-consecrate">道旨仁居士川益導師開光</p>
      </footer>
    </div>`;
}

export function buildBraceletCard(data) {
  return `
    <article class="print-card print-card-landscape" data-side="card">
      <div class="card-trim-guide" aria-hidden="true"></div>
      <div class="card-split">
        ${buildWuxingHalf(data)}
        <div class="card-divider" aria-hidden="true"></div>
        ${buildBlessingHalf()}
      </div>
    </article>`;
}

/** 螢幕預覽一張；列印為 A4 直式單頁，圖卡在上半部 */
export function buildBraceletPrintSheet(data) {
  return `
    <div class="print-sheet">
      <div class="print-sheet-top">
        ${buildBraceletCard({ ...data, markerId: `bracelet-wuxing-${Date.now()}` })}
      </div>
      <div class="print-sheet-bottom" aria-hidden="true"></div>
    </div>`;
}

/** @deprecated 保留舊名稱供 app 相容 */
export function buildBraceletCardPair(data) {
  return buildBraceletPrintSheet(data);
}
