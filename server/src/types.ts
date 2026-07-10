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
  createdAt: string
  approvedAt: string | null
}

export interface JwtPayload {
  sub: number
  role: UserRole
}
