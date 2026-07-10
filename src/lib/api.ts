import type {
  LoginResponse,
  MeResponse,
  RegisterResponse,
  UsersResponse,
} from '../types/auth'

const TOKEN_KEY = 'ziwei_auth_token'

export function getApiBase() {
  return import.meta.env.VITE_API_URL?.replace(/\/$/, '') ?? ''
}

export function getStoredToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function setStoredToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getStoredToken()
  const headers = new Headers(init.headers)
  headers.set('Content-Type', 'application/json')
  if (token) headers.set('Authorization', `Bearer ${token}`)

  const res = await fetch(`${getApiBase()}${path}`, { ...init, headers })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(typeof data.error === 'string' ? data.error : '請求失敗')
  }
  return data as T
}

export function registerUser(body: {
  name: string
  phone: string
  email: string
  password: string
  confirmPassword: string
}) {
  return request<RegisterResponse>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export function loginUser(body: { email: string; password: string }) {
  return request<LoginResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export function fetchCurrentUser() {
  return request<MeResponse>('/api/auth/me')
}

export function fetchAdminUsers() {
  return request<UsersResponse>('/api/admin/users')
}

export function approveUser(id: number) {
  return request<{ user: UsersResponse['users'][number] }>(`/api/admin/users/${id}/approve`, {
    method: 'POST',
  })
}

export function rejectUser(id: number) {
  return request<{ user: UsersResponse['users'][number] }>(`/api/admin/users/${id}/reject`, {
    method: 'POST',
  })
}

export function makeUserAdmin(id: number) {
  return request<{ message: string; user: UsersResponse['users'][number] }>(
    `/api/admin/users/${id}/make-admin`,
    { method: 'POST' },
  )
}

export function revokeUserAdmin(id: number) {
  return request<{ message: string; user: UsersResponse['users'][number] }>(
    `/api/admin/users/${id}/revoke-admin`,
    { method: 'POST' },
  )
}

export function deleteUserAccount(id: number) {
  return request<{ message: string }>(`/api/admin/users/${id}`, { method: 'DELETE' })
}
