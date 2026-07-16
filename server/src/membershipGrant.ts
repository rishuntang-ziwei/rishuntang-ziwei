import { getPaymentPlan } from './paymentPlans.js'
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

  return {
    planId: plan.id,
    expiresAt: computeMembershipExpiry(user.membership_expires_at, plan.days),
    starDrawEnabled: plan.starDraw || user.star_draw_enabled,
    planLabel: plan.name,
    planDays: plan.days,
  }
}
