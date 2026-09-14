import {
  WUXING_COLORS,
  WUXING_ORDER,
  buildWuxingPanel,
  countBaziElements,
  getSupplementAdvice,
} from '../../vendor/wuxing-panel.mjs';

const STEM_ELEMENT = {
  甲: '木', 乙: '木', 丙: '火', 丁: '火', 戊: '土',
  己: '土', 庚: '金', 辛: '金', 壬: '水', 癸: '水',
};

export { countBaziElements, getSupplementAdvice, WUXING_COLORS, WUXING_ORDER };

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

/** 乾天、坤地：卦象＋意象圖案，淡化置於背景 */
function buildQiankunBackground(prefix) {
  const rays = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330]
    .map((deg) => {
      const rad = (deg * Math.PI) / 180;
      const x2 = 33 + Math.cos(rad) * 14;
      const y2 = 14 + Math.sin(rad) * 9;
      return `<line x1="33" y1="14" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" />`;
    })
    .join('');

  return `
      <defs>
        <linearGradient id="${prefix}sky" x1="33" y1="3" x2="33" y2="33" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stop-color="#c9a227" stop-opacity="0.14" />
          <stop offset="100%" stop-color="#fffef8" stop-opacity="0" />
        </linearGradient>
        <linearGradient id="${prefix}earth" x1="33" y1="63" x2="33" y2="33" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stop-color="#8b6914" stop-opacity="0.16" />
          <stop offset="100%" stop-color="#fffef8" stop-opacity="0" />
        </linearGradient>
        <clipPath id="${prefix}trim">
          <rect x="3" y="3" width="60" height="60" rx="1.6" ry="1.6" />
        </clipPath>
      </defs>
      <g clip-path="url(#${prefix}trim)" class="qk-bg">
        <rect x="3" y="3" width="60" height="30" fill="url(#${prefix}sky)" />
        <rect x="3" y="33" width="60" height="30" fill="url(#${prefix}earth)" />
        <g opacity="0.11" stroke="#c9a227" stroke-width="0.22" fill="none">
          ${rays}
        </g>
        <circle cx="33" cy="14" r="4.2" fill="#c9a227" opacity="0.07" />
        <g opacity="0.09" fill="#1a1208">
          <ellipse cx="22" cy="20" rx="5.5" ry="2.2" />
          <ellipse cx="30" cy="19" rx="4.5" ry="1.8" />
          <ellipse cx="40" cy="20.5" rx="5" ry="2" />
        </g>
        <g opacity="0.12" stroke="#1a1208" stroke-width="0.85" stroke-linecap="round">
          <line x1="22" y1="11.5" x2="44" y2="11.5" />
          <line x1="22" y1="15.5" x2="44" y2="15.5" />
          <line x1="22" y1="19.5" x2="44" y2="19.5" />
        </g>
        <g opacity="0.1" fill="#8b6914">
          <path d="M3 54 Q14 49 24 52 Q33 55 42 51 Q52 48 63 53 L63 63 L3 63 Z" />
          <path d="M3 58 Q18 54 33 57 Q48 60 63 56 L63 63 L3 63 Z" opacity="0.7" />
        </g>
        <g opacity="0.09" stroke="#5c4033" stroke-width="0.35" fill="none">
          <path d="M6 56 H60" />
          <path d="M6 59 H60" />
          <path d="M6 62 H60" />
        </g>
        <g opacity="0.12" stroke="#1a1208" stroke-width="0.85" stroke-linecap="round">
          <line x1="22" y1="47.5" x2="29" y2="47.5" />
          <line x1="37" y1="47.5" x2="44" y2="47.5" />
          <line x1="22" y1="51.5" x2="44" y2="51.5" />
          <line x1="22" y1="55.5" x2="29" y2="55.5" />
          <line x1="37" y1="55.5" x2="44" y2="55.5" />
        </g>
      </g>`;
}

/** 66×66 畫布（含 3mm 出血）；邊框與底色延伸至裁切外 */
function buildSquareFrameSvg() {
  return `
    <svg class="square-frame" viewBox="0 0 66 66" aria-hidden="true">
      <rect width="66" height="66" fill="#fffef8" />
      ${buildQiankunBackground('front-qk')}
      <rect x="0.4" y="0.4" width="65.2" height="65.2" fill="none" stroke="#c9a227" stroke-width="0.22" opacity="0.55" />
      <g stroke="#c9a227" stroke-width="0.28" fill="none" opacity="0.45">
        <path d="M0 0 L5 0 L0 5" />
        <path d="M66 0 L61 0 L66 5" />
        <path d="M0 66 L5 66 L0 61" />
        <path d="M66 66 L61 66 L66 61" />
      </g>
      <rect x="3" y="3" width="60" height="60" rx="1.6" ry="1.6"
        fill="none" stroke="#1a1208" stroke-width="0.55" />
      <rect x="4.2" y="4.2" width="57.6" height="57.6" rx="1.2" ry="1.2"
        fill="none" stroke="#c9a227" stroke-width="0.28" />
      <g stroke="#1a1208" stroke-width="0.32" fill="none" opacity="0.85">
        <path d="M4.2 4.2 L8.5 4.2 L4.2 8.5" />
        <path d="M61.8 4.2 L57.5 4.2 L61.8 8.5" />
        <path d="M4.2 61.8 L8.5 61.8 L4.2 57.5" />
        <path d="M61.8 61.8 L57.5 61.8 L61.8 57.5" />
      </g>
    </svg>`;
}

export function buildBraceletCardFront(data) {
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
    scale: 1.06,
    textScale: 0.92,
    centerYOffset: -16,
    highlightFrom: advice.parent,
    highlightTo: advice.lacking,
    dimOthers: !advice.balanced,
    vivid: true,
    markerId,
  });

  const nameLine = displayName
    ? `<p class="card-name">${displayName}</p>`
    : '';

  return `
    <article class="print-card print-card-front" data-side="front">
      <div class="card-trim-guide" aria-hidden="true"></div>
      <div class="card-frame-wrap">
        ${buildSquareFrameSvg()}
        <div class="card-inner">
          <header class="card-header">
            <p class="card-brand">日舜堂</p>
            <p class="card-tagline">五行相生補運</p>
            ${nameLine}
            <p class="card-phrase">${advice.phrase}</p>
            <p class="card-subtitle">${advice.subtitle}</p>
          </header>
          <div class="card-diagram">
            <div class="card-wuxing">${wuxingHtml}</div>
          </div>
          <footer class="card-footer">
            <p class="card-birth-solar">${solarBirthLine}</p>
            <p class="card-birth-lunar">${lunarBirthLine}</p>
          </footer>
        </div>
      </div>
    </article>`;
}

/** 背面中央：雙圓環＋五行色珠（襯托加持印章，不含太極以免重疊） */
function buildBackWuxingRing() {
  const cx = 33;
  const cy = 37.5;
  const ringR = 13.2;
  const beads = [
    { color: '#1a1a1a', stroke: '#333', angle: -90 },
    { color: '#2db84a', stroke: '#1a1a1a', angle: -18 },
    { color: '#e53935', stroke: '#1a1a1a', angle: 54 },
    { color: '#9a7b4f', stroke: '#1a1a1a', angle: 126 },
    { color: '#ffffff', stroke: '#1a1a1a', angle: 198 },
  ]
    .map(({ color, stroke, angle }) => {
      const rad = (angle * Math.PI) / 180;
      const x = cx + Math.cos(rad) * ringR;
      const y = cy + Math.sin(rad) * ringR;
      return `<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="1.35" fill="${color}" stroke="${stroke}" stroke-width="0.22" />`;
    })
    .join('');

  return `
      <g class="back-wuxing-ring" opacity="0.92">
        <circle cx="${cx}" cy="${cy}" r="${ringR}" fill="none" stroke="#1a1208" stroke-width="0.24" opacity="0.42" />
        <circle cx="${cx}" cy="${cy}" r="${(ringR - 2.8).toFixed(1)}" fill="none" stroke="#1a1208" stroke-width="0.2"
          stroke-dasharray="0.7 0.9" opacity="0.38" />
        ${beads}
      </g>`;
}

function buildBlessingBackArt() {
  return `
    <svg class="back-art" viewBox="0 0 66 66" aria-hidden="true" preserveAspectRatio="xMidYMid meet">
      <rect width="66" height="66" fill="#fffef8" />
      ${buildQiankunBackground('back-qk')}
      ${buildBackWuxingRing()}
      <rect x="0.4" y="0.4" width="65.2" height="65.2" fill="none" stroke="#c9a227" stroke-width="0.22" opacity="0.55" />
      <g stroke="#c9a227" stroke-width="0.28" fill="none" opacity="0.45">
        <path d="M0 0 L5 0 L0 5" />
        <path d="M66 0 L61 0 L66 5" />
        <path d="M0 66 L5 66 L0 61" />
        <path d="M66 66 L61 66 L66 61" />
      </g>
      <rect x="3" y="3" width="60" height="60" rx="1.6" fill="none" stroke="#1a1208" stroke-width="0.55" />
      <rect x="4.2" y="4.2" width="57.6" height="57.6" rx="1.2" fill="none" stroke="#c9a227" stroke-width="0.28" />
      <g stroke="#1a1208" stroke-width="0.32" fill="none" opacity="0.85">
        <path d="M4.2 4.2 L8.5 4.2 L4.2 8.5" />
        <path d="M61.8 4.2 L57.5 4.2 L61.8 8.5" />
        <path d="M4.2 61.8 L8.5 61.8 L4.2 57.5" />
        <path d="M61.8 61.8 L57.5 61.8 L61.8 57.5" />
      </g>
    </svg>`;
}

/** 方形陽刻圓角印：朱文白底 */
function buildYangSealSvg() {
  return `
    <svg class="bless-seal bless-seal-yang" viewBox="0 0 48 48" aria-label="加持" role="img">
      <rect x="2.2" y="2.2" width="43.6" height="43.6" rx="4.8" ry="4.8"
        fill="#fffef8" stroke="#b71c1c" stroke-width="3.4" />
      <rect x="6.2" y="6.2" width="35.6" height="35.6" rx="3.2" ry="3.2"
        fill="none" stroke="#b71c1c" stroke-width="0.9" opacity="0.5" />
      <text x="24" y="20.5" text-anchor="middle" dominant-baseline="middle"
        font-family="DFKai-SB, BiauKai, KaiTi, STKaiti, serif"
        font-size="14.5" font-weight="700" fill="#b71c1c">加</text>
      <text x="24" y="34.5" text-anchor="middle" dominant-baseline="middle"
        font-family="DFKai-SB, BiauKai, KaiTi, STKaiti, serif"
        font-size="14.5" font-weight="700" fill="#b71c1c">持</text>
    </svg>`;
}

export function buildBraceletCardBack() {
  return `
    <article class="print-card print-card-back print-card-blessing" data-side="back">
      <div class="card-trim-guide" aria-hidden="true"></div>
      ${buildBlessingBackArt()}
      <div class="back-blessing-copy">
        <p class="bless-line bless-line-primary">玉旨清道院觀世音菩薩</p>
        <p class="bless-line bless-line-secondary">三清道祖</p>
        <div class="bless-seal-wrap">
          ${buildYangSealSvg()}
        </div>
        <p class="bless-line bless-line-master">道旨日舜堂姜太公子牙</p>
        <p class="bless-line bless-line-consecrate">道旨仁居士導師開光</p>
      </div>
    </article>`;
}

export function buildBraceletCardPair(data) {
  return `${buildBraceletCardFront(data)}${buildBraceletCardBack(data)}`;
}
