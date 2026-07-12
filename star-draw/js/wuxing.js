export const WUXING_ORDER = ['木', '火', '土', '金', '水'];

export const WUXING_COLORS = {
  木: '#2db84a',
  火: '#e53935',
  土: '#9a7b4f',
  金: '#ffffff',
  水: '#1a1a1a',
};

/** 相生循環：水→木→火→土→金→水（傳統方位圖） */
const GENERATING_CYCLE = ['水', '木', '火', '土', '金'];

const NODE_STYLE = {
  木: { fill: '#2db84a', inactive: '#b8e6c1', stroke: '#1e8a35', text: '#fff', inactiveText: '#4a7a52' },
  火: { fill: '#e53935', inactive: '#f5b8b6', stroke: '#c62828', text: '#fff', inactiveText: '#8a4545' },
  土: { fill: '#9a7b4f', inactive: '#ddd0b8', stroke: '#7a6038', text: '#fff', inactiveText: '#6a5a40' },
  金: { fill: '#ffffff', inactive: '#f0f0f0', stroke: '#1a1a1a', text: '#1a1a1a', inactiveText: '#666' },
  水: { fill: '#1a1a1a', inactive: '#c8c8c8', stroke: '#1a1a1a', text: '#fff', inactiveText: '#555' },
};

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

/** 外圍弧線箭頭（水→木→火） */
function outerArc(cx, cy, radius, startDeg, endDeg) {
  const toRad = (d) => (d * Math.PI) / 180;
  const x1 = cx + radius * Math.cos(toRad(startDeg));
  const y1 = cy + radius * Math.sin(toRad(startDeg));
  const x2 = cx + radius * Math.cos(toRad(endDeg));
  const y2 = cy + radius * Math.sin(toRad(endDeg));
  const large = Math.abs(endDeg - startDeg) > 180 ? 1 : 0;
  const sweep = endDeg > startDeg ? 1 : 0;
  return `M ${x1.toFixed(1)} ${y1.toFixed(1)} A ${radius} ${radius} 0 ${large} ${sweep} ${x2.toFixed(1)} ${y2.toFixed(1)}`;
}

export function countElements(cards) {
  const counts = { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 };
  cards.forEach((card) => {
    if (card.element && counts[card.element] !== undefined) {
      counts[card.element] += 1;
    }
  });
  return counts;
}

export function buildWuxingPanel(counts) {
  const cx = 130;
  const cy = 128;
  const outerDist = 76;
  const outerR = 30;
  const centerR = 26;
  const arcR = outerDist + outerR - 6;

  const positions = {};
  GENERATING_CYCLE.forEach((name) => {
    positions[name] = getPosition(name, cx, cy, name === '土' ? 0 : outerDist);
  });

  const arcs = [
    outerArc(cx, cy, arcR, -80, -10),
    outerArc(cx, cy, arcR, 10, 80),
  ]
    .map(
      (d) =>
        `<path d="${d}" class="wuxing-arc" fill="none" marker-end="url(#wuxing-arrow)" />`,
    )
    .join('');

  const innerEdges = [
    edgeLine(positions.火, positions.土, outerR, centerR),
    edgeLine(positions.土, positions.金, centerR, outerR),
    edgeLine(positions.金, positions.水, outerR, outerR),
  ]
    .map(
      (e) =>
        `<line x1="${e.x1.toFixed(1)}" y1="${e.y1.toFixed(1)}" x2="${e.x2.toFixed(1)}" y2="${e.y2.toFixed(1)}" class="wuxing-edge" marker-end="url(#wuxing-arrow)" />`,
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
    const strokeW = name === '金' ? 2.5 : active ? 2 : 1.5;

    return `
      <g class="wuxing-node${active ? ' is-active' : ''}" data-element="${name}">
        <circle cx="${point.x.toFixed(1)}" cy="${point.y.toFixed(1)}" r="${r}"
          fill="${fill}" stroke="${style.stroke}" stroke-width="${strokeW}" />
        <text x="${point.x.toFixed(1)}" y="${(point.y - (isCenter ? 2 : 4)).toFixed(1)}"
          text-anchor="middle" class="wuxing-node-name" fill="${textFill}">${name}</text>
        <text x="${point.x.toFixed(1)}" y="${(point.y + (isCenter ? 18 : 20)).toFixed(1)}"
          text-anchor="middle" class="wuxing-node-count" fill="${textFill}">${count}</text>
      </g>`;
  }).join('');

  const summary = WUXING_ORDER.map(
    (name) =>
      `<span class="wuxing-chip" style="--wx-color:${WUXING_COLORS[name]}">${name} ${counts[name] || 0}</span>`,
  ).join('');

  return `
    <p class="wuxing-title">五行統計</p>
    <svg class="wuxing-svg" viewBox="0 0 260 260" aria-hidden="true">
      <defs>
        <marker id="wuxing-arrow" markerWidth="7" markerHeight="7" refX="5.5" refY="3.5" orient="auto">
          <polygon points="0 0, 7 3.5, 0 7" fill="#333" />
        </marker>
      </defs>
      ${arcs}
      ${innerEdges}
      ${nodes}
    </svg>
    <div class="wuxing-summary">${summary}</div>`;
}
