import { formatBirthDateTime } from '../chartFormat.js'
import { dailyChartQuotaForUser } from '../chartQuota.js'
import type {
  PublicUser,
  SavedChartDetail,
  SavedChartPayload,
  SavedChartRow,
  SavedChartSummary,
  UserRow,
} from '../types.js'

export function birthDateTimeFromUser(row: UserRow): string | null {
  if (!row.birth_payload) return null
  try {
    const payload = parseSavedChartPayload(row.birth_payload)
    return formatBirthDateTime(payload)
  } catch {
    return null
  }
}

export function parseSavedChartPayload(raw: string): SavedChartPayload {
  return JSON.parse(raw) as SavedChartPayload
}

export function toSavedChartSummary(row: SavedChartRow): SavedChartSummary {
  const payload = parseSavedChartPayload(row.payload)
  return {
    id: row.id,
    subjectName: row.subject_name,
    gender: row.gender,
    phone: row.phone,
    birthDateTime: formatBirthDateTime(payload),
    payload,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function toSavedChartDetail(row: SavedChartRow): SavedChartDetail {
  return {
    ...toSavedChartSummary(row),
    payload: parseSavedChartPayload(row.payload),
  }
}

export function isMembershipActive(row: UserRow): boolean {
  if (row.role === 'admin') return true
  if (!row.membership_expires_at) return false
  return new Date(row.membership_expires_at).getTime() > Date.now()
}

export function membershipTier(row: UserRow): 'free' | 'paid' {
  return isMembershipActive(row) ? 'paid' : 'free'
}

export function toPublicUser(row: UserRow): PublicUser {
  const membershipActive = isMembershipActive(row)
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    email: row.email,
    status: row.status,
    role: row.role,
    starDrawEnabled: row.star_draw_enabled,
    membershipPlan: row.membership_plan,
    membershipExpiresAt: row.membership_expires_at,
    membershipActive,
    membershipTier: membershipTier(row),
    birthDateTime: birthDateTimeFromUser(row),
    dailyChartQuota: dailyChartQuotaForUser(row),
    createdAt: row.created_at,
    approvedAt: row.approved_at,
  }
}

export function toIsoString(value: unknown): string {
  if (value instanceof Date) return value.toISOString()
  return String(value)
}

export function toIsoStringOrNull(value: unknown): string | null {
  if (value == null) return null
  return toIsoString(value)
}

export function mapUserRow(row: Record<string, unknown>): UserRow {
  return {
    id: Number(row.id),
    name: String(row.name),
    phone: String(row.phone),
    email: String(row.email),
    password_hash: String(row.password_hash),
    status: row.status as UserRow['status'],
    role: row.role as UserRow['role'],
    star_draw_enabled: Boolean(row.star_draw_enabled),
    membership_plan: row.membership_plan != null ? String(row.membership_plan) : null,
    membership_expires_at: toIsoStringOrNull(row.membership_expires_at),
    birth_payload: row.birth_payload != null ? String(row.birth_payload) : null,
    daily_chart_gen_date: row.daily_chart_gen_date != null ? String(row.daily_chart_gen_date) : null,
    daily_chart_gen_count: Number(row.daily_chart_gen_count ?? 0),
    created_at: toIsoString(row.created_at),
    approved_at: toIsoStringOrNull(row.approved_at),
  }
}

export function mapPaymentOrderRow(row: Record<string, unknown>): import('../types.js').PaymentOrderRow {
  return {
    id: Number(row.id),
    user_id: Number(row.user_id),
    merchant_order_no: String(row.merchant_order_no),
    plan_id: String(row.plan_id),
    amount: Number(row.amount),
    status: row.status as import('../types.js').PaymentOrderStatus,
    newebpay_trade_no: row.newebpay_trade_no != null ? String(row.newebpay_trade_no) : null,
    paid_at: toIsoStringOrNull(row.paid_at),
    created_at: toIsoString(row.created_at),
  }
}

export function mapSavedChartRow(row: Record<string, unknown>): SavedChartRow {
  return {
    id: Number(row.id),
    user_id: Number(row.user_id),
    subject_name: String(row.subject_name),
    gender: row.gender as SavedChartRow['gender'],
    bazi: String(row.bazi),
    phone: String(row.phone ?? ''),
    payload: String(row.payload),
    created_at: toIsoString(row.created_at),
    updated_at: toIsoString(row.updated_at),
  }
}
