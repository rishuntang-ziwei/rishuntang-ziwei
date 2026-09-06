export type AdminAuditAction =
  | 'grant_membership'
  | 'revoke_membership'
  | 'set_membership_expiry'
  | 'enable_course'
  | 'disable_course'
  | 'approve_user'
  | 'reject_user'

export interface AdminAuditLogInput {
  adminId: number
  adminName: string
  targetUserId?: number | null
  targetUserName?: string | null
  action: AdminAuditAction
  details?: Record<string, unknown>
}

export interface PublicAdminAuditLog {
  id: number
  adminId: number
  adminName: string
  targetUserId: number | null
  targetUserName: string | null
  action: AdminAuditAction
  details: Record<string, unknown> | null
  createdAt: string
}

export function verifyAdminOperationPin(body: unknown): string | null {
  const required = process.env.ADMIN_OPERATION_PIN?.trim()
  if (!required) return null
  const pin = String((body as { adminPin?: string })?.adminPin ?? '').trim()
  if (pin !== required) return '管理員操作 PIN 不正確'
  return null
}

export function auditActionLabel(action: AdminAuditAction): string {
  switch (action) {
    case 'grant_membership':
      return '開通／延長付費'
    case 'revoke_membership':
      return '取消付費'
    case 'set_membership_expiry':
      return '調整到期日'
    case 'enable_course':
      return '開通課程'
    case 'disable_course':
      return '取消課程'
    case 'approve_user':
      return '審核通過'
    case 'reject_user':
      return '拒絕申請'
    default:
      return action
  }
}
