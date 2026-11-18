import { Router } from 'express'
import {
  assignChartsToGroup,
  countOwnSavedCharts,
  createChartGroup,
  createSavedChart,
  deleteChartGroup,
  deleteSavedChart,
  findUserByEmail,
  findUserById,
  getSavedChartDetailForUser,
  listChartGroupsByUser,
  listSavedChartsByUser,
  removeChartsFromGroup,
  renameChartGroup,
  updateSavedChart,
} from '../db.js'
import { requireAuth, requireActiveMember, requireApprovedMember } from '../middleware.js'
import { isAdminUser } from '../adminRoles.js'
import {
  DESIGNATED_FREE_SAVED_CHART_LIMIT,
  canSaveOwnChart,
  freeSavedChartLimitForUser,
} from '../savedChartQuota.js'
import type { PublicUser } from '../types.js'

function canMutateOwnSavedCharts(user: PublicUser): boolean {
  if (isAdminUser(user) || user.membershipActive) return true
  return freeSavedChartLimitForUser({ saved_chart_limit: user.savedChartLimit }) > 0
}
import {
  ShareChartGroupError,
  shareChartGroupToUser,
  syncChartGroupShareForRecipient,
} from '../chartShare.js'
import { validateChartPayload } from '../chartPayload.js'
import type { SavedChartPayload } from '../types.js'

const router = Router()

router.use(requireAuth)
router.use(requireApprovedMember)

function normalizeGroupName(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const name = raw.trim()
  if (!name || name.length > 40) return null
  return name
}

function normalizeChartIds(raw: unknown): number[] | null {
  if (!Array.isArray(raw)) return null
  const ids = raw.map((v) => Number(v)).filter((id) => Number.isFinite(id) && id > 0)
  if (!ids.length) return null
  return [...new Set(ids)].slice(0, 200)
}

router.get('/groups', async (req, res) => {
  const groups = await listChartGroupsByUser(req.authUser!.id)
  res.json({ groups })
})

router.post('/groups', requireActiveMember, async (req, res) => {
  const name = normalizeGroupName(req.body?.name)
  if (!name) {
    res.status(400).json({ error: '請輸入有效的資料夾名稱（1–40 字）' })
    return
  }
  try {
    const group = await createChartGroup(req.authUser!.id, name)
    res.status(201).json({ group })
  } catch (err) {
    const message = err instanceof Error ? err.message : ''
    if (message.includes('UNIQUE') || message.includes('unique')) {
      res.status(409).json({ error: '已有相同名稱的資料夾' })
      return
    }
    console.error('[charts/groups POST]', err)
    res.status(500).json({ error: '建立資料夾失敗' })
  }
})

router.patch('/groups/:groupId', requireActiveMember, async (req, res) => {
  const groupId = Number(req.params.groupId)
  if (!Number.isFinite(groupId)) {
    res.status(400).json({ error: '無效的資料夾 ID' })
    return
  }
  const name = normalizeGroupName(req.body?.name)
  if (!name) {
    res.status(400).json({ error: '請輸入有效的資料夾名稱（1–40 字）' })
    return
  }
  try {
    const group = await renameChartGroup(groupId, req.authUser!.id, name)
    if (!group) {
      res.status(404).json({ error: '找不到資料夾' })
      return
    }
    res.json({ group })
  } catch (err) {
    const message = err instanceof Error ? err.message : ''
    if (message.includes('UNIQUE') || message.includes('unique')) {
      res.status(409).json({ error: '已有相同名稱的資料夾' })
      return
    }
    console.error('[charts/groups PATCH]', err)
    res.status(500).json({ error: '重新命名失敗' })
  }
})

router.delete('/groups/:groupId', requireActiveMember, async (req, res) => {
  const groupId = Number(req.params.groupId)
  if (!Number.isFinite(groupId)) {
    res.status(400).json({ error: '無效的資料夾 ID' })
    return
  }
  if (!(await deleteChartGroup(groupId, req.authUser!.id))) {
    res.status(404).json({ error: '找不到資料夾，或此資料夾為他人分享無法刪除' })
    return
  }
  res.json({ message: '資料夾已刪除' })
})

router.put('/groups/:groupId/members', requireActiveMember, async (req, res) => {
  const groupId = Number(req.params.groupId)
  if (!Number.isFinite(groupId)) {
    res.status(400).json({ error: '無效的資料夾 ID' })
    return
  }
  const chartIds = normalizeChartIds(req.body?.chartIds)
  if (!chartIds) {
    res.status(400).json({ error: '請選擇至少一筆命盤' })
    return
  }
  const updated = await assignChartsToGroup(req.authUser!.id, groupId, chartIds)
  if (updated === 0) {
    res.status(404).json({ error: '找不到資料夾或命盤' })
    return
  }
  res.json({ updated })
})

router.post('/groups/:groupId/share', requireActiveMember, async (req, res) => {
  const groupId = Number(req.params.groupId)
  if (!Number.isFinite(groupId)) {
    res.status(400).json({ error: '無效的資料夾 ID' })
    return
  }

  const sender = req.authUser!
  const recipientUserIdRaw = req.body?.recipientUserId
  const recipientEmailRaw = req.body?.recipientEmail

  let toUserId: number | null = null
  if (recipientUserIdRaw != null && recipientUserIdRaw !== '') {
    if (!isAdminUser(sender)) {
      res.status(403).json({ error: '僅管理員可使用會員編號分享' })
      return
    }
    const id = Number(recipientUserIdRaw)
    if (!Number.isFinite(id) || id <= 0) {
      res.status(400).json({ error: '無效的會員編號' })
      return
    }
    toUserId = id
  } else if (typeof recipientEmailRaw === 'string' && recipientEmailRaw.trim()) {
    const email = recipientEmailRaw.trim().toLowerCase()
    const user = await findUserByEmail(email)
    if (!user) {
      res.status(404).json({ error: '找不到此 Email 的會員' })
      return
    }
    toUserId = user.id
  } else {
    res.status(400).json({ error: '請提供對方 Email' })
    return
  }

  const recipient = await findUserById(toUserId)
  if (!recipient) {
    res.status(404).json({ error: '找不到對方帳號' })
    return
  }

  try {
    const result = await shareChartGroupToUser(sender, groupId, toUserId)
    res.json({
      message: result.isNewShare
        ? `已分享資料夾給 ${result.recipientName}（學員需按「同步到最新」取得更新）`
        : `已更新分享給 ${result.recipientName} 的資料夾內容`,
      ...result,
      targetGroup: {
        id: result.targetGroupId,
        name: result.targetGroupName,
      },
    })
  } catch (err) {
    if (err instanceof ShareChartGroupError) {
      res.status(err.status).json({ error: err.message })
      return
    }
    console.error('[charts/groups share]', err)
    res.status(500).json({ error: '分享資料夾失敗' })
  }
})

router.post('/shares/:shareId/sync', async (req, res) => {
  const shareId = Number(req.params.shareId)
  if (!Number.isFinite(shareId)) {
    res.status(400).json({ error: '無效的分享 ID' })
    return
  }
  try {
    const stats = await syncChartGroupShareForRecipient(shareId, req.authUser!.id)
    res.json({
      message: '已同步到最新',
      stats,
    })
  } catch (err) {
    if (err instanceof ShareChartGroupError) {
      res.status(err.status).json({ error: err.message })
      return
    }
    console.error('[charts/shares sync]', err)
    res.status(500).json({ error: '同步失敗' })
  }
})

router.post('/groups/unassign', requireActiveMember, async (req, res) => {
  const chartIds = normalizeChartIds(req.body?.chartIds)
  if (!chartIds) {
    res.status(400).json({ error: '請選擇至少一筆命盤' })
    return
  }
  const updated = await removeChartsFromGroup(req.authUser!.id, chartIds)
  res.json({ updated })
})

router.get('/', async (req, res) => {
  const search = typeof req.query.q === 'string' ? req.query.q : undefined
  const groupIdRaw = typeof req.query.groupId === 'string' ? Number(req.query.groupId) : undefined
  const groupId = groupIdRaw != null && Number.isFinite(groupIdRaw) ? groupIdRaw : undefined
  const charts = await listSavedChartsByUser(req.authUser!.id, search, groupId)
  res.json({ charts })
})

router.post('/', async (req, res) => {
  const user = req.authUser!
  if (!canMutateOwnSavedCharts(user)) {
    res.status(403).json({ error: '此功能需訂閱付費會員，請升級後使用' })
    return
  }

  const payload = validateChartPayload(req.body?.payload ?? req.body)
  if (!payload) {
    res.status(400).json({ error: '命盤資料不完整或格式錯誤' })
    return
  }

  if (!isAdminUser(user) && !user.membershipActive) {
    const ownCount = await countOwnSavedCharts(user.id)
    const rowLike = {
      role: 'user' as const,
      membership_expires_at: null,
      saved_chart_limit: user.savedChartLimit,
    }
    if (!canSaveOwnChart(rowLike, ownCount)) {
      const limit = freeSavedChartLimitForUser({ saved_chart_limit: user.savedChartLimit })
      res.status(403).json({
        error: `免費會員最多儲存 ${limit || DESIGNATED_FREE_SAVED_CHART_LIMIT} 筆自己的命盤（老師分享不計入），請先刪除後再儲存`,
      })
      return
    }
  }

  const chart = await createSavedChart(user.id, payload)
  res.status(201).json({ chart })
})

router.get('/:id', async (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: '無效的命盤 ID' })
    return
  }

  const chart = await getSavedChartDetailForUser(id, req.authUser!.id)
  if (!chart) {
    res.status(404).json({ error: '找不到命盤' })
    return
  }

  res.json({ chart })
})

router.patch('/:id', async (req, res) => {
  const user = req.authUser!
  if (!canMutateOwnSavedCharts(user)) {
    res.status(403).json({ error: '此功能需訂閱付費會員，請升級後使用' })
    return
  }

  const id = Number(req.params.id)
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: '無效的命盤 ID' })
    return
  }

  const phoneProvided = typeof req.body?.phone === 'string'
  const payloadProvided = req.body?.payload != null
  if (!phoneProvided && !payloadProvided) {
    res.status(400).json({ error: '請提供要更新的資料' })
    return
  }

  let phone: string | undefined
  if (phoneProvided) {
    const trimmedPhone = String(req.body.phone).trim()
    if (trimmedPhone.length > 32) {
      res.status(400).json({ error: '電話長度不可超過 32 字' })
      return
    }
    phone = trimmedPhone
  }

  let payload: SavedChartPayload | undefined
  if (payloadProvided) {
    payload = validateChartPayload(req.body.payload) ?? undefined
    if (!payload) {
      res.status(400).json({ error: '命盤資料不完整或格式錯誤' })
      return
    }
  }

  const chart = await updateSavedChart(id, user.id, { phone, payload })
  if (!chart) {
    const existing = await getSavedChartDetailForUser(id, user.id)
    if (existing?.isReadOnly) {
      res.status(403).json({ error: '此命盤來自老師分享，僅能閱讀與抽盤' })
      return
    }
    res.status(404).json({ error: '找不到命盤' })
    return
  }

  res.json({ chart })
})

router.delete('/:id', async (req, res) => {
  const user = req.authUser!
  if (!canMutateOwnSavedCharts(user)) {
    res.status(403).json({ error: '此功能需訂閱付費會員，請升級後使用' })
    return
  }

  const id = Number(req.params.id)
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: '無效的命盤 ID' })
    return
  }

  const existing = await getSavedChartDetailForUser(id, user.id)
  if (existing?.isReadOnly) {
    res.status(403).json({ error: '此命盤來自老師分享，無法刪除' })
    return
  }
  if (!(await deleteSavedChart(id, user.id))) {
    res.status(404).json({ error: '找不到命盤' })
    return
  }

  res.json({ message: '命盤已刪除' })
})

export default router
