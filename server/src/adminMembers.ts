import { getPlanLabel, LIFETIME_MEMBERSHIP_EXPIRY } from './paymentPlans.js'
import type { PublicUser } from './types.js'

export const EXPIRING_SOON_DAYS = 30

export type MemberSegment = 'free' | 'paid' | 'pending' | 'admin' | 'expiring'

export function isLifetimeMembership(expiresAt: string | null | undefined): boolean {
  if (!expiresAt) return false
  return new Date(expiresAt).getFullYear() >= 2099
}

export function expiringWithinDays(user: PublicUser, days = EXPIRING_SOON_DAYS): boolean {
  if (user.role !== 'user' || !user.membershipActive || !user.membershipExpiresAt) return false
  if (isLifetimeMembership(user.membershipExpiresAt)) return false
  const exp = new Date(user.membershipExpiresAt).getTime()
  const now = Date.now()
  return exp > now && exp <= now + days * 24 * 60 * 60 * 1000
}

export function daysUntilMembershipExpiry(user: PublicUser): number | null {
  if (!user.membershipActive || !user.membershipExpiresAt) return null
  if (isLifetimeMembership(user.membershipExpiresAt)) return null
  const diff = new Date(user.membershipExpiresAt).getTime() - Date.now()
  if (diff <= 0) return 0
  return Math.ceil(diff / (24 * 60 * 60 * 1000))
}

export function memberTierDetailedLabel(user: PublicUser): string {
  if (user.role === 'admin') return '管理員'
  if (user.status === 'pending') return '待審核'
  if (user.status === 'rejected') return '已拒絕'
  const parts: string[] = []
  parts.push(user.membershipActive ? '付費會員' : '免費會員')
  if (user.starDrawEnabled) parts.push('神牌已開通')
  return parts.join(' · ')
}

export function segmentMembers(users: PublicUser[], segment: MemberSegment): PublicUser[] {
  switch (segment) {
    case 'free':
      return users.filter((u) => u.role === 'user' && !u.membershipActive && u.status !== 'pending')
    case 'paid':
      return users.filter((u) => u.role === 'user' && u.membershipActive)
    case 'expiring':
      return users
        .filter((u) => expiringWithinDays(u))
        .sort(
          (a, b) =>
            new Date(a.membershipExpiresAt!).getTime() - new Date(b.membershipExpiresAt!).getTime(),
        )
    case 'pending':
      return users.filter((u) => u.role === 'user' && u.status === 'pending')
    case 'admin':
      return users.filter((u) => u.role === 'admin')
  }
}

export function memberSummary(users: PublicUser[]) {
  return {
    free: segmentMembers(users, 'free').length,
    paid: segmentMembers(users, 'paid').length,
    expiring: segmentMembers(users, 'expiring').length,
    pending: segmentMembers(users, 'pending').length,
    admins: segmentMembers(users, 'admin').length,
  }
}

export function toAdminMemberRow(user: PublicUser) {
  return {
    ...user,
    membershipPlanLabel: getPlanLabel(user.membershipPlan),
    memberTierLabel: memberTierDetailedLabel(user),
    daysUntilExpiry: daysUntilMembershipExpiry(user),
  }
}

export function parseMemberSegment(value: string): MemberSegment | null {
  if (value === 'free' || value === 'paid' || value === 'pending' || value === 'expiring') return value
  if (value === 'admins' || value === 'admin') return 'admin'
  return null
}

export function parseMembershipExpiryInput(value: unknown): string | null | undefined {
  if (value === null || value === 'revoke') return null
  if (value === 'lifetime') return LIFETIME_MEMBERSHIP_EXPIRY
  const raw = String(value ?? '').trim()
  if (!raw) return undefined
  const date = new Date(raw.includes('T') ? raw : `${raw}T23:59:59.999+08:00`)
  if (Number.isNaN(date.getTime())) return undefined
  return date.toISOString()
}
