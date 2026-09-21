import {
  WUXING_COLORS,
  WUXING_ORDER,
  buildWuxingPanel,
  countBaziElements,
  getFormationAdvice,
} from '../../vendor/wuxing-panel.mjs?v=20260924b';

const STEM_ELEMENT = {
  甲: '木', 乙: '木', 丙: '火', 丁: '火', 戊: '土',
  己: '土', 庚: '金', 辛: '金', 壬: '水', 癸: '水',
};

export { countBaziElements, getFormationAdvice, WUXING_COLORS, WUXING_ORDER };

const TEMPLE_PHOTO = './assets/temple-altar.png';
const RISHUNTANG_LOGO = './assets/rishuntang-logo.png';

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

function renderBirthBlock(solarBirth, lunarBirth) {
  return `
      <div class="panel-birth-block">
        <p class="panel-birth-row">
          <span class="panel-birth-label">${solarBirth.label}</span>
          <span class="panel-birth-year">${solarBirth.year}</span>
          <span class="panel-birth-md">${solarBirth.md}</span>
          <span class="panel-birth-time">${solarBirth.time}</span>
        </p>
        <p class="panel-birth-row">
          <span class="panel-birth-label">${lunarBirth.label}</span>
          <span class="panel-birth-year">${lunarBirth.year}</span>
          <span class="panel-birth-md">${lunarBirth.md}</span>
          <span class="panel-birth-time">${lunarBirth.time}</span>
        </p>
      </div>`;
}

function buildWuxingHalf(data) {
  const {
    counts,
    advice,
    markerId = 'bracelet-wuxing-arrow',
    displayName = '',
    solarBirth,
    lunarBirth,
  } = data;

  const wuxingHtml = buildWuxingPanel(counts, {
    title: '',
    showSummary: false,
    numbersOnly: false,
    equalCenterRadius: false,
    showCycleLabels: false,
    scale: 1.04,
    textScale: 1.0,
    centerYOffset: -8,
    highlightFrom: advice.from,
    highlightTo: advice.to,
    dimOthers: false,
    vivid: true,
    markerId,
    highlightNodeStroke: false,
    nodeTextOverrides: {
      水: { fill: '#1a1a1a' },
      木: { fill: '#2db84a' },
    },
  });

  const nameLine = displayName
    ? `<p class="panel-name">${displayName}</p>`
    : '<p class="panel-name panel-name-empty" aria-hidden="true">　</p>';

  return `
    <div class="card-panel card-panel-wuxing">
      <img class="panel-logo" src="${RISHUNTANG_LOGO}" alt="日舜堂" />
      ${renderBirthBlock(solarBirth, lunarBirth)}
      <header class="panel-head">
        <p class="panel-brand">國際日舜堂</p>
        <p class="panel-tagline">五行相生開運手環</p>
        ${nameLine}
        <p class="panel-phrase panel-phrase-empty" aria-hidden="true">　</p>
      </header>
      <div class="panel-diagram">
        <div class="panel-wuxing">${wuxingHtml}</div>
      </div>
      <footer class="panel-foot">
        <p class="panel-wear-guide">本靈能手環可全天配戴或睡眠時配戴，忌水，請洗手或洗澡時先取下，並且不可與其他任何物品(如手錶或其他手環)戴在同一隻手上。先戴<span class="panel-wear-blank">　　　</span>色，再戴<span class="panel-wear-blank">　　　</span>色。</p>
      </footer>
    </div>`;
}

function buildBlessingHalf() {
  return `
    <div class="card-panel card-panel-bless">
      <header class="bless-head">
        <p class="bless-line bless-line-primary">玉旨清道院觀世音菩薩</p>
        <p class="bless-line bless-line-secondary">三清道祖</p>
      </header>
      <div class="bless-photo-wrap">
        <img class="bless-photo" src="${TEMPLE_PHOTO}" alt="道院開光法壇（左）" />
        <img class="bless-photo" src="${TEMPLE_PHOTO}" alt="道院開光法壇（右）" />
      </div>
      <footer class="bless-foot">
        <p class="bless-line bless-line-master">道旨日舜堂祖師爺姜太公子牙</p>
        <p class="bless-line bless-line-consecrate">道旨仁居士導師開光</p>
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

/** @deprecated 保留舊名稱供 app 相容 */
export function buildBraceletCardPair(data) {
  return buildBraceletCard(data);
}
