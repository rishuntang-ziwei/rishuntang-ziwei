#!/usr/bin/env node
import { cpSync, mkdirSync, rmSync, writeFileSync, existsSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const mobileRoot = resolve(__dirname, '..')
const repoRoot = resolve(mobileRoot, '..')
const wwwRoot = join(mobileRoot, 'www')
const webSrc = join(repoRoot, 'free-paipan')

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

function rewriteIndexHtml(raw) {
  return raw
    .replaceAll('../vendor/', './vendor/')
    .replaceAll('../css/', './css/')
    .replaceAll('../icons/', './icons/')
    .replaceAll('../bracelet-card/assets/rishuntang-logo.png', './assets/rishuntang-logo.png')
    .replaceAll(' · 網頁版', '')
}

function rewriteAppJs(raw) {
  return raw.replace(
    "from '../vendor/natal-reading.mjs'",
    "from './vendor/natal-reading.mjs'",
  )
}

console.log('sync-www: cleaning www/')
rmSync(wwwRoot, { recursive: true, force: true })
ensureDir(wwwRoot)

console.log('sync-www: copying free-paipan entry (path rewrite for Capacitor)')
if (!existsSync(webSrc)) {
  throw new Error('缺少來源目錄：' + webSrc)
}

writeFileSync(
  join(wwwRoot, 'index.html'),
  rewriteIndexHtml(readFileSync(join(webSrc, 'index.html'), 'utf8')),
  'utf8',
)
copyFile(join(webSrc, 'app.css'), join(wwwRoot, 'app.css'))
writeFileSync(
  join(wwwRoot, 'app.js'),
  rewriteAppJs(readFileSync(join(webSrc, 'app.js'), 'utf8')),
  'utf8',
)

console.log('sync-www: copying vendor chart deps')
ensureDir(join(wwwRoot, 'vendor'))
for (const name of [
  'lunar.min.js',
  'iztro.min.js',
  'rishuntang-brightness.js',
  'natal-reading.mjs',
]) {
  copyFile(join(repoRoot, 'vendor', name), join(wwwRoot, 'vendor', name))
}

const brightnessJson = join(repoRoot, 'vendor/rishuntang-brightness.json')
if (existsSync(brightnessJson)) {
  copyFile(brightnessJson, join(wwwRoot, 'vendor/rishuntang-brightness.json'))
}

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
      source: 'free-paipan/',
      syncedAt: new Date().toISOString(),
    },
    null,
    2,
  ) + '\n',
  'utf8',
)

console.log('sync-www: done →', wwwRoot)
