import {
  createPaymentOrder,
  findPaymentOrderByMerchantOrderNo,
  fulfillPaymentOrder,
  markPaymentOrderPaid,
} from './db.js'
import { getPaymentPlan } from './paymentPlans.js'
import { createCheckoutTrade, getNewebPayConfig, parseNotifyTradeInfo, verifyTradeSha } from './newebpay.js'

function notifyResult(payload: Record<string, unknown>): Record<string, unknown> {
  const nested = payload.Result
  if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
    return nested as Record<string, unknown>
  }
  return payload
}

export async function handleNewebPayNotify(body: Record<string, unknown>) {
  const config = getNewebPayConfig()
  if (!config) {
    throw new Error('金流未設定')
  }

  const status = String(body.Status ?? '')
  const tradeInfo = String(body.TradeInfo ?? '')
  const tradeSha = String(body.TradeSha ?? '')

  if (!tradeInfo || !verifyTradeSha(tradeInfo, tradeSha, config.hashKey, config.hashIV)) {
    throw new Error('TradeSha 驗證失敗')
  }

  const payload = parseNotifyTradeInfo(tradeInfo, config.hashKey, config.hashIV)
  const result = notifyResult(payload)
  const merchantOrderNo = String(result.MerchantOrderNo ?? '')
  const tradeNo = String(result.TradeNo ?? '')
  const payStatus = String(result.Status ?? payload.Status ?? status)

  const order = await findPaymentOrderByMerchantOrderNo(merchantOrderNo)
  if (!order) {
    throw new Error('找不到訂單')
  }
  if (order.status === 'paid') {
    return order
  }

  if (payStatus === 'SUCCESS' || status === 'SUCCESS') {
    const paid = await markPaymentOrderPaid(merchantOrderNo, tradeNo)
    if (paid) {
      await fulfillPaymentOrder(paid)
    }
  }

  return findPaymentOrderByMerchantOrderNo(merchantOrderNo)
}

export async function createCheckoutForUser(userId: number, email: string, planId: string) {
  const plan = getPaymentPlan(planId)
  if (!plan) {
    throw new Error('方案不存在')
  }

  const config = getNewebPayConfig()
  const merchantOrderNo = `RZ${userId}${Date.now()}`.slice(0, 30)

  const order = await createPaymentOrder(userId, merchantOrderNo, plan.id, plan.amount)

  if (config?.allowMock) {
    await markPaymentOrderPaid(order.merchant_order_no, `MOCK-${Date.now()}`)
    const paid = await findPaymentOrderByMerchantOrderNo(order.merchant_order_no)
    if (paid) {
      await fulfillPaymentOrder(paid)
    }
    return {
      mock: true as const,
      merchantOrderNo: order.merchant_order_no,
      redirectUrl: `${config.siteUrl}/chart.html?payment=success`,
    }
  }

  if (!config) {
    throw new Error('金流尚未設定，請聯絡管理員')
  }

  const checkout = createCheckoutTrade({
    merchantOrderNo: order.merchant_order_no,
    amount: plan.amount,
    itemDesc: plan.name,
    email,
    config,
  })

  return {
    mock: false as const,
    merchantOrderNo: order.merchant_order_no,
    checkout,
  }
}
