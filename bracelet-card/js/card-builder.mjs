import {
  WUXING_COLORS,
  WUXING_ORDER,
  buildWuxingPanel,
  countBaziElements,
  getFormationAdvice,
} from '../../vendor/wuxing-panel.mjs?v=20260919';

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

export function formatSolarBirthLine(date, timeIndex) {
  const [y, m, d] = date.split('-');
  const branch = TIME_BRANCH[timeIndex] ?? '';
  return `生辰 西元 ${Number(y)}年${Number(m)}月${Number(d)}日${branch}時`;
}

export function formatLunarBirthLine(astrolabe, timeIndex) {
  let lunar = astrolabe?.lunarDate?.trim() ?? '';
  if (lunar && !lunar.endsWith('日')) lunar += '日';
  const branch = TIME_BRANCH[timeIndex] ?? astrolabe?.rawDates?.chineseDate?.hourly?.[1] ?? '';
  return `農曆 ${lunar}${branch}時`;
}

function buildWuxingHalf(data) {
  const {
    counts,
    advice,
    markerId = 'bracelet-wuxing-arrow',
    displayName = '',
    solarBirthLine = '',
    lunarBirthLine = '',
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
      水: {
        fill: '#1a1a1a',
        stroke: '#ffffff',
        strokeWidth: 1.4,
      },
      木: {
        fill: '#2db84a',
        stroke: '#ffffff',
        strokeWidth: 1,
      },
    },
  });

  const nameLine = displayName
    ? `<p class="panel-name">${displayName}</p>`
    : '<p class="panel-name panel-name-empty" aria-hidden="true">　</p>';

  return `
    <div class="card-panel card-panel-wuxing">
      <img class="panel-logo" src="${RISHUNTANG_LOGO}" alt="日舜堂" />
      <header class="panel-head">
        <p class="panel-brand">國際日舜堂</p>
        <p class="panel-tagline">五行相生開運手環</p>
        ${nameLine}
        <p class="panel-phrase">${advice.phrase}</p>
      </header>
      <div class="panel-diagram">
        <div class="panel-wuxing">${wuxingHtml}</div>
      </div>
      <footer class="panel-foot">
        <p class="panel-birth-solar">${solarBirthLine}</p>
        <p class="panel-birth-lunar">${lunarBirthLine}</p>
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
        <img class="bless-photo" src="${TEMPLE_PHOTO}" alt="道院開光法壇" />
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
