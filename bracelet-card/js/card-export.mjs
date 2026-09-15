import { toPng } from 'https://esm.sh/html-to-image@1.11.11';

const EXPORT_WIDTH_PX = 1961; // 166 mm @ 300 DPI（含出血）
const EXPORT_HEIGHT_PX = 1016; // 86 mm @ 300 DPI

let assetsReady;

function preloadAssets() {
  if (assetsReady) return assetsReady;
  assetsReady = (async () => {
    await document.fonts.ready;
    const urls = [
      './assets/temple-altar.png',
      './assets/rishuntang-logo.png',
    ];
    await Promise.all(urls.map(async (path) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = new URL(path, window.location.href).href;
      await img.decode();
    }));
  })();
  return assetsReady;
}

function triggerDownload(dataUrl, filename) {
  const link = document.createElement('a');
  link.download = filename;
  link.href = dataUrl;
  link.click();
}

function absolutizeImages(root) {
  root.querySelectorAll('img[src]').forEach((node) => {
    const src = node.getAttribute('src');
    if (src && !src.startsWith('data:') && !src.startsWith('http')) {
      node.setAttribute('src', new URL(src, window.location.href).href);
    }
  });
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
    absolutizeImages(clone);
    const width = clone.getBoundingClientRect().width;
    if (!width) throw new Error('無法計算圖卡尺寸');

    const pixelRatio = EXPORT_WIDTH_PX / width;
    return await toPng(clone, {
      pixelRatio,
      cacheBust: true,
      skipFonts: false,
    });
  } finally {
    host.remove();
  }
}

function buildFilename(displayName, date) {
  const datePart = date.replace(/-/g, '');
  const namePart = displayName ? `${displayName}-` : '';
  return `國際日舜堂手環圖卡-${namePart}${datePart}.png`;
}

export async function downloadCard({ displayName, date }) {
  const cardEl = document.querySelector('#cardPreview .print-card-landscape');
  if (!cardEl) {
    throw new Error('請先產生圖卡');
  }

  await preloadAssets();
  const dataUrl = await captureCardElement(cardEl);
  triggerDownload(dataUrl, buildFilename(displayName, date));
}

/** @deprecated */
export async function downloadCardSide(opts) {
  return downloadCard(opts);
}

/** @deprecated */
export async function downloadBothCards(opts) {
  return downloadCard(opts);
}
