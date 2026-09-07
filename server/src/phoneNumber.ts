/** Normalize to E.164-like +digits (spaces/dashes removed). */
export function normalizePhone(phone: string): string {
  const trimmed = phone.trim()
  if (!trimmed) return ''
  if (trimmed.startsWith('+')) {
    const digits = trimmed.slice(1).replace(/\D/g, '')
    return digits ? `+${digits}` : ''
  }
  return trimmed.replace(/[\s-]/g, '')
}

/** Compare phones across legacy TW local and international formats. */
export function normalizePhoneForCompare(phone: string): string {
  let normalized = normalizePhone(phone)
  if (!normalized) return ''

  if (normalized.startsWith('+')) return normalized

  const digits = normalized.replace(/\D/g, '')
  if (/^09\d{8}$/.test(digits)) return `+886${digits.slice(1)}`
  if (/^886\d+$/.test(digits)) return `+${digits}`
  if (/^0\d{8,10}$/.test(digits)) return `+886${digits.slice(1)}`

  return `+${digits}`
}

export function validatePhone(phone: string): boolean {
  const normalized = normalizePhoneForCompare(phone)
  if (!normalized.startsWith('+')) return false
  const digits = normalized.slice(1)
  return /^\d{7,15}$/.test(digits)
}

export function phonesMatch(stored: string, input: string): boolean {
  return normalizePhoneForCompare(stored) === normalizePhoneForCompare(input)
}

export function formatPhoneForStorage(phone: string): string {
  return normalizePhoneForCompare(phone)
}
