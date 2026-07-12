import { DECK, ROUND_ORDER, TIERS, CARD_BACK } from './cards.js';
import { buildWuxingPanel, countElements } from './wuxing.js';

const $ = (sel) => document.querySelector(sel);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const state = {
  phase: 'idle',
  roundIndex: 0,
  roundPicks: [],
  deckRemaining: [],
  results: [],
  revealIndex: 0,
  busy: false,
};

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function currentTierId() {
  return ROUND_ORDER[state.roundIndex];
}

function currentTier() {
  return TIERS[currentTierId()];
}

function cardBackHtml() {
  return `<img src="${CARD_BACK}" alt="" loading="eager">`;
}

function cardFaceHtml(card) {
  if (card.image) {
    return `<img src="${card.image}" alt="${card.name}" loading="lazy">`;
  }
  return `<div class="card-text-fallback">${card.name}</div>`;
}

function makeCardEl(card, opts = {}) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'card';
  if (opts.hero) btn.classList.add('hero');
  if (opts.inRow) btn.classList.add('in-row');
  if (opts.inStack) btn.classList.add('in-stack');
  if (opts.flipped) btn.classList.add('flipped', 'revealed');
  if (opts.waiting) btn.classList.add('waiting');
  if (opts.activeFlip) btn.classList.add('active-flip');

  btn.innerHTML = `
    <div class="card-inner">
      <div class="card-face card-back">${cardBackHtml()}</div>
      <div class="card-face card-front">${cardFaceHtml(card)}</div>
    </div>`;

  btn.dataset.cardId = card.id;
  return btn;
}

function stackLayout(count) {
  if (count <= 1) return [{ x: 0, angle: 0, lift: 0 }];

  const step = Math.min(48, Math.max(30, 620 / count));
  const mid = (count - 1) / 2;
  const spread = Math.min(20 + count * 6.2, 156);
  const angleStart = -spread / 2;
  const angleStep = spread / (count - 1);

  return Array.from({ length: count }, (_, i) => {
    const angle = angleStart + angleStep * i;
    const x = (i - mid) * step;
    const lift = Math.abs(angle) * 0.48;
    return { x, angle, lift };
  });
}

function stackTransform({ x, angle, lift }) {
  return `translateX(${x}px) rotate(${angle}deg) translateY(-${lift}px)`;
}

function layoutStack(container, entries, { dealIn = false } = {}) {
  container.innerHTML = '';
  container.classList.add('stack-stage');

  const layout = stackLayout(entries.length);

  entries.forEach((entry, index) => {
    const { card, onClick } = entry;
    const el = makeCardEl(card, { inStack: true });
    const { x, angle, lift } = layout[index];

    el.style.setProperty('--x', `${x}px`);
    el.style.setProperty('--angle', `${angle}deg`);
    el.style.setProperty('--lift', `${lift}px`);
    el.style.setProperty('--i', String(index));
    el.style.transform = stackTransform({ x, angle, lift });
    el.style.zIndex = String(index + 1);

    if (dealIn) el.classList.add('deal-in');

    if (onClick) {
      el.addEventListener('click', () => onClick(el));
    }

    container.appendChild(el);
  });
}

async function flyCardToRow(fromEl, rowEl) {
  const from = fromEl.getBoundingClientRect();
  const ghost = fromEl.cloneNode(true);
  ghost.className = 'card card-ghost';
  ghost.style.width = `${from.width}px`;
  ghost.style.height = `${from.height}px`;
  document.body.appendChild(ghost);

  fromEl.classList.add('vanish');

  const placeholder = document.createElement('span');
  placeholder.className = 'picked-slot-marker';
  rowEl.appendChild(placeholder);
  const to = placeholder.getBoundingClientRect();

  const dx = to.left + to.width / 2 - (from.left + from.width / 2);
  const dy = to.top + to.height / 2 - (from.top + from.height / 2);

  await ghost.animate(
    [
      { transform: 'translate(0, 0) scale(1) rotate(0deg)', opacity: 1 },
      {
        transform: `translate(${dx * 0.55}px, ${dy * 0.35 - 28}px) scale(1.08) rotate(-6deg)`,
        offset: 0.55,
      },
      {
        transform: `translate(${dx}px, ${dy}px) scale(1) rotate(0deg)`,
        opacity: 1,
      },
    ],
    { duration: 520, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'forwards' },
  ).finished;

  ghost.remove();
  placeholder.remove();
}

function setHint(text) {
  const el = $('#hint');
  el.classList.add('hint-changing');
  el.textContent = text;
  requestAnimationFrame(() => el.classList.remove('hint-changing'));
}

function clearControls() {
  $('#controls').innerHTML = '';
}

function addControl(label, handler) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'pill-btn';
  btn.textContent = label;
  btn.addEventListener('click', handler);
  $('#controls').appendChild(btn);
}

function ensureDeck(tierId) {
  if (state.deckRemaining.length > 0) return false;
  state.deckRemaining = shuffle(
    DECK[tierId].map((c) => ({ ...c, tierId })),
  );
  return true;
}

function renderIdle() {
  state.phase = 'idle';
  state.busy = false;
  setHint('點擊卡牌開始');
  $('#pickedRow').innerHTML = '';
  clearControls();

  const table = $('#table');
  table.innerHTML = '';
  table.classList.remove('round-exit', 'round-enter', 'reveal-stage', 'stack-stage');

  const hero = makeCardEl({ id: 'hero', name: '開始' }, { hero: true });
  hero.addEventListener('click', () => {
    if (state.busy) return;
    startGame();
  });
  table.appendChild(hero);
}

async function startGame() {
  state.busy = true;
  state.roundIndex = 0;
  state.roundPicks = [];
  state.deckRemaining = [];
  state.results = [];
  state.revealIndex = 0;
  state.phase = 'round';

  const hero = $('#table .card.hero');
  if (hero) {
    await hero.animate(
      [
        { transform: 'rotate(4deg) scale(1)', opacity: 1 },
        { transform: 'rotate(0deg) scale(0.6)', opacity: 0 },
      ],
      { duration: 320, easing: 'ease-in' },
    ).finished;
  }

  await renderRound({ dealIn: true, shuffleFirst: true });
  state.busy = false;
}

const ROUND_HINTS = [
  '第一輪請在這14張牌選擇2張',
  '第二輪請在這14張牌選擇2張',
  '第三輪請在這12張牌選擇2張',
  '最後請在這5張牌裡選擇1張',
];

function roundHint() {
  return ROUND_HINTS[state.roundIndex] || ROUND_HINTS[0];
}

async function showShuffleStack() {
  const table = $('#table');
  table.innerHTML = `
    <div class="shuffle-stack">
      <div class="card-face card-back stack-3"></div>
      <div class="card-face card-back stack-2"></div>
      <div class="card-face card-back stack-1"></div>
    </div>`;
  table.querySelectorAll('.card-back').forEach((el) => {
    el.innerHTML = cardBackHtml();
  });
  await sleep(680);
}

async function renderRound({ dealIn = false, shuffleFirst = false } = {}) {
  const tierId = currentTierId();
  const tier = currentTier();

  setHint(roundHint());
  clearControls();

  const isFreshRound = ensureDeck(tierId);
  const table = $('#table');

  if (shuffleFirst && isFreshRound) {
    await showShuffleStack();
  }

  const pickedRow = $('#pickedRow');
  pickedRow.innerHTML = '';
  state.roundPicks.forEach((card, i) => {
    const el = makeCardEl(card, { inRow: true });
    el.style.animationDelay = `${i * 60}ms`;
    el.classList.add('landed');
    el.disabled = true;
    pickedRow.appendChild(el);
  });

  const stackEntries = state.deckRemaining.map((card) => ({
    card,
    onClick: (el) => handlePick(card, el),
  }));

  layoutStack(table, stackEntries, { dealIn: dealIn || isFreshRound });

  if (state.roundPicks.length === tier.pickCount) {
    state.busy = true;
    await sleep(850);
    if (state.phase === 'round' && state.roundPicks.length === tier.pickCount) {
      await finishRound();
    }
    state.busy = false;
  } else if (state.roundPicks.length > 0) {
    addControl('復原', undoLastPick);
  }
}

async function handlePick(card, fromEl) {
  if (state.phase !== 'round' || state.busy) return;

  const tier = currentTier();
  if (state.roundPicks.length >= tier.pickCount) return;

  const idx = state.deckRemaining.findIndex((c) => c.id === card.id);
  if (idx < 0) return;

  state.busy = true;
  fromEl.classList.add('lift');

  await sleep(120);
  await flyCardToRow(fromEl, $('#pickedRow'));

  const [picked] = state.deckRemaining.splice(idx, 1);
  state.roundPicks.push(picked);

  await renderRound();
  state.busy = false;
}

async function undoLastPick() {
  if (!state.roundPicks.length || state.phase !== 'round' || state.busy) return;
  state.busy = true;
  state.roundPicks.pop();
  await renderRound({ dealIn: true });
  state.busy = false;
}

async function finishRound() {
  const tier = currentTier();
  if (state.roundPicks.length !== tier.pickCount) return;

  const table = $('#table');
  table.classList.add('round-exit');
  await sleep(380);

  state.results.push(
    ...state.roundPicks.map((c) => ({
      ...c,
      roundLabel: tier.label,
    })),
  );
  state.roundPicks = [];
  state.deckRemaining = [];
  state.roundIndex += 1;

  if (state.roundIndex >= ROUND_ORDER.length) {
    await startReveal();
  } else {
    table.classList.remove('round-exit');
    table.classList.add('round-enter');
    await renderRound({ dealIn: true, shuffleFirst: true });
    table.classList.remove('round-enter');
  }
}

function revealCardEl(card, resultIndex, visualIndex) {
  const el = makeCardEl(card, { inRow: true });
  el.dataset.resultIndex = String(resultIndex);
  el.style.setProperty('--i', String(visualIndex));
  el.classList.add('reveal-card', 'deal-in');
  if (resultIndex > 0) el.classList.add('waiting');
  if (resultIndex === 0) el.classList.add('active-flip');
  el.addEventListener('click', () => {
    if (Number(el.dataset.resultIndex) === state.revealIndex) flipNext();
  });
  if (resultIndex !== 0) el.disabled = true;
  return el;
}

function renderRevealGrid() {
  const table = $('#table');
  table.innerHTML = '';
  table.classList.add('reveal-stage');

  const grid = document.createElement('div');
  grid.className = 'reveal-grid';
  grid.id = 'revealGrid';

  const placements = [
    { card: state.results[0], resultIndex: 0, col: 1, row: 1 },
    { card: state.results[1], resultIndex: 1, col: 2, row: 1 },
    { gap: true, col: 3, row: 1 },
    { card: state.results[6], resultIndex: 6, col: 4, row: 1 },
    { card: state.results[2], resultIndex: 2, col: 1, row: 2 },
    { card: state.results[3], resultIndex: 3, col: 2, row: 2 },
    { card: state.results[4], resultIndex: 4, col: 1, row: 3 },
    { card: state.results[5], resultIndex: 5, col: 2, row: 3 },
  ];

  let visualIndex = 0;
  placements.forEach((item) => {
    if (item.gap) {
      const gap = document.createElement('span');
      gap.className = 'reveal-gap';
      gap.style.gridColumn = String(item.col);
      gap.style.gridRow = String(item.row);
      grid.appendChild(gap);
      return;
    }

    const el = revealCardEl(item.card, item.resultIndex, visualIndex);
    el.style.gridColumn = String(item.col);
    el.style.gridRow = String(item.row);
    grid.appendChild(el);
    visualIndex += 1;
  });

  const wuxing = document.createElement('div');
  wuxing.className = 'wuxing-panel hidden';
  wuxing.id = 'wuxingPanel';
  wuxing.style.gridColumn = '4';
  wuxing.style.gridRow = '2';
  grid.appendChild(wuxing);

  table.appendChild(grid);
}

function showWuxingPanel() {
  const panel = $('#wuxingPanel');
  if (!panel) return;
  panel.innerHTML = buildWuxingPanel(countElements(state.results));
  panel.classList.remove('hidden');
}

function revealCardByIndex(index) {
  return $('#revealGrid')?.querySelector(`[data-result-index="${index}"]`);
}

async function startReveal() {
  state.phase = 'reveal';
  state.revealIndex = 0;
  $('#pickedRow').innerHTML = '';
  $('#pickedRow').className = 'picked-row';
  $('#table').classList.remove('round-exit', 'round-enter');
  clearControls();
  setHint(`請翻開第 1 張牌（0/${state.results.length}）`);

  renderRevealGrid();

  await sleep(Math.min(state.results.length * 80 + 420, 980));
}

async function flipNext() {
  if (state.revealIndex >= state.results.length || state.busy) return;
  state.busy = true;

  const current = revealCardByIndex(state.revealIndex);
  if (!current) {
    state.busy = false;
    return;
  }

  current.classList.remove('active-flip');
  current.classList.add('flipping');
  await sleep(80);
  current.classList.add('flipped', 'revealed');
  await sleep(720);

  state.revealIndex += 1;

  if (state.revealIndex >= state.results.length) {
    state.phase = 'done';
    $('#revealGrid')
      ?.querySelectorAll('.reveal-card')
      .forEach((c) => c.classList.remove('waiting', 'active-flip', 'flipping'));
    setHint('抽牌完成 請與老師討論解說');
    clearControls();
    addControl('重新抽牌', () => renderIdle());
    showWuxingPanel();
  } else {
    const next = revealCardByIndex(state.revealIndex);
    next?.classList.remove('waiting');
    next?.classList.add('active-flip');
    if (next) next.disabled = false;
    setHint(`請翻開第 ${state.revealIndex + 1} 張牌（${state.revealIndex}/${state.results.length}）`);
  }

  state.busy = false;
}

function init() {
  $('#infoBtn').addEventListener('click', () => $('#infoDialog').showModal());
  $('#closeInfoBtn').addEventListener('click', () => $('#infoDialog').close());
  renderIdle();
}

init();
