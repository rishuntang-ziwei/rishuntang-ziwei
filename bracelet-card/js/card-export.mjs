import { toPng } from 'https://esm.sh/html-to-image@1.11.11';

const EXPORT_PX = 779; // 66 mm @ 300 DPI（含 3 mm 出血）

let assetsReady;

function preloadAssets() {
  if (assetsReady) return assetsReady;
  assetsReady = (async () => {
    await document.fonts.ready;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = new URL('./assets/qiankun-bg.png', window.location.href).href;
    await img.decode();
  })();
  return assetsReady;
}

function triggerDownload(dataUrl, filename) {
  const link = document.createElement('a');
  link.download = filename;
  link.href = dataUrl;
  link.click();
}

function absolutizeSvgImages(root) {
  root.querySelectorAll('image[href]').forEach((node) => {
    const href = node.getAttribute('href');
    if (href && !href.startsWith('data:') && !href.startsWith('http')) {
      node.setAttribute('href', new URL(href, window.location.href).href);
    }
  });
}

async function captureCardElement(cardEl) {
  const host = document.createElement('div');
  host.className = 'export-capture-root';
  const clone = cardEl.cloneNode(true);
  clone.querySelector('.card-trim-guide')?.remove();
  host.appendChild(clone);
  document.body.appendChild(host);

  try {
    absolutizeSvgImages(clone);
    const width = clone.getBoundingClientRect().width;
    if (!width) throw new Error('無法計算圖卡尺寸');

    const pixelRatio = EXPORT_PX / width;
    return await toPng(clone, {
      pixelRatio,
      cacheBust: true,
      skipFonts: false,
    });
  } finally {
    host.remove();
  }
}

function buildFilename(side, displayName, date) {
  const datePart = date.replace(/-/g, '');
  const namePart = displayName ? `${displayName}-` : '';
  return `日舜堂手環圖卡-${namePart}${side}-${datePart}.png`;
}

export async function downloadCardSide({ side, displayName, date }) {
  const selector = side === 'front' ? '.print-card-front' : '.print-card-back';
  const cardEl = document.querySelector(`#cardPreview ${selector}`);
  if (!cardEl) {
    throw new Error('請先產生圖卡');
  }

  await preloadAssets();
  const dataUrl = await captureCardElement(cardEl);
  const sideLabel = side === 'front' ? '正面' : '背面';
  triggerDownload(dataUrl, buildFilename(sideLabel, displayName, date));
}

export async function downloadBothCards({ displayName, date }) {
  await downloadCardSide({ side: 'front', displayName, date });
  await new Promise((resolve) => setTimeout(resolve, 400));
  await downloadCardSide({ side: 'back', displayName, date });
}
