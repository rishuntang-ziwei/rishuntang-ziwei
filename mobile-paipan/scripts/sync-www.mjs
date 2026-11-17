#!/usr/bin/env node
import { cpSync, mkdirSync, rmSync, writeFileSync, existsSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const mobileRoot = resolve(__dirname, '..')
const repoRoot = resolve(mobileRoot, '..')
const wwwRoot = join(mobileRoot, 'www')

function ensureDir(path) {
  mkdirSync(path, { recursive: true })
}

function copyDir(src, dest) {
  if (!existsSync(src)) {
    throw new Error('缺少來源目錄：' + src)
  }
  ensureDir(dirname(dest))
  cpSync(src, dest, { recursive: true })
}

function copyFile(src, dest) {
  if (!existsSync(src)) {
    throw new Error('缺少來源檔案：' + src)
  }
  ensureDir(dirname(dest))
  cpSync(src, dest)
}

function patchChartHtml(raw) {
  let html = raw

  // Core-only module imports: keep wuxing-panel, stub AI modules.
  html = html.replace(
    /<script type="module">[\s\S]*?<\/script>/,
    [
      '<script type="module">',
      "    import * as WuxingPanel from './vendor/wuxing-panel.mjs'",
      '    window.WuxingPanel = WuxingPanel',
      '    window.AiFormatter = {}',
      '    window.AiInterpreter = {}',
      '  </script>',
    ].join('\n'),
  )

  // Drop excluded web extras.
  html = html.replace(
    /\s*<script src="\.\/vendor\/payment-ui\.js[^"]*"><\/script>/g,
    '',
  )
  html = html.replace(
    /\s*<script src="\.\/vendor\/chart-whiteboard\.js[^"]*"><\/script>/g,
    '',
  )
  html = html.replace(
    /\s*<script src="\.\/vendor\/pwa-register\.js[^"]*"><\/script>/g,
    '',
  )

  // App shell CSS: hide star-draw / whiteboard / bracelet / AI entry points.
  if (!html.includes('paipan-app-shell.css')) {
    html = html.replace(
      '</head>',
      '  <link rel="stylesheet" href="./paipan-app-shell.css" />\n  </head>',
    )
  }

  return html
}

console.log('sync-www: cleaning www/')
rmSync(wwwRoot, { recursive: true, force: true })
ensureDir(wwwRoot)

console.log('sync-www: copying portal entry')
copyFile(join(mobileRoot, 'portal/index.html'), join(wwwRoot, 'index.html'))
copyFile(join(mobileRoot, 'portal/portal.css'), join(wwwRoot, 'portal.css'))
copyFile(join(mobileRoot, 'portal/portal.js'), join(wwwRoot, 'portal.js'))
copyFile(
  join(mobileRoot, 'portal/paipan-app-shell.css'),
  join(wwwRoot, 'paipan-app-shell.css'),
)

console.log('sync-www: copying patched chart.html')
const chartSrc = join(repoRoot, 'chart.html')
if (!existsSync(chartSrc)) {
  throw new Error('缺少來源檔案：' + chartSrc)
}
writeFileSync(join(wwwRoot, 'chart.html'), patchChartHtml(readFileSync(chartSrc, 'utf8')), 'utf8')

console.log('sync-www: copying vendor auth + register + core chart deps')
ensureDir(join(wwwRoot, 'vendor'))
for (const name of [
  'auth-common.js',
  'auth-app.js',
  'lunar.min.js',
  'iztro.min.js',
  'rishuntang-brightness.js',
  'wuxing-panel.mjs',
  'phone-intl.js',
  'register-birth.js',
]) {
  copyFile(join(repoRoot, 'vendor', name), join(wwwRoot, 'vendor', name))
}

const brightnessJson = join(repoRoot, 'vendor/rishuntang-brightness.json')
if (existsSync(brightnessJson)) {
  copyFile(brightnessJson, join(wwwRoot, 'vendor/rishuntang-brightness.json'))
}

writeFileSync(
  join(wwwRoot, 'vendor/site-config.js'),
  [
    ';(function () {',
    "  window.API_BASE = 'https://rishuntang-ziwei-api.onrender.com'",
    '})()',
    '',
  ].join('\n'),
  'utf8',
)

console.log('sync-www: copying theme + brand assets')
ensureDir(join(wwwRoot, 'css'))
copyFile(join(repoRoot, 'css/theme.css'), join(wwwRoot, 'css/theme.css'))

ensureDir(join(wwwRoot, 'assets'))
copyFile(
  join(repoRoot, 'bracelet-card/assets/rishuntang-logo.png'),
  join(wwwRoot, 'assets/rishuntang-logo.png'),
)

const calligraphy = join(repoRoot, 'assets/bg-calligraphy.png')
if (existsSync(calligraphy)) {
  copyFile(calligraphy, join(wwwRoot, 'assets/bg-calligraphy.png'))
}

const ancestor = join(repoRoot, 'assets/zushi-jiangziya.png')
if (existsSync(ancestor)) {
  copyFile(ancestor, join(wwwRoot, 'assets/zushi-jiangziya.png'))
}

const iconsDir = join(repoRoot, 'icons')
if (existsSync(iconsDir)) {
  copyDir(iconsDir, join(wwwRoot, 'icons'))
}

const packageJson = JSON.parse(readFileSync(join(mobileRoot, 'package.json'), 'utf8'))
writeFileSync(
  join(wwwRoot, 'build-info.json'),
  JSON.stringify(
    {
      appName: '日舜堂紫微排盤',
      appId: 'com.rishuntang.paipan',
      version: packageJson.version,
      syncedAt: new Date().toISOString(),
    },
    null,
    2,
  ) + '\n',
  'utf8',
)

console.log('sync-www: done →', wwwRoot)
