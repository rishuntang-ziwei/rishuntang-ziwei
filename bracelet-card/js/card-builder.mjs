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

function qianKunBlock(kind) {
  if (kind === 'qian') {
    return `
      <div class="qk-block qk-qian">
        <div class="qk-gua" aria-hidden="true">☰</div>
        <div class="qk-text">
          <strong>乾 · 天</strong>
          <span>天行健，君子以自強不息</span>
        </div>
      </div>`;
  }
  return `
    <div class="qk-block qk-kun">
      <div class="qk-gua" aria-hidden="true">☷</div>
      <div class="qk-text">
        <strong>坤 · 地</strong>
        <span>地勢坤，君子以厚德載物</span>
      </div>
    </div>`;
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
    scale: 1.05,
    textScale: 0.92,
    highlightFrom: advice.parent,
    highlightTo: advice.lacking,
    dimOthers: !advice.balanced,
    markerId,
  });

  const chips = WUXING_ORDER.map(
    (name) => `<span class="stat-chip" style="--wx:${WUXING_COLORS[name]}">${name} ${counts[name] ?? 0}</span>`,
  ).join('');

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
      <header class="card-header">
        <p class="card-brand">日順堂 · 五行相生補運圖卡</p>
        ${nameLine}
      </header>
      ${qianKunBlock('qian')}
      <div class="card-diagram">
        <p class="card-phrase">${advice.phrase}</p>
        <p class="card-subtitle">${advice.subtitle}</p>
        <div class="card-wuxing">${wuxingHtml}</div>
      </div>
      ${qianKunBlock('kun')}
      <footer class="card-footer">
        ${beads}
        <p class="card-bazi">${baziText}</p>
      </footer>
    </article>`;
}

function buildBlessingBackArt() {
  const wxColors = ['#2db84a', '#e53935', '#9a7b4f', '#c9a227', '#1a1a1a'];
  const wxAngles = [-90, -18, 54, 126, 198];
  const wxDots = wxAngles
    .map((deg, i) => {
      const rad = (deg * Math.PI) / 180;
      const cx = 150 + Math.cos(rad) * 58;
      const cy = 210 + Math.sin(rad) * 58;
      return `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="5.5" fill="${wxColors[i]}" opacity="0.88" />`;
    })
    .join('');

  return `
    <svg class="back-art" viewBox="0 0 300 420" aria-hidden="true" preserveAspectRatio="xMidYMid meet">
      <defs>
        <radialGradient id="back-glow" cx="50%" cy="48%" r="55%">
          <stop offset="0%" stop-color="#fff8e8" stop-opacity="0.95" />
          <stop offset="55%" stop-color="#f6eedb" stop-opacity="0.4" />
          <stop offset="100%" stop-color="#e8dcc0" stop-opacity="0" />
        </radialGradient>
        <linearGradient id="back-gold" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#e8c547" />
          <stop offset="50%" stop-color="#c9a227" />
          <stop offset="100%" stop-color="#8b6914" />
        </linearGradient>
        <filter id="back-soft" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="1.2" />
        </filter>
      </defs>

      <rect x="0" y="0" width="300" height="420" fill="url(#back-glow)" />

      <rect x="14" y="14" width="272" height="392" rx="18" ry="18"
        fill="none" stroke="url(#back-gold)" stroke-width="2.2" />
      <rect x="22" y="22" width="256" height="376" rx="14" ry="14"
        fill="none" stroke="#8b6914" stroke-width="0.8" opacity="0.55" />

      <g stroke="#c9a227" stroke-width="1" fill="none" opacity="0.65">
        <path d="M28 28 C42 28, 42 42, 56 42" />
        <path d="M272 28 C258 28, 258 42, 244 42" />
        <path d="M28 392 C42 392, 42 378, 56 378" />
        <path d="M272 392 C258 392, 258 378, 244 378" />
      </g>

      <g fill="none" stroke="#5c4033" stroke-width="0.7" opacity="0.35">
        <circle cx="150" cy="210" r="92" />
        <circle cx="150" cy="210" r="72" stroke-dasharray="4 5" />
        <circle cx="150" cy="210" r="38" stroke="#8b6914" stroke-width="1" opacity="0.5" />
      </g>

      ${wxDots}

      <g transform="translate(150 210)">
        <circle r="28" fill="#f6eedb" stroke="#8b6914" stroke-width="1.4" />
        <path d="M0 -28 A28 28 0 0 1 0 28 A14 14 0 0 1 0 0 A14 14 0 0 0 0 -28 Z" fill="#1a1a1a" opacity="0.88" />
        <path d="M0 28 A28 28 0 0 1 0 -28 A14 14 0 0 1 0 0 A14 14 0 0 0 0 28 Z" fill="#f6f6f6" opacity="0.95" />
        <circle r="3.5" fill="#8b6914" />
      </g>

      <g stroke="#c9a227" stroke-width="0.8" opacity="0.45" filter="url(#back-soft)">
        <path d="M150 118 L150 92 M150 302 L150 328" />
        <path d="M62 210 L36 210 M238 210 L264 210" />
      </g>

      <g fill="#8b6914" opacity="0.22">
        <ellipse cx="150" cy="78" rx="34" ry="10" />
        <ellipse cx="150" cy="342" rx="34" ry="10" />
      </g>

      <g font-family="DFKai-SB, BiauKai, KaiTi, serif" fill="#8b6914" opacity="0.28" font-size="11" text-anchor="middle">
        <text x="150" y="56">☰</text>
        <text x="150" y="368">☷</text>
      </g>

      <g fill="none" stroke="#b71c1c" stroke-width="0.6" opacity="0.25">
        <path d="M90 130 Q150 108 210 130" />
        <path d="M90 290 Q150 312 210 290" />
      </g>
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
  return `${buildBraceletCardFront(data)}${buildBraceletCardBack()}`;
}
