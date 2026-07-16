export type UserStatus = 'pending' | 'approved' | 'rejected'
export type UserRole = 'user' | 'admin'
export type MembershipTier = 'free' | 'paid'

export interface AuthUser {
  id: number
  name: string
  phone: string
  email: string
  status: UserStatus
  role: UserRole
  starDrawEnabled: boolean
  membershipPlan: string | null
  membershipPlanLabel?: string
  membershipExpiresAt: string | null
  membershipActive: boolean
  membershipTier: MembershipTier
  birthDateTime: string | null
  createdAt: string
  approvedAt: string | null
}

export interface LoginResponse {
  token: string
  user: AuthUser
}

export interface RegisterResponse {
  message: string
}

export interface MeResponse {
  user: AuthUser
}

export interface UsersResponse {
  users: AuthUser[]
}

export type AdminMemberSegment = 'free' | 'paid' | 'pending' | 'admins'

export interface AdminMemberSummary {
  free: number
  paid: number
  pending: number
  admins: number
}

export interface AdminMembersResponse {
  segment: AdminMemberSegment
  members: AuthUser[]
  total: number
  summary: AdminMemberSummary
}

export interface AdminMemberSummaryResponse {
  summary: AdminMemberSummary
}
