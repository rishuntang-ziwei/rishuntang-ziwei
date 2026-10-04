import type { PublicUser, UserRow } from './types.js'

type AdminRoleFields = Pick<UserRow, 'role' | 'is_super_admin'> | Pick<PublicUser, 'role' | 'isSuperAdmin'>

function userIsSuperAdmin(user: AdminRoleFields): boolean {
  if ('is_super_admin' in user) return user.role === 'admin' && Boolean(user.is_super_admin)
  return user.role === 'admin' && Boolean(user.isSuperAdmin)
}

export function isAdminUser(user: Pick<UserRow | PublicUser, 'role'>): boolean {
  return user.role === 'admin'
}

export function isSuperAdminUser(user: AdminRoleFields): boolean {
  return userIsSuperAdmin(user)
}

export function adminRoleLabel(user: AdminRoleFields): string {
  if (isSuperAdminUser(user)) return '超級管理員'
  if (isAdminUser(user)) return '管理員'
  return ''
}
