import {
  buildBraceletCardPair,
  countBaziElements,
  dayMasterElement,
  formatLunarBirthLine,
  formatSolarBirthLine,
  getSupplementAdvice,
} from './card-builder.mjs';

const TIME_LABELS = {
  0: '早子時 (00:00–01:00)',
  1: '丑時 (01:00–03:00)',
  2: '寅時 (03:00–05:00)',
  3: '卯時 (05:00–07:00)',
  4: '辰時 (07:00–09:00)',
  5: '巳時 (09:00–11:00)',
  6: '午時 (11:00–13:00)',
  7: '未時 (13:00–15:00)',
  8: '申時 (15:00–17:00)',
  9: '酉時 (17:00–19:00)',
  10: '戌時 (19:00–21:00)',
  11: '亥時 (21:00–23:00)',
  12: '晚子時 (23:00–00:00)',
};

const $ = (sel) => document.querySelector(sel);

function normalizeDate(date) {
  const [y, m, d] = date.split('-');
  return `${Number(y)}-${Number(m)}-${Number(d)}`;
}

function computeAstrolabe({ date, timeIndex, gender }) {
  const { astro } = window.iztro;
  astro.config({
    mutagens: {
      gengHeavenly: ['taiyangMaj', 'wuquMaj', 'tiantongMaj', 'taiyinMaj'],
    },
  });
  return astro.bySolar(normalizeDate(date), Number(timeIndex), gender, true, 'zh-TW');
}

function renderCards() {
  const date = $('#birthDate').value;
  const timeIndex = $('#birthTime').value;
  const gender = $('#gender').value;
  const displayName = $('#displayName').value.trim();

  if (!date) {
    alert('請選擇出生日期');
    return;
  }
  if (timeIndex === '') {
    alert('請選擇出生時辰');
    return;
  }

  const astrolabe = computeAstrolabe({ date, timeIndex, gender });
  const chineseDate = astrolabe.rawDates.chineseDate;
  const counts = countBaziElements(chineseDate);
  const tieBreaker = dayMasterElement(chineseDate);
  const advice = getSupplementAdvice(counts, tieBreaker);
  const solarBirthLine = formatSolarBirthLine(date, timeIndex);
  const lunarBirthLine = formatLunarBirthLine(astrolabe, timeIndex);
  const [y, m, d] = date.split('-');
  const birthLabel = `${y}年${Number(m)}月${Number(d)}日（國曆）`;
  const timeLabel = TIME_LABELS[timeIndex] ?? '';

  const data = {
    counts,
    advice,
    displayName,
    solarBirthLine,
    lunarBirthLine,
    birthLabel,
    timeLabel,
    markerId: `bracelet-wuxing-${Date.now()}`,
  };

  $('#cardPreview').innerHTML = buildBraceletCardPair(data);
  $('#resultSummary').textContent = `${advice.phrase} · ${advice.subtitle}`;
  $('#resultSummary').classList.remove('hidden');
}

function initDefaults() {
  $('#birthDate').value = '1990-06-15';
  $('#birthTime').value = '6';
  renderCards();
}

function bindEvents() {
  $('#generateBtn').addEventListener('click', renderCards);
  $('#printBtn').addEventListener('click', () => window.print());
  $('#toggleBleed').addEventListener('change', (e) => {
    document.body.classList.toggle('show-bleed', e.target.checked);
  });
  $('#toggleBack').addEventListener('change', (e) => {
    document.body.classList.toggle('hide-back', !e.target.checked);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  if (!window.iztro) {
    $('#resultSummary').textContent = '排盤程式載入失敗，請重新整理頁面。';
    return;
  }
  bindEvents();
  initDefaults();
});
