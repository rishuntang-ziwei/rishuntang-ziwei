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

const CYCLE_LABEL_GROUPS = [
  {
    anchor: '水',
    corner: 'waterLeft',
    items: [
      { text: '储存', kind: 'red', role: 'top' },
      { text: '吸收', kind: 'green', role: 'bottomLeft' },
      { text: '整合', kind: 'black', role: 'bottomRight' },
    ],
  },
  {
    anchor: '水',
    corner: 'waterRight',
    items: [
      { text: '供应', kind: 'red', role: 'top' },
      { text: '能源', kind: 'green', role: 'bottomLeft' },
      { text: '学习', kind: 'black', role: 'bottomRight' },
    ],
  },
  {
    anchor: '金',
    corner: 'bottomLeft',
    items: [
      { text: '开发', kind: 'red', role: 'top' },
      { text: '转换', kind: 'green', role: 'bottomLeft' },
      { text: '运用', kind: 'black', role: 'bottomRight' },
    ],
  },
  {
    anchor: '木',
    corner: 'bottomRight',
    items: [
      { text: '改变', kind: 'red', role: 'top' },
      { text: '生机', kind: 'green', role: 'bottomLeft' },
      { text: '目标', kind: 'black', role: 'bottomRight' },
    ],
  },
  {
    anchor: '火',
    corner: 'bottom',
    items: [
      { text: '消耗', kind: 'red', role: 'top' },
      { text: '能量', kind: 'green', role: 'bottomLeft' },
      { text: '行动', kind: 'black', role: 'bottomRight' },
    ],
  },
];

function cycleGroupCenter(anchorPos, corner, outerR, scale) {
  const pad = outerR + 20 * scale;
  const spread = 44 * scale;
  const rowH = 14.5 * scale;
  const rowW = 18 * scale;
  const waterGap = outerR + 10 * scale;

  switch (corner) {
    case 'waterLeft':
      return {
        x: anchorPos.x - waterGap - rowW,
        y: anchorPos.y - rowH * 0.88,
      };
    case 'waterRight':
      return {
        x: anchorPos.x + waterGap + rowW,
        y: anchorPos.y - rowH * 0.88,
      };
    case 'bottomLeft':
      return { x: anchorPos.x - spread * 0.78, y: anchorPos.y + pad + spread * 0.62 };
    case 'bottomRight':
      return { x: anchorPos.x + spread * 0.78, y: anchorPos.y + pad + spread * 0.62 };
    case 'bottom':
      return { x: anchorPos.x, y: anchorPos.y + pad + spread * 0.52 };
    default:
      return anchorPos;
  }
}

function cycleRolePosition(center, role, scale) {
  const h = 14.5 * scale;
  const w = 18 * scale;
  const map = {
    top: { x: center.x, y: center.y - h },
    bottomLeft: { x: center.x - w, y: center.y + h * 0.88 },
    bottomRight: { x: center.x + w, y: center.y + h * 0.88 },
  };
  return map[role];
}

function renderCycleLabelItem(item, point, scale) {
  const [top, bottom] = item.text.split('');
  const font = (13 * scale).toFixed(1);
  const redFont = (14.5 * scale).toFixed(1);
  const lineGap = (14 * scale).toFixed(1);

  if (item.kind === 'red') {
    return `
      <text x="${point.x.toFixed(1)}" y="${(point.y - 4 * scale).toFixed(1)}" text-anchor="middle"
        class="wuxing-cycle-label wuxing-cycle-label-red" font-size="${redFont}">
        <tspan x="${point.x.toFixed(1)}" dy="0">${top}</tspan>
        <tspan x="${point.x.toFixed(1)}" dy="${lineGap}">${bottom}</tspan>
      </text>`;
  }

  const stroke = item.kind === 'green' ? '#2a9d4b' : '#111111';
  const fill = item.kind === 'green' ? '#2a9d4b' : '#111111';
  const rx = (12 * scale).toFixed(1);
  const ry = (17 * scale).toFixed(1);
  return `
    <g class="wuxing-cycle-label wuxing-cycle-label-${item.kind}">
      <ellipse cx="${point.x.toFixed(1)}" cy="${(point.y + 1.5 * scale).toFixed(1)}" rx="${rx}" ry="${ry}"
        fill="none" stroke="${stroke}" stroke-width="${(1.7 * scale).toFixed(1)}" />
      <text x="${point.x.toFixed(1)}" y="${(point.y - 4 * scale).toFixed(1)}" text-anchor="middle"
        font-size="${font}" fill="${fill}">
        <tspan x="${point.x.toFixed(1)}" dy="0">${top}</tspan>
        <tspan x="${point.x.toFixed(1)}" dy="${(12 * scale).toFixed(1)}">${bottom}</tspan>
      </text>
    </g>`;
}

function buildCycleLabels(positions, outerR, scale = 1) {
  return CYCLE_LABEL_GROUPS.map((group) => {
    const anchorPos = positions[group.anchor];
    const center = cycleGroupCenter(anchorPos, group.corner, outerR, scale);
    return group.items
      .map((item) => {
        const point = cycleRolePosition(center, item.role, scale);
        return renderCycleLabelItem(item, point, scale);
      })
      .join('');
  }).join('');
}

function cycleLabelBounds(positions, outerR, scale) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  const rx = 12 * scale;
  const ry = 17 * scale;
  const font = 13 * scale;
  const redFont = 14.5 * scale;

  CYCLE_LABEL_GROUPS.forEach((group) => {
    const anchorPos = positions[group.anchor];
    const center = cycleGroupCenter(anchorPos, group.corner, outerR, scale);
    group.items.forEach((item) => {
      const point = cycleRolePosition(center, item.role, scale);
      if (item.kind === 'red') {
        const top = point.y - 4 * scale;
        const bottom = top + redFont * 2.2;
        minX = Math.min(minX, point.x - redFont * 0.9);
        maxX = Math.max(maxX, point.x + redFont * 0.9);
        minY = Math.min(minY, top - redFont * 0.4);
        maxY = Math.max(maxY, bottom);
        return;
      }

      minX = Math.min(minX, point.x - rx);
      maxX = Math.max(maxX, point.x + rx);
      minY = Math.min(minY, point.y - 4 * scale - font);
      maxY = Math.max(maxY, point.y + 1.5 * scale + ry + font * 1.1);
    });
  });

  return { minX, minY, maxX, maxY };
}

function resolveViewBox({
  cx,
  cy,
  outerDist,
  outerR,
  centerR,
  showCycleLabels,
  cycleLabelScale,
  positions,
  size,
  contentZoom = 1,
}) {
  if (size === 'center') return '-14 -14 288 288';

  let minX = cx - outerDist - outerR;
  let minY = cy - outerDist - outerR;
  let maxX = cx + outerDist + outerR;
  let maxY = cy + outerDist + outerR;

  minX = Math.min(minX, cx - centerR);
  maxX = Math.max(maxX, cx + centerR);
  minY = Math.min(minY, cy - centerR);
  maxY = Math.max(maxY, cy + centerR);

  if (showCycleLabels) {
    const bounds = cycleLabelBounds(positions, outerR, cycleLabelScale);
    minX = Math.min(minX, bounds.minX);
    minY = Math.min(minY, bounds.minY);
    maxX = Math.max(maxX, bounds.maxX);
    maxY = Math.max(maxY, bounds.maxY);
  }

  const margin = showCycleLabels ? 2 : 8;
  minX -= margin;
  minY -= margin;
  maxX += margin;
  maxY += margin;

  let width = maxX - minX;
  let height = maxY - minY;

  if (contentZoom > 1) {
    const centerX = minX + width / 2;
    const centerY = minY + height / 2;
    width /= contentZoom;
    height /= contentZoom;
    minX = centerX - width / 2;
    minY = centerY - height / 2;
  }

  return `${minX.toFixed(1)} ${minY.toFixed(1)} ${width.toFixed(1)} ${height.toFixed(1)}`;
}

export function buildWuxingPanel(counts, options = {}) {
  const {
    title = '五行統計',
    markerId = 'wuxing-arrow',
    showSummary = true,
    summaryRows = null,
    showCycleLabels = false,
    cycleLabelScale = 1,
  } = options;

  const cx = 130;
  const cy = 128;
  const scale = options.scale ?? 1;
  const textScale = options.textScale ?? 1;
  const { outerDist, outerR, centerR } = resolveLayout(options);

  const positions = {};
  GENERATING_CYCLE.forEach((name) => {
    positions[name] = getPosition(name, cx, cy, name === '土' ? 0 : outerDist);
  });

  const viewBox = resolveViewBox({
    cx,
    cy,
    outerDist,
    outerR,
    centerR,
    showCycleLabels,
    cycleLabelScale,
    positions,
    size: options.size,
    contentZoom: options.contentZoom ?? 1,
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

  const cycleLabels = showCycleLabels
    ? buildCycleLabels(positions, outerR, cycleLabelScale)
    : '';

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
      ${cycleLabels}
    </svg>
    ${summary}`;
}
