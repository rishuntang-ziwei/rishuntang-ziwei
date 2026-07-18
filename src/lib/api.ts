import type {
  AdminMemberSegment,
  AdminMemberSummaryResponse,
  AdminMembersResponse,
  ForgotPasswordResponse,
  LoginResponse,
  MeResponse,
  RegisterResponse,
  ResetPasswordResponse,
  UsersResponse,
} from '../types/auth'
import type {
  AdminUserBirthChartResponse,
  AdminUserChartsResponse,
  SavedChartPayload,
  SavedChartResponse,
  SavedChartsResponse,
} from '../types/charts'

const TOKEN_KEY = 'ziwei_auth_token'

export function getApiBase() {
  return import.meta.env.VITE_API_URL?.replace(/\/$/, '') ?? ''
}

export function getStarDrawUrl() {
  return 'star-draw/index.html'
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
  birth: SavedChartPayload
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

export function requestPasswordReset(body: { email: string; phone: string }) {
  return request<ForgotPasswordResponse>('/api/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export function resetPassword(body: {
  resetToken: string
  newPassword: string
  confirmPassword: string
}) {
  return request<ResetPasswordResponse>('/api/auth/reset-password', {
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

export function fetchAdminMemberSummary() {
  return request<AdminMemberSummaryResponse>('/api/admin/members/summary')
}

export function fetchAdminMembers(segment: AdminMemberSegment) {
  return request<AdminMembersResponse>(`/api/admin/members/${segment}`)
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

export function enableUserStarDraw(id: number) {
  return request<{ message: string; user: UsersResponse['users'][number] }>(
    `/api/admin/users/${id}/enable-star-draw`,
    { method: 'POST' },
  )
}

export function disableUserStarDraw(id: number) {
  return request<{ message: string; user: UsersResponse['users'][number] }>(
    `/api/admin/users/${id}/disable-star-draw`,
    { method: 'POST' },
  )
}

export function grantUserMembership(id: number, planId: string) {
  return request<{ message: string; planLabel: string; user: UsersResponse['users'][number] }>(
    `/api/admin/users/${id}/grant-membership`,
    {
      method: 'POST',
      body: JSON.stringify({ planId }),
    },
  )
}

export function deleteUserAccount(id: number) {
  return request<{ message: string }>(`/api/admin/users/${id}`, { method: 'DELETE' })
}

export function fetchSavedCharts(search?: string) {
  const q = search?.trim() ? `?q=${encodeURIComponent(search.trim())}` : ''
  return request<SavedChartsResponse>(`/api/charts${q}`)
}

export function saveChart(payload: SavedChartPayload) {
  return request<SavedChartResponse>('/api/charts', {
    method: 'POST',
    body: JSON.stringify({ payload }),
  })
}

export function fetchSavedChart(id: number) {
  return request<SavedChartResponse>(`/api/charts/${id}`)
}

export function deleteSavedChart(id: number) {
  return request<{ message: string }>(`/api/charts/${id}`, { method: 'DELETE' })
}

export function updateSavedChart(
  id: number,
  data: { phone?: string; payload?: SavedChartPayload },
) {
  return request<SavedChartResponse>(`/api/charts/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

export function fetchAdminUserCharts(userId: number, search?: string) {
  const q = search?.trim() ? `?q=${encodeURIComponent(search.trim())}` : ''
  return request<AdminUserChartsResponse>(`/api/admin/users/${userId}/charts${q}`)
}

export function fetchAdminUserChart(userId: number, chartId: number) {
  return request<SavedChartResponse>(`/api/admin/users/${userId}/charts/${chartId}`)
}

export function fetchAdminUserBirthChart(userId: number) {
  return request<AdminUserBirthChartResponse>(`/api/admin/users/${userId}/birth-chart`)
}
