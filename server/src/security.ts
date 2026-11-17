import type { CorsOptions } from 'cors'
import rateLimit from 'express-rate-limit'
import helmet from 'helmet'

export function isProductionDeploy(): boolean {
  return Boolean(process.env.RENDER) || process.env.NODE_ENV === 'production'
}

function defaultCorsOrigins(): string[] {
  const fromEnv = [
    process.env.PUBLIC_SITE_URL?.trim(),
    process.env.PUBLIC_APP_URL?.trim(),
    'https://rishuntang.com',
    'https://www.rishuntang.com',
    'https://rishuntang-ziwei.github.io',
  ].filter(Boolean) as string[]

  const extra =
    process.env.CORS_ORIGINS?.split(',')
      .map((s) => s.trim())
      .filter(Boolean) ?? []

  return [...new Set([...fromEnv, ...extra])]
}

function isLocalDevOrigin(origin: string): boolean {
  return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)
}

/** Capacitor / Ionic WebView origins (Android uses https://localhost). */
function isNativeShellOrigin(origin: string): boolean {
  return /^(capacitor|ionic):\/\/localhost$/i.test(origin) || isLocalDevOrigin(origin)
}

export function buildCorsOptions(): CorsOptions {
  const allowed = new Set(defaultCorsOrigins())

  return {
    origin(origin, callback) {
      if (!origin) {
        callback(null, true)
        return
      }
      // Always allow Capacitor app shell (production API is called from https://localhost).
      if (isNativeShellOrigin(origin) || allowed.has(origin)) {
        callback(null, true)
        return
      }
      // Do not throw — throwing becomes HTTP 500 and browsers only show "Failed to fetch".
      callback(null, false)
    },
  }
}

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: '登入相關請求過於頻繁，請 15 分鐘後再試' },
})

export const apiRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 180,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: '請求過於頻繁，請稍後再試' },
})

export function securityHelmet() {
  return helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    // Allow Capacitor / GitHub Pages webviews to read API responses cross-origin.
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
}
