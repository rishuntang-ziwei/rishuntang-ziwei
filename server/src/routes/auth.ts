import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { createUser, findUserByEmail, findUserById, updateUserPassword, consumeDailyChartGeneration } from '../db.js'
import { requireAuth, requireActiveMember, signToken } from '../middleware.js'
import { toPublicUser } from '../db.js'
import { validateChartPayload } from '../chartPayload.js'
import { formatBirthDateTime } from '../chartFormat.js'
import { parseSavedChartPayload } from '../db/shared.js'
import type { SavedChartPayload } from '../types.js'

const router = Router()

function validateEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function validatePhone(phone: string) {
  const normalized = phone.replace(/\s+/g, '')
  return /^09\d{8}$/.test(normalized) || /^0\d{1,2}-?\d{6,8}$/.test(normalized)
}

router.post('/register', async (req, res) => {
  const name = String(req.body?.name ?? '').trim()
  const phone = String(req.body?.phone ?? '').trim()
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
    res.status(400).json({ error: '電話格式不正確' })
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

  const token = signToken(user.id, user.role)
  res.json({
    token,
    user: toPublicUser(user),
  })
})

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.authUser })
})

router.get('/birth-chart', requireAuth, requireActiveMember, async (req, res) => {
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

router.post('/chart-generate', requireAuth, requireActiveMember, async (req, res) => {
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
