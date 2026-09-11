const ROWS = [
  {
    centered: true,
    items: [
      { text: '能源', kind: 'green' },
      { text: '供應', kind: 'red' },
      { text: '學習', kind: 'black' },
    ],
  },
  {
    centered: false,
    items: [
      { text: '吸收', kind: 'green' },
      { text: '儲存', kind: 'red' },
      { text: '整合', kind: 'black' },
      { text: '轉換', kind: 'green' },
      { text: '開發', kind: 'red' },
      { text: '運用', kind: 'black' },
      { text: '生機', kind: 'green' },
      { text: '改變', kind: 'red' },
      { text: '目標', kind: 'black' },
    ],
  },
  {
    centered: true,
    items: [
      { text: '能量', kind: 'green' },
      { text: '消耗', kind: 'red' },
      { text: '行動', kind: 'black' },
    ],
  },
];

function rowXs(count, width = 480) {
  const step = count === 9 ? 48 : 92;
  const span = step * (count - 1);
  const start = (width - span) / 2;
  return Array.from({ length: count }, (_, i) => start + step * i);
}

function renderItem(item, x, y) {
  const [top, bottom] = item.text.split('');
  const ovalText = `font-family="DFKai-SB, BiauKai, KaiTi, serif" font-size="21" font-weight="700" fill="#111"`;
  const greenText = `font-family="DFKai-SB, BiauKai, KaiTi, serif" font-size="21" font-weight="700" fill="#2a9d4b"`;
  const redText = `font-family="DFKai-SB, BiauKai, KaiTi, serif" font-size="24" font-weight="700" fill="#d82222"`;

  if (item.kind === 'red') {
    return `
      <text x="${x}" y="${y - 10}" text-anchor="middle" ${redText}>
        <tspan x="${x}" dy="0">${top}</tspan>
        <tspan x="${x}" dy="26">${bottom}</tspan>
      </text>`;
  }

  const stroke =
    item.kind === 'green' ? '#2a9d4b' : '#111111';
  const textStyle = item.kind === 'green' ? greenText : ovalText;
  return `
    <ellipse cx="${x}" cy="${y + 2}" rx="23" ry="33" fill="none" stroke="${stroke}" stroke-width="2.4" />
    <text x="${x}" y="${y - 10}" text-anchor="middle" ${textStyle}>
      <tspan x="${x}" dy="0">${top}</tspan>
      <tspan x="${x}" dy="24">${bottom}</tspan>
    </text>`;
}

export function buildWuxingCycleCard() {
  const rowY = [108, 256, 404];
  const body = ROWS.map((row, rowIndex) => {
    const xs = rowXs(row.items.length);
    return row.items
      .map((item, index) => renderItem(item, xs[index], rowY[rowIndex]))
      .join('');
  }).join('');

  return `
    <svg class="wuxing-cycle-card" viewBox="0 0 480 512" aria-hidden="true" preserveAspectRatio="xMidYMid meet">
      <rect x="6" y="6" width="468" height="500" rx="30" ry="30" fill="#efcc39" stroke="#d8b82f" stroke-width="2.2" />
      ${body}
    </svg>`;
}
