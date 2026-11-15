import {
  createChartGroup,
  createChartGroupShareRecord,
  deleteMirroredChartsByShareNotInSources,
  findChartGroupForUser,
  findChartGroupShareById,
  findChartGroupShareByTriple,
  findUserById,
  insertMirroredSavedChart,
  listMirroredChartsByShareId,
  listSavedChartsByUser,
  setChartGroupShareMirrorGroup,
  setChartGroupShareLastSynced,
  updateMirroredSavedChart,
} from './db.js'
import { isAdminUser } from './adminRoles.js'
import type { ChartGroupShareRow, PublicUser, UserRow } from './types.js'

const MAX_SHARE_CHARTS = 200

function trimGroupName(name: string): string {
  return name.trim().slice(0, 40)
}

function recipientMayReceiveCharts(user: UserRow): boolean {
  if (isAdminUser(user)) return true
  return user.status === 'approved'
}

async function ensureRecipientMirrorGroup(
  share: ChartGroupShareRow,
  sourceName: string,
  senderName: string,
): Promise<{ id: number; name: string }> {
  if (share.mirror_group_id != null) {
    const existing = await findChartGroupForUser(share.mirror_group_id, share.recipient_user_id)
    if (existing) return existing
  }

  const base = trimGroupName(sourceName)
  const sender = trimGroupName(senderName).slice(0, 12)
  const candidates = [
    trimGroupName(`${base}·${sender}`),
    trimGroupName(`${base}（分享）`),
    base,
    trimGroupName(`${base}·${Date.now().toString().slice(-6)}`),
  ]
  const tried = new Set<string>()
  for (const name of candidates) {
    if (!name || tried.has(name)) continue
    tried.add(name)
    try {
      const group = await createChartGroup(share.recipient_user_id, name)
      await setChartGroupShareMirrorGroup(share.id, group.id)
      return { id: group.id, name: group.name }
    } catch (err) {
      const message = err instanceof Error ? err.message : ''
      if (!message.includes('UNIQUE') && !message.includes('unique')) {
        throw err
      }
    }
  }
  throw new ShareChartGroupError('無法在對方帳號建立資料夾', 500)
}

export interface SyncShareStats {
  added: number
  updated: number
  removed: number
  total: number
}

export async function syncChartGroupShare(shareId: number): Promise<SyncShareStats> {
  const share = await findChartGroupShareById(shareId)
  if (!share) throw new ShareChartGroupError('找不到分享關係', 404)

  const sourceGroup = await findChartGroupForUser(share.source_group_id, share.owner_user_id)
  if (!sourceGroup) throw new ShareChartGroupError('老師的資料夾已不存在', 404)

  const owner = await findUserById(share.owner_user_id)
  if (!owner) throw new ShareChartGroupError('找不到分享者', 404)

  const sourceCharts = await listSavedChartsByUser(share.owner_user_id, undefined, share.source_group_id)
  if (sourceCharts.length > MAX_SHARE_CHARTS) {
    throw new ShareChartGroupError(`單一資料夾最多同步 ${MAX_SHARE_CHARTS} 筆命盤`, 400)
  }

  const mirrorGroup = await ensureRecipientMirrorGroup(share, sourceGroup.name, owner.name)
  const refreshedShare = (await findChartGroupShareById(shareId))!

  const mirrors = await listMirroredChartsByShareId(shareId)
  const mirrorBySource = new Map<number, (typeof mirrors)[0]>()
  for (const m of mirrors) {
    if (m.shared_from_chart_id != null) {
      mirrorBySource.set(m.shared_from_chart_id, m)
    }
  }

  let added = 0
  let updated = 0
  const sourceIds: number[] = []

  for (const chart of sourceCharts) {
    sourceIds.push(chart.id)
    const existing = mirrorBySource.get(chart.id)
    if (!existing) {
      await insertMirroredSavedChart(
        refreshedShare.recipient_user_id,
        chart.payload,
        chart.phone || '',
        mirrorGroup.id,
        shareId,
        chart.id,
      )
      added += 1
      continue
    }
    await updateMirroredSavedChart(existing.id, refreshedShare.recipient_user_id, chart.payload, chart.phone || '')
    updated += 1
  }

  const removed = await deleteMirroredChartsByShareNotInSources(
    shareId,
    refreshedShare.recipient_user_id,
    sourceIds,
  )

  await setChartGroupShareLastSynced(shareId)

  return {
    added,
    updated,
    removed,
    total: sourceCharts.length,
  }
}

export interface ShareChartGroupResult {
  shareId: number
  copied: number
  recipientUserId: number
  recipientName: string
  targetGroupId: number
  targetGroupName: string
  isNewShare: boolean
}

export async function shareChartGroupToUser(
  fromUser: Pick<PublicUser, 'id' | 'name'>,
  groupId: number,
  toUserId: number,
): Promise<ShareChartGroupResult> {
  if (fromUser.id === toUserId) {
    throw new ShareChartGroupError('不能分享給自己', 400)
  }

  const sourceGroup = await findChartGroupForUser(groupId, fromUser.id)
  if (!sourceGroup) {
    throw new ShareChartGroupError('找不到資料夾', 404)
  }

  const recipient = await findUserById(toUserId)
  if (!recipient) {
    throw new ShareChartGroupError('找不到對方帳號', 404)
  }
  if (!recipientMayReceiveCharts(recipient)) {
    throw new ShareChartGroupError('對方帳號尚未開通，無法接收命盤', 400)
  }

  const charts = await listSavedChartsByUser(fromUser.id, undefined, groupId)
  if (!charts.length) {
    throw new ShareChartGroupError('此資料夾沒有命盤可分享', 400)
  }

  let share = await findChartGroupShareByTriple(fromUser.id, groupId, toUserId)
  const isNewShare = !share
  if (!share) {
    share = await createChartGroupShareRecord(fromUser.id, groupId, toUserId)
  }

  const stats = await syncChartGroupShare(share.id)
  const shareAfter = await findChartGroupShareById(share.id)
  const mirrorGroupId = shareAfter?.mirror_group_id
  if (!mirrorGroupId) {
    throw new ShareChartGroupError('建立學員資料夾失敗', 500)
  }
  const mirrorGroup = await findChartGroupForUser(mirrorGroupId, toUserId)
  if (!mirrorGroup) {
    throw new ShareChartGroupError('找不到學員資料夾', 500)
  }

  return {
    shareId: share.id,
    copied: stats.total,
    recipientUserId: toUserId,
    recipientName: recipient.name,
    targetGroupId: mirrorGroup.id,
    targetGroupName: mirrorGroup.name,
    isNewShare,
  }
}

export async function syncChartGroupShareForRecipient(
  shareId: number,
  recipientUserId: number,
): Promise<SyncShareStats> {
  const share = await findChartGroupShareById(shareId)
  if (!share) throw new ShareChartGroupError('找不到分享關係', 404)
  if (share.recipient_user_id !== recipientUserId) {
    throw new ShareChartGroupError('無權限同步此分享', 403)
  }
  return syncChartGroupShare(shareId)
}

export class ShareChartGroupError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}