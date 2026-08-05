import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const vendorPath = path.resolve(__dirname, '../vendor/iztro.min.js')

const OLD = 'u&&t&&o>15&&12!==n?1:0'
const NEXT = 'u&&t&&12!==n?1:0'

let source = fs.readFileSync(vendorPath, 'utf8')
if (source.includes(OLD)) {
  source = source.replace(OLD, NEXT)
  fs.writeFileSync(vendorPath, source)
  console.log('patched vendor/iztro.min.js leap-month rule')
} else if (source.includes(NEXT)) {
  console.log('vendor/iztro.min.js already patched')
} else {
  console.warn('vendor/iztro.min.js: leap-month pattern not found — manual check needed')
}
