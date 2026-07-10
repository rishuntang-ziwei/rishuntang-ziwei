import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { createUser, findUserByEmail } from '../db.js'
import { requireAuth, signToken } from '../middleware.js'

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
  if (findUserByEmail(email)) {
    res.status(409).json({ error: '此 Email 已註冊' })
    return
  }

  const passwordHash = await bcrypt.hash(password, 10)
  createUser({ name, phone, email, passwordHash })

  res.status(201).json({
    message: '註冊成功，請等待管理員開通帳號後再登入',
  })
})

router.post('/login', async (req, res) => {
  const email = String(req.body?.email ?? '').trim().toLowerCase()
  const password = String(req.body?.password ?? '')

  if (!email || !password) {
    res.status(400).json({ error: '請輸入 Email 與密碼' })
    return
  }

  const user = findUserByEmail(email)
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    res.status(401).json({ error: 'Email 或密碼錯誤' })
    return
  }

  if (user.status === 'pending') {
    res.status(403).json({ error: '帳號審核中，請等待管理員開通' })
    return
  }
  if (user.status === 'rejected') {
    res.status(403).json({ error: '帳號已被拒絕，請聯絡管理員' })
    return
  }

  const token = signToken(user.id, user.role)
  res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      phone: user.phone,
      email: user.email,
      status: user.status,
      role: user.role,
      createdAt: user.created_at,
      approvedAt: user.approved_at,
    },
  })
})

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.authUser })
})

export default router
