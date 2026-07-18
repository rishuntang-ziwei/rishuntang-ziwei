export type UserStatus = 'pending' | 'approved' | 'rejected'
export type UserRole = 'user' | 'admin'

export interface UserRow {
  id: number
  name: string
  phone: string
  email: string
  password_hash: string
  status: UserStatus
  role: UserRole
  star_draw_enabled: boolean
  membership_plan: string | null
  membership_expires_at: string | null
  birth_payload: string | null
  daily_chart_gen_date: string | null
  daily_chart_gen_count: number
  created_at: string
  approved_at: string | null
}

export interface PublicUser {
  id: number
  name: string
  phone: string
  email: string
  status: UserStatus
  role: UserRole
  starDrawEnabled: boolean
  membershipPlan: string | null
  membershipExpiresAt: string | null
  membershipActive: boolean
  membershipTier: 'free' | 'paid'
  birthDateTime: string | null
  dailyChartQuota: { used: number; limit: number; remaining: number } | null
  createdAt: string
  approvedAt: string | null
}

export type PaymentOrderStatus = 'pending' | 'paid' | 'failed'

export interface PaymentOrderRow {
  id: number
  user_id: number
  merchant_order_no: string
  plan_id: string
  amount: number
  status: PaymentOrderStatus
  newebpay_trade_no: string | null
  paid_at: string | null
  created_at: string
}

export interface JwtPayload {
  sub: number
  role?: UserRole
  purpose?: 'password-reset'
}

export type ChartGender = '男' | '女'
export type ChartCalendar = 'lunar' | 'solar'
export type InitialChartType = 'natal' | 'yearly'

export interface SavedChartPayload {
  name: string
  gender: ChartGender
  calendar: ChartCalendar
  date: string
  timeIndex: number
  isLeap: boolean
  initialChartType: InitialChartType
  yearlyYear: number
  bazi: string
}

export interface SavedChartRow {
  id: number
  user_id: number
  subject_name: string
  gender: ChartGender
  bazi: string
  phone: string
  payload: string
  created_at: string
  updated_at: string
}

export interface SavedChartSummary {
  id: number
  subjectName: string
  gender: ChartGender
  phone: string
  birthDateTime: string
  payload: SavedChartPayload
  createdAt: string
  updatedAt: string
}

export interface SavedChartDetail extends SavedChartSummary {
  payload: SavedChartPayload
}
