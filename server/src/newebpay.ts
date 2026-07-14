import crypto from 'node:crypto'

export interface NewebPayConfig {
  merchantId: string
  hashKey: string
  hashIV: string
  testMode: boolean
  allowMock: boolean
  appUrl: string
  siteUrl: string
}

export function getNewebPayConfig(): NewebPayConfig | null {
  const merchantId = process.env.NEWEBPAY_MERCHANT_ID?.trim()
  const hashKey = process.env.NEWEBPAY_HASH_KEY?.trim()
  const hashIV = process.env.NEWEBPAY_HASH_IV?.trim()
  const appUrl = (process.env.PUBLIC_APP_URL?.trim() || '').replace(/\/$/, '')
  const siteUrl = (process.env.PUBLIC_SITE_URL?.trim() || '').replace(/\/$/, '')

  if (!merchantId || !hashKey || !hashIV || !appUrl || !siteUrl) {
    return null
  }

  return {
    merchantId,
    hashKey,
    hashIV,
    testMode: process.env.NEWEBPAY_TEST_MODE !== 'false',
    allowMock: process.env.NEWEBPAY_ALLOW_MOCK === 'true',
    appUrl,
    siteUrl,
  }
}

export function gatewayUrl(testMode: boolean) {
  return testMode
    ? 'https://ccore.newebpay.com/MPG/mpg_gateway'
    : 'https://core.newebpay.com/MPG/mpg_gateway'
}

function aesEncrypt(payload: string, hashKey: string, hashIV: string) {
  const cipher = crypto.createCipheriv('aes-256-cbc', hashKey, hashIV)
  let encrypted = cipher.update(payload, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  return encrypted
}

function aesDecrypt(tradeInfo: string, hashKey: string, hashIV: string) {
  const decipher = crypto.createDecipheriv('aes-256-cbc', hashKey, hashIV)
  let decrypted = decipher.update(tradeInfo, 'hex', 'utf8')
  decrypted += decipher.final('utf8')
  return decrypted
}

export function buildTradeSha(tradeInfo: string, hashKey: string, hashIV: string) {
  const raw = `HashKey=${hashKey}&${tradeInfo}&HashIV=${hashIV}`
  return crypto.createHash('sha256').update(raw).digest('hex').toUpperCase()
}

export function verifyTradeSha(tradeInfo: string, tradeSha: string, hashKey: string, hashIV: string) {
  return buildTradeSha(tradeInfo, hashKey, hashIV) === String(tradeSha).toUpperCase()
}

export interface CheckoutPayload {
  MerchantID: string
  RespondType: 'JSON'
  TimeStamp: string
  Version: '2.0'
  MerchantOrderNo: string
  Amt: number
  ItemDesc: string
  Email: string
  LoginType: 0
  ReturnURL: string
  NotifyURL: string
  ClientBackURL: string
}

export function createCheckoutTrade(input: {
  merchantOrderNo: string
  amount: number
  itemDesc: string
  email: string
  config: NewebPayConfig
}) {
  const tradeData: CheckoutPayload = {
    MerchantID: input.config.merchantId,
    RespondType: 'JSON',
    TimeStamp: String(Math.floor(Date.now() / 1000)),
    Version: '2.0',
    MerchantOrderNo: input.merchantOrderNo,
    Amt: input.amount,
    ItemDesc: input.itemDesc.slice(0, 50),
    Email: input.email,
    LoginType: 0,
    ReturnURL: `${input.config.appUrl}/api/payment/newebpay/return`,
    NotifyURL: `${input.config.appUrl}/api/payment/newebpay/notify`,
    ClientBackURL: `${input.config.siteUrl}/chart.html`,
  }

  const tradeInfo = aesEncrypt(JSON.stringify(tradeData), input.config.hashKey, input.config.hashIV)
  const tradeSha = buildTradeSha(tradeInfo, input.config.hashKey, input.config.hashIV)

  return {
    gatewayUrl: gatewayUrl(input.config.testMode),
    merchantId: input.config.merchantId,
    tradeInfo,
    tradeSha,
    version: '2.0' as const,
  }
}

export function parseNotifyTradeInfo(tradeInfo: string, hashKey: string, hashIV: string) {
  const decrypted = aesDecrypt(tradeInfo, hashKey, hashIV)
  return JSON.parse(decrypted) as Record<string, unknown>
}
