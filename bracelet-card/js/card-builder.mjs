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

const BRACELET_LABELS = {
  木: '綠色珠',
  火: '紅色珠',
  土: '褐色珠',
  金: '銀白珠',
  水: '黑色珠',
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

function beadHtml(element, role) {
  const color = WUXING_COLORS[element];
  return `
    <div class="bead-item bead-${role}">
      <span class="bead-dot" style="--bead-color:${color}"></span>
      <span class="bead-label">${element} · ${BRACELET_LABELS[element]}</span>
      <span class="bead-role">${role === 'primary' ? '主珠' : '輔珠'}</span>
    </div>`;
}

/** 乾坤融入方形邊框：上乾下坤，作為圖卡外框的一部分 */
function buildSquareFrameSvg() {
  return `
    <svg class="square-frame" viewBox="0 0 240 240" aria-hidden="true">
      <rect x="6" y="6" width="228" height="228" rx="4" ry="4"
        fill="none" stroke="#1a1208" stroke-width="2.4" />
      <rect x="12" y="12" width="216" height="216" rx="2" ry="2"
        fill="none" stroke="#c9a227" stroke-width="1" />
      <g stroke="#1a1208" stroke-width="1.2" fill="none" opacity="0.85">
        <path d="M12 12 L28 12 L12 28" />
        <path d="M228 12 L212 12 L228 28" />
        <path d="M12 228 L28 228 L12 212" />
        <path d="M228 228 L212 228 L228 212" />
      </g>
      <g font-family="DFKai-SB, BiauKai, KaiTi, serif" fill="#1a1208" text-anchor="middle">
        <text x="120" y="27" font-size="13" font-weight="700">☰ 乾 · 天</text>
        <text x="120" y="234" font-size="13" font-weight="700">☷ 坤 · 地</text>
      </g>
      <line x1="48" y1="18" x2="92" y2="18" stroke="#c9a227" stroke-width="0.8" opacity="0.7" />
      <line x1="148" y1="18" x2="192" y2="18" stroke="#c9a227" stroke-width="0.8" opacity="0.7" />
      <line x1="48" y1="222" x2="92" y2="222" stroke="#c9a227" stroke-width="0.8" opacity="0.7" />
      <line x1="148" y1="222" x2="192" y2="222" stroke="#c9a227" stroke-width="0.8" opacity="0.7" />
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

  const beads = `
    <div class="bead-row">
      ${beadHtml(advice.braceletPrimary, 'primary')}
      ${beadHtml(advice.braceletSecondary, 'secondary')}
    </div>`;

  const nameLine = displayName
    ? `<p class="card-name">${displayName}</p>`
    : '';

  return `
    <article class="print-card print-card-front" data-side="front">
      <div class="card-bleed-guide" aria-hidden="true"></div>
      <div class="card-frame-wrap">
        ${buildSquareFrameSvg()}
        <div class="card-inner">
          <header class="card-header">
            <p class="card-brand">日舜堂</p>
            <p class="card-tagline">五行相生補運</p>
            ${nameLine}
          </header>
          <div class="card-diagram">
            <p class="card-phrase">${advice.phrase}</p>
            <p class="card-subtitle">${advice.subtitle}</p>
            <div class="card-wuxing">${wuxingHtml}</div>
          </div>
          <footer class="card-footer">
            ${beads}
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
      const cx = 150 + Math.cos(rad) * 52;
      const cy = 150 + Math.sin(rad) * 52;
      return `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="5" fill="${wxColors[i]}" />`;
    })
    .join('');

  return `
    <svg class="back-art" viewBox="0 0 300 300" aria-hidden="true" preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id="back-gold" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#e8c547" />
          <stop offset="100%" stop-color="#8b6914" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="300" height="300" fill="#fffef8" />
      <rect x="10" y="10" width="280" height="280" rx="6" ry="6"
        fill="none" stroke="#1a1208" stroke-width="2.4" />
      <rect x="16" y="16" width="268" height="268" rx="4" ry="4"
        fill="none" stroke="url(#back-gold)" stroke-width="1.2" />
      <g fill="none" stroke="#1a1208" stroke-width="0.8" opacity="0.5">
        <circle cx="150" cy="150" r="78" />
        <circle cx="150" cy="150" r="58" stroke-dasharray="3 4" />
      </g>
      ${wxDots}
      <g transform="translate(150 150)">
        <circle r="24" fill="#fffef8" stroke="#1a1208" stroke-width="1.4" />
        <path d="M0 -24 A24 24 0 0 1 0 24 A12 12 0 0 1 0 0 A12 12 0 0 0 0 -24 Z" fill="#1a1a1a" />
        <path d="M0 24 A24 24 0 0 1 0 -24 A12 12 0 0 1 0 0 A12 12 0 0 0 0 24 Z" fill="#f5f5f5" />
        <circle r="3" fill="#b71c1c" />
      </g>
      <text x="150" y="28" text-anchor="middle" font-family="DFKai-SB, BiauKai, KaiTi, serif"
        font-size="12" font-weight="700" fill="#1a1208">☰ 乾 · 天</text>
      <text x="150" y="284" text-anchor="middle" font-family="DFKai-SB, BiauKai, KaiTi, serif"
        font-size="12" font-weight="700" fill="#1a1208">☷ 坤 · 地</text>
    </svg>`;
}

export function buildBraceletCardBack() {
  return `
    <article class="print-card print-card-back print-card-blessing" data-side="back">
      <div class="card-bleed-guide" aria-hidden="true"></div>
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
