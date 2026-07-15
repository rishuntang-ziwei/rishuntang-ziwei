import { getPlanLabel } from './paymentPlans.js'
import type { PublicUser } from './types.js'

export type MemberSegment = 'free' | 'paid' | 'pending' | 'admin'

export function segmentMembers(users: PublicUser[], segment: MemberSegment): PublicUser[] {
  switch (segment) {
    case 'free':
      return users.filter((u) => u.role === 'user' && !u.membershipActive && u.status !== 'pending')
    case 'paid':
      return users.filter((u) => u.role === 'user' && u.membershipActive)
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
    pending: segmentMembers(users, 'pending').length,
    admins: segmentMembers(users, 'admin').length,
  }
}

export function toAdminMemberRow(user: PublicUser) {
  return {
    ...user,
    membershipPlanLabel: getPlanLabel(user.membershipPlan),
  }
}

export function parseMemberSegment(value: string): MemberSegment | null {
  if (value === 'free' || value === 'paid' || value === 'pending') return value
  if (value === 'admins' || value === 'admin') return 'admin'
  return null
}
