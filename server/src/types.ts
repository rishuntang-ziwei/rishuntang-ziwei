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
  createdAt: string
  approvedAt: string | null
}

export interface JwtPayload {
  sub: number
  role: UserRole
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
  payload: string
  created_at: string
  updated_at: string
}

export interface SavedChartSummary {
  id: number
  subjectName: string
  gender: ChartGender
  bazi: string
  birthDateTime: string
  createdAt: string
  updatedAt: string
}

export interface SavedChartDetail extends SavedChartSummary {
  payload: SavedChartPayload
}
