import type { Request } from 'express'

export const GUEST_DAILY_AI_LIMIT = Number(process.env.GUEST_DAILY_AI_LIMIT || 5)

export function clientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for']
  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0].trim()
  }
  return req.ip || 'unknown'
}
