import { getPaymentPlan, LIFETIME_MEMBERSHIP_EXPIRY } from './paymentPlans.js'
import type { UserRow } from './types.js'

export function computeMembershipExpiry(
  currentExpiresAt: string | null,
  planDays: number,
  now = Date.now(),
): string {
  const base = currentExpiresAt
    ? Math.max(new Date(currentExpiresAt).getTime(), now)
    : now
  return new Date(base + planDays * 24 * 60 * 60 * 1000).toISOString()
}

export function resolveMembershipGrant(user: UserRow, planId: string) {
  const plan = getPaymentPlan(planId)
  if (!plan) return null

  const expiresAt = plan.lifetime
    ? LIFETIME_MEMBERSHIP_EXPIRY
    : computeMembershipExpiry(user.membership_expires_at, plan.days)

  return {
    planId: plan.id,
    expiresAt,
    planLabel: plan.name,
    planDays: plan.days,
  }
}
