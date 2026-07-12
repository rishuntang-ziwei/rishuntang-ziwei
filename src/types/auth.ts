export type UserStatus = 'pending' | 'approved' | 'rejected'
export type UserRole = 'user' | 'admin'

export interface AuthUser {
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
