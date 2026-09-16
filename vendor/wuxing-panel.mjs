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
export const GENERATING_CYCLE = ['水', '木', '火', '土', '金'];

/** 缺某行時，以相生上一環補之（例：缺水 → 補金生水） */
export const GENERATING_PARENT = {
  木: '水',
  火: '木',
  土: '火',
  金: '土',
  水: '金',
};

/** 相生：from 生 to（例：土生金） */
export const GENERATING_CHILD = {
  金: '水',
  水: '木',
  木: '火',
  火: '土',
  土: '金',
};

/** 相剋：from 克 to（例：水克火） */
export const CONTROLS = {
  木: '土',
  火: '金',
  土: '水',
  金: '木',
  水: '火',
};

export const FORMATION_PAIRS = [
  { from: '金', to: '水' },
  { from: '水', to: '木' },
  { from: '木', to: '火' },
  { from: '火', to: '土' },
  { from: '土', to: '金' },
];

export const BRACELET_COLOR_LABELS = {
  金: '銀白色',
  水: '黑色',
  木: '綠色',
  火: '紅色',
  土: '土黃色',
};

function countRange(counts) {
  const values = WUXING_ORDER.map((name) => counts[name] ?? 0);
  return {
    min: Math.min(...values),
    max: Math.max(...values),
    values,
  };
}

function isExcess(counts, name, { max, threshold = 3 } = {}) {
  const value = counts[name] ?? 0;
  const peak = max ?? countRange(counts).max;
  return value >= threshold && value >= peak;
}

/**
 * 評估某一相生局的分數。
 * 法器成局後，若連鎖中的中間行在命盤為 0，視為虛生、不計入後續相生副作用。
 */
function scoreFormation(from, to, counts) {
  const { max } = countRange(counts);
  let score = 0;

  if ((counts[from] ?? 0) === 0) score += 10;
  if ((counts[to] ?? 0) === 0) score += 8;

  if (isExcess(counts, to, { max })) score -= 15;
  if (isExcess(counts, from, { max })) score -= 5;

  const controlled = CONTROLS[to];
  if (controlled && isExcess(counts, controlled, { max })) score += 12;

  const directNext = GENERATING_CHILD[to];
  if (directNext && isExcess(counts, directNext, { max })) score -= 20;

  const indirect = GENERATING_CHILD[directNext];
  if (
    directNext
    && indirect
    && isExcess(counts, indirect, { max })
    && (counts[directNext] ?? 0) > 0
  ) {
    score -= 12;
  }

  return score;
}

function buildFormationResult(from, to, { balanced = false, subtitle = null } = {}) {
  const primaryColor = BRACELET_COLOR_LABELS[from];
  const secondaryColor = BRACELET_COLOR_LABELS[to];
  const phrase = `${from}生${to}局`;
  return {
    balanced,
    from,
    to,
    parent: from,
    lacking: to,
    phrase,
    subtitle: subtitle ?? `建議同時配戴${primaryColor}與${secondaryColor}手環`,
    braceletPrimary: from,
    braceletSecondary: to,
    braceletColors: [primaryColor, secondaryColor],
  };
}

/** 依命盤五行選最佳相生局（法器雙色配戴，非單純提補） */
export function getFormationAdvice(counts, tieBreaker = null) {
  const { min, max } = countRange(counts);
  const balanced = min === max;
  const zeros = WUXING_ORDER.filter((name) => (counts[name] ?? 0) === 0);

  if (balanced) {
    const focus = tieBreaker && WUXING_ORDER.includes(tieBreaker) ? tieBreaker : '土';
    const to = GENERATING_CHILD[focus];
    return buildFormationResult(focus, to, {
      balanced: true,
      subtitle: `五行分布均衡，建議${BRACELET_COLOR_LABELS[focus]}與${BRACELET_COLOR_LABELS[to]}手環成${focus}生${to}局`,
    });
  }

  if (zeros.length === 1) {
    const from = zeros[0];
    const to = GENERATING_CHILD[from];
    return buildFormationResult(from, to);
  }

  let best = null;
  let bestScore = -Infinity;

  for (const { from, to } of FORMATION_PAIRS) {
    const score = scoreFormation(from, to, counts);
    if (score > bestScore) {
      bestScore = score;
      best = { from, to };
    }
  }

  return buildFormationResult(best.from, best.to);
}

const GENERATING_EDGES = [
  { from: '水', to: '木', fromR: 'outer', toR: 'outer' },
  { from: '木', to: '火', fromR: 'outer', toR: 'outer' },
  { from: '火', to: '土', fromR: 'outer', toR: 'center' },
  { from: '土', to: '金', fromR: 'center', toR: 'outer' },
  { from: '金', to: '水', fromR: 'outer', toR: 'outer' },
];

export function findWeakestElement(counts, tieBreaker = null) {
  const min = Math.min(...WUXING_ORDER.map((name) => counts[name] ?? 0));
  const tied = WUXING_ORDER.filter((name) => (counts[name] ?? 0) === min);
  if (tied.length === 1) return tied[0];
  if (tieBreaker && tied.includes(tieBreaker)) return tieBreaker;
  return tied[0];
}

/** @deprecated 改用 getFormationAdvice */
export function getSupplementAdvice(counts, tieBreaker = null) {
  return getFormationAdvice(counts, tieBreaker);
}

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
    base = { outerDist: 78, outerR: 34, centerR: 30 };
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
      { text: '開發', kind: 'red', role: 'top' },
      { text: '轉換', kind: 'green', role: 'bottomLeft' },
      { text: '運用', kind: 'black', role: 'bottomRight' },
    ],
  },
  {
    anchor: '水',
    corner: 'waterRight',
    items: [
      { text: '供應', kind: 'red', role: 'top' },
      { text: '能源', kind: 'green', role: 'bottomLeft' },
      { text: '學習', kind: 'black', role: 'bottomRight' },
    ],
  },
  {
    anchor: '金',
    corner: 'bottomLeft',
    items: [
      { text: '儲存', kind: 'red', role: 'top' },
      { text: '吸收', kind: 'green', role: 'bottomLeft' },
      { text: '整合', kind: 'black', role: 'bottomRight' },
    ],
  },
  {
    anchor: '木',
    corner: 'bottomRight',
    items: [
      { text: '改變', kind: 'red', role: 'top' },
      { text: '生機', kind: 'green', role: 'bottomLeft' },
      { text: '目標', kind: 'black', role: 'bottomRight' },
    ],
  },
  {
    anchor: '火',
    corner: 'fireBelow',
    items: [
      { text: '消耗', kind: 'red', role: 'top' },
      { text: '能量', kind: 'green', role: 'bottomLeft' },
      { text: '行動', kind: 'black', role: 'bottomRight' },
    ],
  },
];

function cycleGroupCenter(anchorPos, corner, outerR, scale) {
  const pad = outerR + 18 * scale;
  const spread = 40 * scale;
  const rowH = 14.5 * scale;
  const rowW = 18 * scale;
  const sideOffset = outerR + rowW * 1.85 + 14 * scale;

  switch (corner) {
    case 'waterLeft':
      return {
        x: anchorPos.x - sideOffset,
        y: anchorPos.y - rowH * 0.88,
      };
    case 'waterRight':
      return {
        x: anchorPos.x + sideOffset,
        y: anchorPos.y - rowH * 0.88,
      };
    case 'fireBelow':
      return {
        x: anchorPos.x,
        y: anchorPos.y + outerR + 24 * scale + rowH,
      };
    case 'bottomLeft':
      return { x: anchorPos.x - spread * 0.65, y: anchorPos.y + pad + spread * 0.45 };
    case 'bottomRight':
      return { x: anchorPos.x + spread * 0.65, y: anchorPos.y + pad + spread * 0.45 };
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

function renderStackedChars(text, point, scale, { fontSize, fill, className }) {
  const chars = [...text];
  if (chars.length === 0) return '';

  const x = point.x.toFixed(1);
  const gap = fontSize * 1.08;
  const startY = point.y - ((chars.length - 1) * gap) / 2;

  return chars
    .map((char, index) => {
      const y = (startY + index * gap).toFixed(1);
      return `<text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="middle"
        class="${className}" font-size="${fontSize.toFixed(1)}" fill="${fill}">${char}</text>`;
    })
    .join('');
}

function renderCycleLabelItem(item, point, scale) {
  const font = 13 * scale;
  const redFont = 14.5 * scale;

  if (item.kind === 'red') {
    return renderStackedChars(item.text, point, scale, {
      fontSize: redFont,
      fill: '#d82222',
      className: 'wuxing-cycle-label wuxing-cycle-label-red',
    });
  }

  const stroke = item.kind === 'green' ? '#2a9d4b' : '#111111';
  const fill = item.kind === 'green' ? '#2a9d4b' : '#111111';
  const rx = (12 * scale).toFixed(1);
  const ry = (17 * scale).toFixed(1);
  return `
    <g class="wuxing-cycle-label wuxing-cycle-label-${item.kind}">
      <ellipse cx="${point.x.toFixed(1)}" cy="${(point.y + 1.5 * scale).toFixed(1)}" rx="${rx}" ry="${ry}"
        fill="none" stroke="${stroke}" stroke-width="${(1.7 * scale).toFixed(1)}" />
      ${renderStackedChars(item.text, point, scale, {
        fontSize: font,
        fill,
        className: 'wuxing-cycle-label-text',
      })}
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
        const gap = redFont * 1.08;
        const top = point.y - gap / 2 - redFont * 0.5;
        const bottom = point.y + gap / 2 + redFont * 0.5;
        minX = Math.min(minX, point.x - redFont * 0.9);
        maxX = Math.max(maxX, point.x + redFont * 0.9);
        minY = Math.min(minY, top);
        maxY = Math.max(maxY, bottom);
        return;
      }

      minX = Math.min(minX, point.x - rx);
      maxX = Math.max(maxX, point.x + rx);
      minY = Math.min(minY, point.y - font * 1.2);
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
  if (size === 'center') {
    const zoom = contentZoom;
    let minX = cx - outerDist - outerR;
    let minY = cy - outerDist - outerR;
    let maxX = cx + outerDist + outerR;
    let maxY = cy + outerDist + outerR;

    minX = Math.min(minX, cx - centerR);
    maxX = Math.max(maxX, cx + centerR);
    minY = Math.min(minY, cy - centerR);
    maxY = Math.max(maxY, cy + centerR);

    const margin = 22;
    minX -= margin;
    minY -= margin;
    maxX += margin;
    maxY += margin;

    let width = maxX - minX;
    let height = maxY - minY;

    if (zoom > 1) {
      const centerX = minX + width / 2;
      const centerY = minY + height / 2;
      width /= zoom;
      height /= zoom;
      minX = centerX - width / 2;
      minY = centerY - height / 2;
    }

    return `${minX.toFixed(1)} ${minY.toFixed(1)} ${width.toFixed(1)} ${height.toFixed(1)}`;
  }

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

  const margin = showCycleLabels ? 14 : 8;
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

function countFontSize(count, r) {
  const digits = String(count).length;
  if (digits <= 1) return r * 0.96;
  if (digits === 2) return r * 0.76;
  return r * 0.58;
}

export function buildWuxingPanel(counts, options = {}) {
  const {
    title = '五行統計',
    markerId = 'wuxing-arrow',
    showSummary = true,
    summaryRows = null,
    showCycleLabels = false,
    cycleLabelScale = 1,
    highlightFrom = null,
    highlightTo = null,
    dimOthers = false,
    vivid = false,
    nodeStyleOverrides = {},
    nodeTextOverrides = {},
    highlightNodeStroke = true,
  } = options;

  const cx = 130;
  const cy = 128 + (options.centerYOffset ?? 0);
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
    contentZoom: options.contentZoom ?? (options.size === 'center' ? 1 : 1),
  });

  const generatingEdges = GENERATING_EDGES.map(({ from, to, fromR, toR }) => {
    const e = edgeLine(
      positions[from],
      positions[to],
      fromR === 'center' ? centerR : outerR,
      toR === 'center' ? centerR : outerR,
    );
    const highlighted = highlightFrom === from && highlightTo === to;
    const dimmed = dimOthers && highlightFrom && !highlighted;
    const edgeClass = `wuxing-edge${highlighted ? ' is-highlight' : ''}${dimmed ? ' is-dimmed' : ''}`;
    const strokeW = (highlighted ? 3.4 : 1.6) * scale;
    const markerEnd = highlighted ? `url(#${markerId}-hi)` : `url(#${markerId})`;
    return `<line x1="${e.x1.toFixed(1)}" y1="${e.y1.toFixed(1)}" x2="${e.x2.toFixed(1)}" y2="${e.y2.toFixed(1)}" class="${edgeClass}" stroke-width="${strokeW}" marker-end="${markerEnd}" />`;
  }).join('');

  const nodes = GENERATING_CYCLE.map((name) => {
    const point = positions[name];
    const count = counts[name] || 0;
    const active = vivid || count > 0;
    const style = { ...NODE_STYLE[name], ...(nodeStyleOverrides[name] || {}) };
    const isCenter = name === '土';
    const r = isCenter ? centerR : outerR;
    const onPath = name === highlightFrom || name === highlightTo || name === '土';
    const dimmed = dimOthers && highlightFrom && !onPath;
    const pathFocus = name === highlightFrom || name === highlightTo;
    const fill = dimmed ? style.inactive : active ? style.fill : style.inactive;
    const textFill = dimmed ? style.inactiveText : active ? style.text : style.inactiveText;
    const textOverride = nodeTextOverrides[name];
    const useTextOverride = Boolean(textOverride);
    const nodeTextFill = useTextOverride ? textOverride.fill : textFill;
    const nodeTextStrokeAttrs = useTextOverride && textOverride.stroke
      ? ` stroke="${textOverride.stroke}" stroke-width="${textOverride.strokeWidth ?? 1}" paint-order="stroke fill"`
      : '';
    const nodeStroke = pathFocus && highlightNodeStroke ? '#8b6914' : style.stroke;
    const strokeW = (pathFocus && highlightNodeStroke ? 3 : name === '金' ? 2.5 : active ? 2 : 1.5) * scale;
    const numbersOnly = options.numbersOnly ?? options.size === 'center';
    const nodeClass = `wuxing-node${active ? ' is-active' : ''}${pathFocus ? ' is-path' : ''}${dimmed ? ' is-dimmed' : ''}`;

    if (numbersOnly) {
      const countFont = countFontSize(count, r) * textScale;
      return `
      <g class="${nodeClass}" data-element="${name}">
        <circle cx="${point.x.toFixed(1)}" cy="${point.y.toFixed(1)}" r="${r}"
          fill="${fill}" stroke="${nodeStroke}" stroke-width="${strokeW}" />
        <text x="${point.x.toFixed(1)}" y="${point.y.toFixed(1)}"
          text-anchor="middle" dominant-baseline="central" class="wuxing-node-count"
          font-size="${countFont.toFixed(1)}" fill="${nodeTextFill}"${nodeTextStrokeAttrs}>${count}</text>
      </g>`;
    }

    const nameFont = r * 0.62 * textScale;
    const countFont = r * 0.44 * textScale;
    const nameOffset = nameFont * 0.42;
    const countOffset = countFont * 1.05;

    return `
      <g class="${nodeClass}" data-element="${name}">
        <circle cx="${point.x.toFixed(1)}" cy="${point.y.toFixed(1)}" r="${r}"
          fill="${fill}" stroke="${nodeStroke}" stroke-width="${strokeW}" />
        <text x="${point.x.toFixed(1)}" y="${(point.y - nameOffset).toFixed(1)}"
          text-anchor="middle" dominant-baseline="middle" class="wuxing-node-name"
          font-size="${nameFont.toFixed(1)}" fill="${nodeTextFill}"${nodeTextStrokeAttrs}>${name}</text>
        <text x="${point.x.toFixed(1)}" y="${(point.y + countOffset).toFixed(1)}"
          text-anchor="middle" dominant-baseline="middle" class="wuxing-node-count"
          font-size="${countFont.toFixed(1)}" fill="${nodeTextFill}"${nodeTextStrokeAttrs}>${count}</text>
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
        <marker id="${markerId}-hi" markerWidth="9" markerHeight="9" refX="7" refY="4.5" orient="auto" markerUnits="userSpaceOnUse">
          <polygon points="0 0, 9 4.5, 0 9" fill="#8b6914" />
        </marker>
      </defs>
      ${generatingEdges}
      ${nodes}
      ${cycleLabels}
    </svg>
    ${summary}`;
}
