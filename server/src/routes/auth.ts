import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { isAdminUser } from '../adminRoles.js'
import {
  countActiveTrustedDevices,
  createUser,
  findActiveTrustedDevice,
  findUserByEmail,
  findUserById,
  touchTrustedDevice,
  updateUserPassword,
  consumeDailyChartGeneration,
  upsertTrustedDevice,
} from '../db.js'
import { requireAuth, requireApprovedMember, signPasswordResetToken, signToken, verifyPasswordResetToken } from '../middleware.js'
import {
  generateDeviceToken,
  hashDeviceToken,
  isValidDeviceId,
  maxTrustedDevicesPerAdmin,
  verifyDeviceToken,
} from '../trustedDevices.js'
import { toPublicUser } from '../db.js'
import { validateChartPayload } from '../chartPayload.js'
import { formatBirthDateTime } from '../chartFormat.js'
import { parseSavedChartPayload } from '../db/shared.js'
import type { SavedChartPayload } from '../types.js'
import { formatPhoneForStorage, phonesMatch, validatePhone } from '../phoneNumber.js'

const router = Router()

function validateEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

router.post('/register', async (req, res) => {
  const name = String(req.body?.name ?? '').trim()
  const phoneRaw = String(req.body?.phone ?? '').trim()
  const phone = formatPhoneForStorage(phoneRaw)
  const email = String(req.body?.email ?? '').trim().toLowerCase()
  const password = String(req.body?.password ?? '')
  const confirmPassword = String(req.body?.confirmPassword ?? '')

  if (!name || !phone || !email || !password) {
    res.status(400).json({ error: '請填寫姓名、電話、Email 與密碼' })
    return
  }
  if (!validateEmail(email)) {
    res.status(400).json({ error: 'Email 格式不正確' })
    return
  }
  if (!validatePhone(phone)) {
    res.status(400).json({ error: '電話格式不正確，請確認國碼與號碼' })
    return
  }
  if (password.length < 8) {
    res.status(400).json({ error: '密碼至少 8 個字元' })
    return
  }
  if (password !== confirmPassword) {
    res.status(400).json({ error: '兩次密碼不一致' })
    return
  }
  if (await findUserByEmail(email)) {
    res.status(409).json({ error: '此 Email 已註冊' })
    return
  }

  const birthRaw = req.body?.birth ?? req.body?.birthPayload
  let birthPayload = validateChartPayload(birthRaw)
  if (!birthPayload) {
    res.status(400).json({ error: '請填寫完整出生資料（性別、曆法、日期、時辰）' })
    return
  }

  birthPayload = {
    ...birthPayload,
    name,
    initialChartType: 'natal',
    yearlyYear: new Date().getFullYear(),
  } satisfies SavedChartPayload

  const passwordHash = await bcrypt.hash(password, 10)
  await createUser({ name, phone, email, passwordHash, birthPayload })

  res.status(201).json({
    message: '註冊成功！已開通免費會員，請登入使用。升級付費訂閱可解鎖大限流年、列印儲存等完整功能。',
  })
})

router.post('/login-options', async (req, res) => {
  const email = String(req.body?.email ?? '').trim().toLowerCase()
  if (!email || !validateEmail(email)) {
    res.json({ trustDeviceAvailable: false })
    return
  }
  const user = await findUserByEmail(email)
  res.json({ trustDeviceAvailable: Boolean(user && isAdminUser(user)) })
})

router.post('/login', async (req, res) => {
  const email = String(req.body?.email ?? '').trim().toLowerCase()
  const password = String(req.body?.password ?? '')

  if (!email || !password) {
    res.status(400).json({ error: '請輸入 Email 與密碼' })
    return
  }

  const user = await findUserByEmail(email)
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    res.status(401).json({ error: 'Email 或密碼錯誤' })
    return
  }

  if (user.status === 'rejected') {
    res.status(403).json({ error: '帳號已被拒絕，請聯絡管理員' })
    return
  }

  const publicUser = toPublicUser(user)
  const token = signToken(user.id, user.role)
  const response: {
    token: string
    user: ReturnType<typeof toPublicUser>
    deviceToken?: string
    maxTrustedDevices?: number
  } = { token, user: publicUser }

  const trustDevice = Boolean(req.body?.trustDevice)
  const deviceId = String(req.body?.deviceId ?? '').trim()
  const deviceLabel = String(req.body?.deviceLabel ?? '').trim().slice(0, 80)

  if (trustDevice && isAdminUser(publicUser)) {
    if (!isValidDeviceId(deviceId)) {
      res.status(400).json({ error: '裝置識別碼格式不正確，請重新整理頁面後再試' })
      return
    }
    const existingForUser = await findActiveTrustedDevice(deviceId)
    const isSameUserDevice = existingForUser && Number(existingForUser.user_id) === user.id
    const activeCount = await countActiveTrustedDevices(user.id)
    const limit = maxTrustedDevicesPerAdmin()
    if (!isSameUserDevice && activeCount >= limit) {
      res.status(400).json({
        error: `此管理員帳號已達信任裝置上限（${limit} 台），請先在管理後台撤銷舊裝置`,
        maxTrustedDevices: limit,
      })
      return
    }
    const deviceToken = generateDeviceToken()
    await upsertTrustedDevice({
      userId: user.id,
      deviceId,
      tokenHash: hashDeviceToken(deviceToken),
      label: deviceLabel || null,
      userAgent: String(req.headers['user-agent'] ?? '').slice(0, 500) || null,
    })
    response.deviceToken = deviceToken
    response.maxTrustedDevices = limit
  }

  res.json(response)
})

router.post('/device-login', async (req, res) => {
  const deviceId = String(req.body?.deviceId ?? '').trim()
  const deviceToken = String(req.body?.deviceToken ?? '').trim()

  if (!deviceId || !deviceToken) {
    res.status(400).json({ error: '缺少裝置登入資訊' })
    return
  }
  if (!isValidDeviceId(deviceId)) {
    res.status(401).json({ error: '裝置登入已失效' })
    return
  }

  const row = await findActiveTrustedDevice(deviceId)
  if (!row || String(row.user_role) !== 'admin') {
    res.status(401).json({ error: '此裝置未獲信任或已撤銷' })
    return
  }
  if (!verifyDeviceToken(deviceToken, String(row.token_hash))) {
    res.status(401).json({ error: '裝置登入已失效，請使用密碼登入' })
    return
  }

  const user = await findUserById(Number(row.user_id))
  if (!user || !isAdminUser(user)) {
    res.status(401).json({ error: '管理員帳號不存在或已停用' })
    return
  }
  if (user.status === 'rejected') {
    res.status(403).json({ error: '帳號已被拒絕，請聯絡管理員' })
    return
  }

  await touchTrustedDevice(Number(row.id))
  const publicUser = toPublicUser(user)
  res.json({
    token: signToken(user.id, user.role),
    user: publicUser,
  })
})

router.post('/forgot-password', async (req, res) => {
  const email = String(req.body?.email ?? '').trim().toLowerCase()
  const phone = formatPhoneForStorage(String(req.body?.phone ?? '').trim())

  if (!email || !phone) {
    res.status(400).json({ error: '請填寫 Email 與註冊電話' })
    return
  }
  if (!validateEmail(email)) {
    res.status(400).json({ error: 'Email 格式不正確' })
    return
  }
  if (!validatePhone(phone)) {
    res.status(400).json({ error: '電話格式不正確，請確認國碼與號碼' })
    return
  }

  const user = await findUserByEmail(email)
  if (!user || !phonesMatch(user.phone, phone)) {
    res.status(404).json({ error: 'Email 或電話與註冊資料不符' })
    return
  }
  if (user.status === 'rejected') {
    res.status(403).json({ error: '帳號已被拒絕，請聯絡管理員' })
    return
  }

  const resetToken = signPasswordResetToken(user.id)
  res.json({
    message: '身分驗證成功，請設定新密碼',
    resetToken,
  })
})

router.post('/reset-password', async (req, res) => {
  const resetToken = String(req.body?.resetToken ?? '')
  const newPassword = String(req.body?.newPassword ?? '')
  const confirmPassword = String(req.body?.confirmPassword ?? '')

  if (!resetToken || !newPassword) {
    res.status(400).json({ error: '請填寫新密碼' })
    return
  }
  if (newPassword.length < 8) {
    res.status(400).json({ error: '新密碼至少 8 個字元' })
    return
  }
  if (newPassword !== confirmPassword) {
    res.status(400).json({ error: '兩次新密碼不一致' })
    return
  }

  const userId = verifyPasswordResetToken(resetToken)
  if (!userId) {
    res.status(401).json({ error: '重設時效已過，請重新驗證身分' })
    return
  }

  const user = await findUserById(userId)
  if (!user) {
    res.status(404).json({ error: '帳號不存在' })
    return
  }

  const passwordHash = await bcrypt.hash(newPassword, 10)
  await updateUserPassword(user.id, passwordHash)
  res.json({ message: '密碼已重設，請使用新密碼登入' })
})

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.authUser })
})

router.get('/birth-chart', requireAuth, requireApprovedMember, async (req, res) => {
  const user = await findUserById(req.authUser!.id)
  if (!user?.birth_payload) {
    res.status(404).json({ error: '尚未登記出生資料' })
    return
  }

  let payload: SavedChartPayload
  try {
    payload = parseSavedChartPayload(user.birth_payload)
  } catch {
    res.status(500).json({ error: '出生資料格式錯誤' })
    return
  }

  res.json({
    chart: {
      subjectName: payload.name,
      gender: payload.gender,
      birthDateTime: formatBirthDateTime(payload),
      payload,
    },
  })
})

router.post('/chart-generate', requireAuth, requireApprovedMember, async (req, res) => {
  const result = await consumeDailyChartGeneration(req.authUser!.id)
  if (!result.allowed) {
    res.status(429).json({
      error: '免費會員每日最多排盤 3 次，請明天再試或升級付費訂閱',
      quota: result.quota,
    })
    return
  }
  res.json({ quota: result.quota })
})

router.post('/change-password', requireAuth, async (req, res) => {
  const currentPassword = String(req.body?.currentPassword ?? '')
  const newPassword = String(req.body?.newPassword ?? '')
  const confirmPassword = String(req.body?.confirmPassword ?? '')

  if (!currentPassword || !newPassword) {
    res.status(400).json({ error: '請填寫目前密碼與新密碼' })
    return
  }
  if (newPassword.length < 8) {
    res.status(400).json({ error: '新密碼至少 8 個字元' })
    return
  }
  if (newPassword !== confirmPassword) {
    res.status(400).json({ error: '兩次新密碼不一致' })
    return
  }

  const user = await findUserByEmail(req.authUser!.email)
  if (!user || !(await bcrypt.compare(currentPassword, user.password_hash))) {
    res.status(401).json({ error: '目前密碼錯誤' })
    return
  }

  const passwordHash = await bcrypt.hash(newPassword, 10)
  await updateUserPassword(user.id, passwordHash)
  res.json({ message: '密碼已更新' })
})

export default router
