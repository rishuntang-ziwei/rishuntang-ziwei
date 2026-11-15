import {
  assignChartsToGroup,
  createChartGroup,
  createSavedChart,
  findChartGroupForUser,
  findUserById,
  listSavedChartsByUser,
  updateSavedChart,
} from './db.js'
import { isAdminUser } from './adminRoles.js'
import type { PublicUser, UserRow } from './types.js'

const MAX_SHARE_CHARTS = 200

function trimGroupName(name: string): string {
  return name.trim().slice(0, 40)
}

function recipientMayReceiveCharts(user: UserRow): boolean {
  if (isAdminUser(user)) return true
  return user.status === 'approved'
}

async function ensureRecipientGroup(
  recipientId: number,
  sourceName: string,
  senderName: string,
): Promise<{ id: number; name: string }> {
  const base = trimGroupName(sourceName)
  const sender = trimGroupName(senderName).slice(0, 12)
  const candidates = [
    base,
    trimGroupName(`${base}（分享）`),
    trimGroupName(`${base}·來自${sender}`),
    trimGroupName(`${base}·${Date.now().toString().slice(-6)}`),
  ]
  const tried = new Set<string>()
  for (const name of candidates) {
    if (!name || tried.has(name)) continue
    tried.add(name)
    try {
      const group = await createChartGroup(recipientId, name)
      return { id: group.id, name: group.name }
    } catch (err) {
      const message = err instanceof Error ? err.message : ''
      if (!message.includes('UNIQUE') && !message.includes('unique')) {
        throw err
      }
    }
  }
  throw new Error('無法在對方帳號建立資料夾名稱')
}

export interface ShareChartGroupResult {
  copied: number
  recipientUserId: number
  recipientName: string
  targetGroupId: number
  targetGroupName: string
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
  if (charts.length > MAX_SHARE_CHARTS) {
    throw new ShareChartGroupError(`單次最多分享 ${MAX_SHARE_CHARTS} 筆命盤`, 400)
  }

  const targetGroup = await ensureRecipientGroup(toUserId, sourceGroup.name, fromUser.name)
  let copied = 0
  const newChartIds: number[] = []

  for (const chart of charts) {
    const created = await createSavedChart(toUserId, chart.payload)
    if (chart.phone?.trim()) {
      await updateSavedChart(created.id, toUserId, { phone: chart.phone })
    }
    newChartIds.push(created.id)
    copied += 1
  }

  if (newChartIds.length) {
    await assignChartsToGroup(toUserId, targetGroup.id, newChartIds)
  }

  return {
    copied,
    recipientUserId: toUserId,
    recipientName: recipient.name,
    targetGroupId: targetGroup.id,
    targetGroupName: targetGroup.name,
  }
}

export class ShareChartGroupError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}