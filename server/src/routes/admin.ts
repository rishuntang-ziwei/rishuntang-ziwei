import { Router } from 'express'
import bcrypt from 'bcryptjs'
import type { Request } from 'express'
import {
  EXPIRING_SOON_DAYS,
  memberSummary,
  parseMemberSegment,
  parseMembershipExpiryInput,
  segmentMembers,
  toAdminMemberRow,
} from '../adminMembers.js'
import { auditActionLabel, verifyAdminOperationPin, type AdminAuditAction } from '../adminAuditLog.js'
import { formatBirthDateTime } from '../chartFormat.js'
import {
  countAdmins,
  createAdminAuditLog,
  deleteUser,
  findUserById,
  getSavedChartDetailForUser,
  grantUserMembership,
  listAdminAuditLogs,
  listSavedChartsByUser,
  listUsers,
  revokeUserMembership,
  setUserMembershipExpiry,
  updateUserPassword,
  updateUserRole,
  updateUserStarDraw,
  updateUserStatus,
} from '../db.js'
import { isMembershipActive, parseSavedChartPayload } from '../db/shared.js'
import { requireAdmin, requireAuth } from '../middleware.js'
import { getPaymentPlan, getPlanLabel } from '../paymentPlans.js'

const router = Router()

router.use(requireAuth, requireAdmin)

async function recordAudit(
  req: Request,
  action: AdminAuditAction,
  targetUserId: number | null,
  targetUserName: string | null,
  details?: Record<string, unknown>,
) {
  if (!req.authUser) return
  await createAdminAuditLog({
    adminId: req.authUser.id,
    adminName: req.authUser.name,
    targetUserId,
    targetUserName,
    action,
    details,
  })
}

function rejectInvalidPin(req: Request, res: { status: (code: number) => { json: (body: unknown) => void } }) {
  const pinError = verifyAdminOperationPin(req.body)
  if (pinError) {
    res.status(403).json({ error: pinError })
    return true
  }
  return false
}

router.get('/users', async (_req, res) => {
  res.json({ users: await listUsers() })
})

router.get('/members/summary', async (_req, res) => {
  const users = await listUsers()
  res.json({ summary: memberSummary(users) })
})

router.get('/audit-logs', async (req, res) => {
  const limit = Number(req.query.limit ?? 50)
  const logs = await listAdminAuditLogs(Number.isFinite(limit) ? limit : 50)
  res.json({
    logs: logs.map((log) => ({
      ...log,
      actionLabel: auditActionLabel(log.action),
    })),
  })
})

router.get('/members/:segment', async (req, res) => {
  const segment = parseMemberSegment(String(req.params.segment))
  if (!segment) {
    res.status(400).json({ error: '無效的會員分類' })
    return
  }

  const users = await listUsers()
  const members = segmentMembers(users, segment).map(toAdminMemberRow)
  res.json({
    segment,
    members,
    total: members.length,
    summary: memberSummary(users),
    expiringWithinDays: EXPIRING_SOON_DAYS,
  })
})

router.get('/users/:id/charts', async (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: '無效的使用者 ID' })
    return
  }

  const target = await findUserById(id)
  if (!target) {
    res.status(404).json({ error: '找不到使用者' })
    return
  }

  const search = typeof req.query.q === 'string' ? req.query.q : undefined
  const charts = await listSavedChartsByUser(id, search)
  res.json({
    user: {
      id: target.id,
      name: target.name,
      email: target.email,
    },
    charts,
  })
})

router.get('/users/:id/charts/:chartId', async (req, res) => {
  const userId = Number(req.params.id)
  const chartId = Number(req.params.chartId)
  if (!Number.isFinite(userId) || !Number.isFinite(chartId)) {
    res.status(400).json({ error: '無效的 ID' })
    return
  }

  const target = await findUserById(userId)
  if (!target) {
    res.status(404).json({ error: '找不到使用者' })
    return
  }

  const chart = await getSavedChartDetailForUser(chartId, userId)
  if (!chart) {
    res.status(404).json({ error: '找不到命盤' })
    return
  }

  res.json({ chart })
})

router.get('/users/:id/birth-chart', async (req, res) => {
  const userId = Number(req.params.id)
  if (!Number.isFinite(userId)) {
    res.status(400).json({ error: '無效的使用者 ID' })
    return
  }

  const target = await findUserById(userId)
  if (!target) {
    res.status(404).json({ error: '找不到使用者' })
    return
  }
  if (!target.birth_payload) {
    res.status(404).json({ error: '此會員尚未登記出生資料' })
    return
  }

  let payload
  try {
    payload = parseSavedChartPayload(target.birth_payload)
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
      source: 'registration' as const,
    },
  })
})

router.post('/users/:id/approve', async (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: '無效的使用者 ID' })
    return
  }
  const target = await findUserById(id)
  const user = await updateUserStatus(id, 'approved')
  if (!user) {
    res.status(404).json({ error: '找不到使用者' })
    return
  }
  await recordAudit(req, 'approve_user', id, target?.name ?? user.name)
  res.json({ user })
})

router.post('/users/:id/reject', async (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: '無效的使用者 ID' })
    return
  }
  const target = await findUserById(id)
  const user = await updateUserStatus(id, 'rejected')
  if (!user) {
    res.status(404).json({ error: '找不到使用者' })
    return
  }
  await recordAudit(req, 'reject_user', id, target?.name ?? user.name)
  res.json({ user })
})

router.post('/users/:id/reset-password', async (req, res) => {
  const id = Number(req.params.id)
  const password = String(req.body?.password ?? '')

  if (!Number.isFinite(id)) {
    res.status(400).json({ error: '無效的使用者 ID' })
    return
  }
  if (password.length < 8) {
    res.status(400).json({ error: '密碼至少 8 個字元' })
    return
  }

  const target = await findUserById(id)
  if (!target || target.role === 'admin') {
    res.status(404).json({ error: '找不到使用者' })
    return
  }

  const passwordHash = await bcrypt.hash(password, 10)
  const user = await updateUserPassword(id, passwordHash)
  if (!user) {
    res.status(404).json({ error: '找不到使用者' })
    return
  }
  res.json({ message: '密碼已重設', user })
})

router.post('/users/:id/make-admin', async (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: '無效的使用者 ID' })
    return
  }

  const target = await findUserById(id)
  if (!target) {
    res.status(404).json({ error: '找不到使用者' })
    return
  }
  if (target.role === 'admin') {
    res.status(400).json({ error: '此帳號已是管理員' })
    return
  }
  if (target.status === 'rejected') {
    res.status(400).json({ error: '已拒絕的帳號需先重新開通，才能設為管理員' })
    return
  }

  const user = await updateUserRole(id, 'admin')
  if (!user) {
    res.status(404).json({ error: '找不到使用者' })
    return
  }
  res.json({ message: '已設為管理員', user })
})

router.post('/users/:id/revoke-admin', async (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: '無效的使用者 ID' })
    return
  }
  if (req.authUser?.id === id) {
    res.status(400).json({ error: '無法取消自己的管理員權限' })
    return
  }

  const target = await findUserById(id)
  if (!target || target.role !== 'admin') {
    res.status(404).json({ error: '找不到管理員帳號' })
    return
  }
  if ((await countAdmins()) <= 1) {
    res.status(400).json({ error: '至少需要保留一位管理員' })
    return
  }

  const user = await updateUserRole(id, 'user')
  if (!user) {
    res.status(404).json({ error: '找不到使用者' })
    return
  }
  res.json({ message: '已取消管理員權限', user })
})

router.post('/users/:id/enable-star-draw', async (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: '無效的使用者 ID' })
    return
  }

  const target = await findUserById(id)
  if (!target || target.role !== 'user') {
    res.status(404).json({ error: '找不到會員帳號' })
    return
  }
  if (target.status !== 'approved') {
    res.status(400).json({ error: '請先開通會員帳號，再啟用神牌功能' })
    return
  }

  const user = await updateUserStarDraw(id, true)
  if (!user) {
    res.status(404).json({ error: '找不到會員帳號' })
    return
  }
  await recordAudit(req, 'enable_course', id, target.name)
  res.json({ message: '已開通神牌功能', user })
})

router.post('/users/:id/disable-star-draw', async (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: '無效的使用者 ID' })
    return
  }

  const target = await findUserById(id)
  if (!target || target.role !== 'user') {
    res.status(404).json({ error: '找不到會員帳號' })
    return
  }

  const user = await updateUserStarDraw(id, false)
  if (!user) {
    res.status(404).json({ error: '找不到會員帳號' })
    return
  }
  await recordAudit(req, 'disable_course', id, target.name)
  res.json({ message: '已取消神牌功能', user })
})

router.post('/users/:id/grant-membership', async (req, res) => {
  const id = Number(req.params.id)
  const planId = String(req.body?.planId ?? '').trim()
  const plan = planId ? getPaymentPlan(planId) : undefined

  if (!Number.isFinite(id)) {
    res.status(400).json({ error: '無效的使用者 ID' })
    return
  }
  if (!planId || !plan) {
    res.status(400).json({ error: '請選擇有效的訂閱方案' })
    return
  }
  if (plan.lifetime && rejectInvalidPin(req, res)) return

  const target = await findUserById(id)
  if (!target || target.role !== 'user') {
    res.status(404).json({ error: '找不到會員帳號' })
    return
  }
  if (target.status === 'rejected') {
    res.status(400).json({ error: '已拒絕的帳號無法開通付費會員' })
    return
  }

  const previousExpiresAt = target.membership_expires_at
  const user = await grantUserMembership(id, planId)
  if (!user) {
    res.status(400).json({ error: '開通付費會員失敗' })
    return
  }

  await recordAudit(req, 'grant_membership', id, target.name, {
    planId,
    planLabel: getPlanLabel(planId),
    previousExpiresAt,
    newExpiresAt: user.membershipExpiresAt,
  })

  res.json({
    message: '已開通付費會員',
    planLabel: getPlanLabel(planId),
    user,
  })
})

router.post('/users/:id/revoke-membership', async (req, res) => {
  const id = Number(req.params.id)

  if (!Number.isFinite(id)) {
    res.status(400).json({ error: '無效的使用者 ID' })
    return
  }
  if (rejectInvalidPin(req, res)) return

  const target = await findUserById(id)
  if (!target || target.role !== 'user') {
    res.status(404).json({ error: '找不到會員帳號' })
    return
  }
  if (!target.membership_expires_at || !isMembershipActive(target)) {
    res.status(400).json({ error: '此會員目前不是付費會員' })
    return
  }

  const previousExpiresAt = target.membership_expires_at
  const user = await revokeUserMembership(id)
  if (!user) {
    res.status(400).json({ error: '取消付費會員失敗' })
    return
  }

  await recordAudit(req, 'revoke_membership', id, target.name, { previousExpiresAt })
  res.json({ message: '已取消付費會員', user })
})

router.post('/users/:id/set-membership-expiry', async (req, res) => {
  const id = Number(req.params.id)
  const parsed = parseMembershipExpiryInput(req.body?.expiresAt)

  if (!Number.isFinite(id)) {
    res.status(400).json({ error: '無效的使用者 ID' })
    return
  }
  if (parsed === undefined) {
    res.status(400).json({ error: '請提供有效的到期日（YYYY-MM-DD）、lifetime 或 revoke' })
    return
  }
  if (rejectInvalidPin(req, res)) return

  const target = await findUserById(id)
  if (!target || target.role !== 'user') {
    res.status(404).json({ error: '找不到會員帳號' })
    return
  }
  if (target.status === 'rejected') {
    res.status(400).json({ error: '已拒絕的帳號無法調整付費期限' })
    return
  }

  const previousExpiresAt = target.membership_expires_at
  const user = await setUserMembershipExpiry(id, parsed)
  if (!user) {
    res.status(400).json({ error: '調整到期日失敗' })
    return
  }

  await recordAudit(req, 'set_membership_expiry', id, target.name, {
    previousExpiresAt,
    newExpiresAt: user.membershipExpiresAt,
    input: req.body?.expiresAt ?? null,
  })

  res.json({
    message: parsed ? '已更新付費到期日' : '已取消付費會員',
    user,
  })
})

router.delete('/users/:id', async (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: '無效的使用者 ID' })
    return
  }
  if (req.authUser?.id === id) {
    res.status(400).json({ error: '無法刪除自己的帳號' })
    return
  }

  const target = await findUserById(id)
  if (!target) {
    res.status(404).json({ error: '找不到使用者' })
    return
  }
  if (target.role === 'admin') {
    res.status(400).json({ error: '請先取消管理員權限，再刪除帳號' })
    return
  }

  if (!(await deleteUser(id))) {
    res.status(404).json({ error: '找不到使用者' })
    return
  }
  res.json({ message: '帳號已刪除' })
})

export default router
