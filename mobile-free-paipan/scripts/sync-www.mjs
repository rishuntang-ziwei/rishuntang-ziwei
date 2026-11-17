#!/usr/bin/env node
import { cpSync, mkdirSync, rmSync, writeFileSync, existsSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const mobileRoot = resolve(__dirname, '..')
const repoRoot = resolve(mobileRoot, '..')
const wwwRoot = join(mobileRoot, 'www')
const webSrc = join(repoRoot, 'p')

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

function rewriteFreePaipanIndex(raw) {
  return raw
    .replaceAll('../bracelet-card/assets/rishuntang-logo.png', '../assets/rishuntang-logo.png')
    .replaceAll(' · 網頁版', '')
}

console.log('sync-www: cleaning www/')
rmSync(wwwRoot, { recursive: true, force: true })
ensureDir(wwwRoot)

console.log('sync-www: root index redirects to p/')
writeFileSync(
  join(wwwRoot, 'index.html'),
  [
    '<!DOCTYPE html>',
    '<html lang="zh-Hant">',
    '<head>',
    '  <meta charset="UTF-8" />',
    '  <meta http-equiv="refresh" content="0;url=./p/" />',
    '  <meta name="viewport" content="width=device-width, initial-scale=1" />',
    '  <title>日舜堂簡易本命排盤</title>',
    '  <script>location.replace("./p/")</script>',
    '</head>',
    '<body>',
    '  <p><a href="./p/">前往簡易本命排盤</a></p>',
    '</body>',
    '</html>',
    '',
  ].join('\n'),
  'utf8',
)

console.log('sync-www: copying p form into www/p/')
if (!existsSync(webSrc)) {
  throw new Error('缺少來源目錄：' + webSrc)
}
const freeDest = join(wwwRoot, 'p')
ensureDir(freeDest)
writeFileSync(
  join(freeDest, 'index.html'),
  rewriteFreePaipanIndex(readFileSync(join(webSrc, 'index.html'), 'utf8')),
  'utf8',
)
copyFile(join(webSrc, 'app.css'), join(freeDest, 'app.css'))
copyFile(join(webSrc, 'app.js'), join(freeDest, 'app.js'))

console.log('sync-www: copying chart.html')
const chartSrc = join(repoRoot, 'chart.html')
if (!existsSync(chartSrc)) {
  throw new Error('缺少來源檔案：' + chartSrc)
}
copyFile(chartSrc, join(wwwRoot, 'chart.html'))

console.log('sync-www: copying vendor deps for guest chart')
ensureDir(join(wwwRoot, 'vendor'))
for (const name of [
  'lunar.min.js',
  'iztro.min.js',
  'rishuntang-brightness.js',
  'natal-reading.mjs',
  'wuxing-panel.mjs',
  'ai-formatter.mjs',
  'ai-interpreter.mjs',
  'auth-common.js',
  'auth-app.js',
  'payment-ui.js',
  'chart-whiteboard.js',
  'pwa-register.js',
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

const iconsDir = join(repoRoot, 'icons')
if (existsSync(iconsDir)) {
  copyDir(iconsDir, join(wwwRoot, 'icons'))
}

const packageJson = JSON.parse(readFileSync(join(mobileRoot, 'package.json'), 'utf8'))
writeFileSync(
  join(wwwRoot, 'build-info.json'),
  JSON.stringify(
    {
      appName: '日舜堂簡易排盤',
      appId: 'com.rishuntang.freepaipan',
      version: packageJson.version,
      source: 'p/ + chart.html guest',
      syncedAt: new Date().toISOString(),
    },
    null,
    2,
  ) + '\n',
  'utf8',
)

console.log('sync-www: done →', wwwRoot)
