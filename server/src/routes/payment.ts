import { Router } from 'express'
import { getNewebPayConfig } from '../newebpay.js'
import { createCheckoutForUser, handleNewebPayNotify } from '../paymentService.js'
import { listPublicPlans, getPlanLabel } from '../paymentPlans.js'
import { requireAuth } from '../middleware.js'

const router = Router()

router.get('/plans', (_req, res) => {
  res.json({ plans: listPublicPlans() })
})

router.get('/status', requireAuth, (req, res) => {
  const user = req.authUser!
  res.json({
    status: user.status,
    membershipTier: user.membershipTier,
    membershipPlan: user.membershipPlan,
    membershipPlanLabel: getPlanLabel(user.membershipPlan),
    membershipExpiresAt: user.membershipExpiresAt,
    membershipActive: user.membershipActive,
    starDrawEnabled: user.starDrawEnabled,
    paymentEnabled: Boolean(getNewebPayConfig()),
  })
})

router.post('/checkout', requireAuth, async (req, res) => {
  const planId = String(req.body?.planId ?? '').trim()
  if (!planId) {
    res.status(400).json({ error: '請選擇方案' })
    return
  }

  try {
    const result = await createCheckoutForUser(req.authUser!.id, req.authUser!.email, planId)
    res.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : '建立付款失敗'
    res.status(400).json({ error: message })
  }
})

router.post('/newebpay/notify', async (req, res) => {
  try {
    await handleNewebPayNotify(req.body as Record<string, unknown>)
    res.status(200).send('OK')
  } catch (err) {
    console.error('[payment notify]', err)
    res.status(400).send('FAIL')
  }
})

router.post('/newebpay/return', async (req, res) => {
  const config = getNewebPayConfig()
  const siteUrl = config?.siteUrl || 'https://rishuntang.com'

  try {
    await handleNewebPayNotify(req.body as Record<string, unknown>)
    res.redirect(`${siteUrl}/chart.html?payment=success`)
  } catch (err) {
    console.error('[payment return]', err)
    res.redirect(`${siteUrl}/chart.html?payment=failed`)
  }
})

export default router
