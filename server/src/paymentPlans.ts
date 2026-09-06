export interface PaymentPlan {
  id: string
  name: string
  description: string
  amount: number
  days: number
  periodLabel: string
  starDraw: boolean
  lifetime?: boolean
  adminOnly?: boolean
}

export const LIFETIME_MEMBERSHIP_EXPIRY = '2099-12-31T23:59:59.999Z'

export const PAYMENT_PLANS: PaymentPlan[] = [
  {
    id: 'member_monthly',
    name: '付費會員 · 單月',
    description: '大限流年、列印儲存等完整功能',
    amount: 600,
    days: 30,
    periodLabel: '1 個月',
    starDraw: false,
  },
  {
    id: 'member_half_year',
    name: '付費會員 · 半年',
    description: '大限流年、列印儲存等完整功能',
    amount: 3300,
    days: 182,
    periodLabel: '半年',
    starDraw: false,
  },
  {
    id: 'member_yearly',
    name: '付費會員 · 一年',
    description: '大限流年、列印儲存等完整功能',
    amount: 6000,
    days: 365,
    periodLabel: '1 年',
    starDraw: false,
  },
  {
    id: 'member_lifetime',
    name: '付費會員 · 終身',
    description: '大限流年、列印儲存等完整功能',
    amount: 0,
    days: 0,
    periodLabel: '終身',
    starDraw: false,
    lifetime: true,
    adminOnly: true,
  },
]

export function getPaymentPlan(planId: string): PaymentPlan | undefined {
  return PAYMENT_PLANS.find((p) => p.id === planId)
}

export function listPublicPlans() {
  return PAYMENT_PLANS.filter((p) => !p.adminOnly).map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    amount: p.amount,
    days: p.days,
    periodLabel: p.periodLabel,
    starDraw: p.starDraw,
  }))
}

export function getPlanLabel(planId: string | null): string {
  if (!planId) return '免費會員'
  const plan = getPaymentPlan(planId)
  return plan?.name ?? '付費會員'
}
