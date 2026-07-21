export const WUXING_ORDER = ['木', '火', '土', '金', '水'];

export const WUXING_COLORS = {
  木: '#2db84a',
  火: '#e53935',
  土: '#9a7b4f',
  金: '#ffffff',
  水: '#1a1a1a',
};

const STEM_ELEMENT = {
  甲: '木',
  乙: '木',
  丙: '火',
  丁: '火',
  戊: '土',
  己: '土',
  庚: '金',
  辛: '金',
  壬: '水',
  癸: '水',
};

const BRANCH_ELEMENT = {
  子: '水',
  丑: '土',
  寅: '木',
  卯: '木',
  辰: '土',
  巳: '火',
  午: '火',
  未: '土',
  申: '金',
  酉: '金',
  戌: '土',
  亥: '水',
};

/** 相生循環：水→木→火→土→金→水 */
const GENERATING_CYCLE = ['水', '木', '火', '土', '金'];

const NODE_STYLE = {
  木: { fill: '#2db84a', inactive: '#b8e6c1', stroke: '#1e8a35', text: '#fff', inactiveText: '#4a7a52' },
  火: { fill: '#e53935', inactive: '#f5b8b6', stroke: '#c62828', text: '#fff', inactiveText: '#8a4545' },
  土: { fill: '#9a7b4f', inactive: '#ddd0b8', stroke: '#7a6038', text: '#fff', inactiveText: '#6a5a40' },
  金: { fill: '#ffffff', inactive: '#f0f0f0', stroke: '#1a1a1a', text: '#1a1a1a', inactiveText: '#666' },
  水: { fill: '#1a1a1a', inactive: '#c8c8c8', stroke: '#1a1a1a', text: '#fff', inactiveText: '#555' },
};

function elementOf(char) {
  return STEM_ELEMENT[char] || BRANCH_ELEMENT[char] || '';
}

export function countBaziElements(chineseDate) {
  const counts = { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 };
  if (!chineseDate) return counts;

  for (const key of ['yearly', 'monthly', 'daily', 'hourly']) {
    const pair = chineseDate[key];
    if (!pair) continue;
    for (const char of [pair[0], pair[1]]) {
      const element = elementOf(char);
      if (element) counts[element] += 1;
    }
  }

  return counts;
}

function getPosition(name, cx, cy, outerDist) {
  const map = {
    水: [0, -outerDist],
    木: [outerDist, 0],
    火: [0, outerDist],
    金: [-outerDist, 0],
    土: [0, 0],
  };
  const [dx, dy] = map[name];
  return { x: cx + dx, y: cy + dy };
}

function edgeLine(from, to, fromR, toR) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  return {
    x1: from.x + ux * fromR,
    y1: from.y + uy * fromR,
    x2: to.x - ux * (toR + 4),
    y2: to.y - uy * (toR + 4),
  };
}

function resolveLayout(options) {
  const scale = options.scale ?? 1;
  let base;

  if (options.size === 'center') {
    base = { outerDist: 92, outerR: 40, centerR: 36 };
  } else if (options.compact || options.size === 'compact') {
    base = { outerDist: 68, outerR: 24, centerR: 22 };
  } else {
    base = { outerDist: 76, outerR: 30, centerR: 26 };
  }

  return {
    outerDist: base.outerDist * scale,
    outerR: base.outerR * scale,
    centerR: options.equalCenterRadius ? base.outerR * scale : base.centerR * scale,
  };
}

function nodeRadius(name, outerR, centerR) {
  return name === '土' ? centerR : outerR;
}

export function buildWuxingPanel(counts, options = {}) {
  const {
    title = '五行統計',
    markerId = 'wuxing-arrow',
    showSummary = true,
    summaryRows = null,
  } = options;

  const cx = 130;
  const cy = 128;
  const scale = options.scale ?? 1;
  const textScale = options.textScale ?? 1;
  const { outerDist, outerR, centerR } = resolveLayout(options);
  const viewBox = (() => {
    if (options.size === 'center') return '-14 -14 288 288';
    const extent = outerDist + outerR + 8;
    const size = extent * 2;
    return `${(cx - extent).toFixed(1)} ${(cy - extent).toFixed(1)} ${size.toFixed(1)} ${size.toFixed(1)}`;
  })();

  const positions = {};
  GENERATING_CYCLE.forEach((name) => {
    positions[name] = getPosition(name, cx, cy, name === '土' ? 0 : outerDist);
  });

  const generatingEdges = [
    edgeLine(positions.水, positions.木, outerR, outerR),
    edgeLine(positions.木, positions.火, outerR, outerR),
    edgeLine(positions.火, positions.土, outerR, centerR),
    edgeLine(positions.土, positions.金, centerR, outerR),
    edgeLine(positions.金, positions.水, outerR, outerR),
  ]
    .map(
      (e) =>
        `<line x1="${e.x1.toFixed(1)}" y1="${e.y1.toFixed(1)}" x2="${e.x2.toFixed(1)}" y2="${e.y2.toFixed(1)}" class="wuxing-edge" marker-end="url(#${markerId})" />`,
    )
    .join('');

  const nodes = GENERATING_CYCLE.map((name) => {
    const point = positions[name];
    const count = counts[name] || 0;
    const active = count > 0;
    const style = NODE_STYLE[name];
    const isCenter = name === '土';
    const r = isCenter ? centerR : outerR;
    const fill = active ? style.fill : style.inactive;
    const textFill = active ? style.text : style.inactiveText;
    const strokeW = (name === '金' ? 2.5 : active ? 2 : 1.5) * scale;
    const nameFont = r * 0.62 * textScale;
    const countFont = r * 0.44 * textScale;
    const nameOffset = nameFont * 0.42;
    const countOffset = countFont * 1.05;

    return `
      <g class="wuxing-node${active ? ' is-active' : ''}" data-element="${name}">
        <circle cx="${point.x.toFixed(1)}" cy="${point.y.toFixed(1)}" r="${r}"
          fill="${fill}" stroke="${style.stroke}" stroke-width="${strokeW}" />
        <text x="${point.x.toFixed(1)}" y="${(point.y - nameOffset).toFixed(1)}"
          text-anchor="middle" dominant-baseline="middle" class="wuxing-node-name"
          font-size="${nameFont.toFixed(1)}" fill="${textFill}">${name}</text>
        <text x="${point.x.toFixed(1)}" y="${(point.y + countOffset).toFixed(1)}"
          text-anchor="middle" dominant-baseline="middle" class="wuxing-node-count"
          font-size="${countFont.toFixed(1)}" fill="${textFill}">${count}</text>
      </g>`;
  }).join('');

  const chipHtml = (name) =>
    `<span class="wuxing-chip" style="--wx-color:${WUXING_COLORS[name]}">${name} ${counts[name] || 0}</span>`;

  const summary = showSummary
    ? summaryRows
      ? `<div class="wuxing-summary wuxing-summary-rows">${summaryRows
          .map(
            (row) =>
              `<div class="wuxing-summary-row">${row.map(chipHtml).join('')}</div>`,
          )
          .join('')}</div>`
      : `<div class="wuxing-summary">${WUXING_ORDER.map(chipHtml).join('')}</div>`
    : '';

  const titleHtml = title
    ? `<p class="wuxing-title">${title}</p>`
    : '';

  return `
    ${titleHtml}
    <svg class="wuxing-svg" viewBox="${viewBox}" aria-hidden="true">
      <defs>
        <marker id="${markerId}" markerWidth="7" markerHeight="7" refX="5.5" refY="3.5" orient="auto" markerUnits="userSpaceOnUse">
          <polygon points="0 0, 7 3.5, 0 7" fill="#333" />
        </marker>
      </defs>
      ${generatingEdges}
      ${nodes}
    </svg>
    ${summary}`;
}
