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
    baziText = '',
  } = data;

  const wuxingHtml = buildWuxingPanel(counts, {
    title: '',
    showSummary: false,
    numbersOnly: false,
    equalCenterRadius: false,
    showCycleLabels: false,
    scale: 0.88,
    textScale: 0.86,
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
            <p class="card-bazi">${baziText}</p>
          </footer>
        </div>
      </div>
    </article>`;
}

function buildBlessingBackArt() {
  const wxColors = ['#2db84a', '#e53935', '#9a7b4f', '#e8c547', '#1a1a1a'];
  const wxAngles = [-90, -18, 54, 126, 198];
  const wxDots = wxAngles
    .map((deg, i) => {
      const rad = (deg * Math.PI) / 180;
      const cx = 33 + Math.cos(rad) * 10;
      const cy = 36 + Math.sin(rad) * 10;
      return `<circle cx="${cx.toFixed(2)}" cy="${cy.toFixed(2)}" r="1.1" fill="${wxColors[i]}" />`;
    })
    .join('');

  return `
    <svg class="back-art" viewBox="0 0 66 66" aria-hidden="true" preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id="back-gold" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#e8c547" />
          <stop offset="100%" stop-color="#8b6914" />
        </linearGradient>
      </defs>
      <rect width="66" height="66" fill="#fffef8" />
      ${buildQiankunBackground('back-qk')}
      <rect x="0.4" y="0.4" width="65.2" height="65.2" fill="none" stroke="#c9a227" stroke-width="0.22" opacity="0.55" />
      <rect x="3" y="3" width="60" height="60" rx="1.6" fill="none" stroke="#1a1208" stroke-width="0.55" />
      <rect x="4.2" y="4.2" width="57.6" height="57.6" rx="1.2" fill="none" stroke="url(#back-gold)" stroke-width="0.28" />
      <g fill="none" stroke="#1a1208" stroke-width="0.22" opacity="0.5">
        <circle cx="33" cy="33" r="17.2" />
        <circle cx="33" cy="33" r="12.8" stroke-dasharray="0.8 1" />
      </g>
      ${wxDots}
      <g transform="translate(33 33)">
        <circle r="5.3" fill="#fffef8" stroke="#1a1208" stroke-width="0.32" />
        <path d="M0 -5.3 A5.3 5.3 0 0 1 0 5.3 A2.65 2.65 0 0 1 0 0 A2.65 2.65 0 0 0 0 -5.3 Z" fill="#1a1a1a" />
        <path d="M0 5.3 A5.3 5.3 0 0 1 0 -5.3 A2.65 2.65 0 0 1 0 0 A2.65 2.65 0 0 0 0 5.3 Z" fill="#f5f5f5" />
        <circle r="0.65" fill="#b71c1c" />
      </g>
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
        <div class="bless-seal" aria-label="加持">
          <span class="bless-seal-inner">加持</span>
        </div>
        <p class="bless-line bless-line-master">道旨日舜堂姜太公子牙</p>
        <p class="bless-line bless-line-consecrate">道旨仁居士導師開光</p>
      </div>
    </article>`;
}

export function buildBraceletCardPair(data) {
  return `${buildBraceletCardFront(data)}${buildBraceletCardBack(data)}`;
}
