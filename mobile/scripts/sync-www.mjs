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

console.log('sync-www: cleaning www/')
rmSync(wwwRoot, { recursive: true, force: true })
ensureDir(wwwRoot)

console.log('sync-www: copying portal entry')
copyFile(join(mobileRoot, 'portal/index.html'), join(wwwRoot, 'index.html'))
copyFile(join(mobileRoot, 'portal/portal.css'), join(wwwRoot, 'portal.css'))
copyFile(join(mobileRoot, 'portal/portal.js'), join(wwwRoot, 'portal.js'))

console.log('sync-www: copying star-draw')
copyDir(join(repoRoot, 'star-draw'), join(wwwRoot, 'star-draw'))

console.log('sync-www: copying vendor auth + site-config')
ensureDir(join(wwwRoot, 'vendor'))
for (const name of ['auth-common.js', 'auth-star-draw.js', 'site-config.js']) {
  copyFile(join(repoRoot, 'vendor', name), join(wwwRoot, 'vendor', name))
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
const logoSrc = join(repoRoot, 'bracelet-card/assets/rishuntang-logo.png')
copyFile(logoSrc, join(wwwRoot, 'assets/rishuntang-logo.png'))

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
      appName: '先知斗數神牌',
      appId: 'com.rishuntang.xianshi',
      version: packageJson.version,
      syncedAt: new Date().toISOString(),
    },
    null,
    2,
  ) + '\n',
  'utf8',
)

console.log('sync-www: done →', wwwRoot)
