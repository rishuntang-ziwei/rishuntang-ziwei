import crypto from 'node:crypto'

export function maxTrustedDevicesPerAdmin(): number {
  const n = Number(process.env.MAX_TRUSTED_DEVICES ?? 3)
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 3
}

export function generateDeviceToken(): string {
  return crypto.randomBytes(32).toString('base64url')
}

export function hashDeviceToken(token: string): string {
  const secret = process.env.JWT_SECRET || 'dev-only-change-me'
  return crypto.createHash('sha256').update(`${token}:${secret}`).digest('hex')
}

export function verifyDeviceToken(token: string, storedHash: string): boolean {
  const computed = hashDeviceToken(token)
  try {
    return crypto.timingSafeEqual(Buffer.from(computed, 'hex'), Buffer.from(storedHash, 'hex'))
  } catch {
    return false
  }
}

export function isValidDeviceId(deviceId: string): boolean {
  return /^[a-zA-Z0-9_-]{8,64}$/.test(deviceId)
}

export interface PublicTrustedDevice {
  id: number
  userId: number
  userName: string
  userEmail: string
  deviceId: string
  label: string | null
  userAgent: string | null
  lastUsedAt: string | null
  createdAt: string
}
