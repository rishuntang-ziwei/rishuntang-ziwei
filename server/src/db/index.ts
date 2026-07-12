import * as postgres from './postgres.js'
import * as sqlite from './sqlite.js'

export function getDbDriverName(): 'postgres' | 'sqlite' {
  return process.env.DATABASE_URL?.trim() ? 'postgres' : 'sqlite'
}

const driver = getDbDriverName() === 'postgres' ? postgres : sqlite

export const initDb = () => driver.initDb()
export const getDbInfo = () => driver.getDbInfo()
export const findUserByEmail = (email: string) => driver.findUserByEmail(email)
export const findUserById = (id: number) => driver.findUserById(id)
export const createUser = (input: Parameters<typeof sqlite.createUser>[0]) => driver.createUser(input)
export const listUsers = () => driver.listUsers()
export const updateUserStatus = (id: number, status: 'approved' | 'rejected') =>
  driver.updateUserStatus(id, status)
export const updateUserPassword = (id: number, passwordHash: string) =>
  driver.updateUserPassword(id, passwordHash)
export const countAdmins = () => driver.countAdmins()
export const updateUserRole = (id: number, role: 'user' | 'admin') => driver.updateUserRole(id, role)
export const updateUserStarDraw = (id: number, enabled: boolean) => driver.updateUserStarDraw(id, enabled)
export const deleteUser = (id: number) => driver.deleteUser(id)
export const listSavedChartsByUser = (userId: number, search?: string) =>
  driver.listSavedChartsByUser(userId, search)
export const findSavedChartById = (id: number) => driver.findSavedChartById(id)
export const findSavedChartForUser = (id: number, userId: number) =>
  driver.findSavedChartForUser(id, userId)
export const createSavedChart = (userId: number, payload: Parameters<typeof sqlite.createSavedChart>[1]) =>
  driver.createSavedChart(userId, payload)
export const deleteSavedChart = (id: number, userId: number) => driver.deleteSavedChart(id, userId)
export const updateSavedChart = (
  id: number,
  userId: number,
  updates: { phone?: string; payload?: import('../types.js').SavedChartPayload },
) => driver.updateSavedChart(id, userId, updates)
export const getSavedChartDetailForUser = (chartId: number, userId: number) =>
  driver.getSavedChartDetailForUser(chartId, userId)
export const ensureAdminUser = () => driver.ensureAdminUser()

export { toPublicUser } from './shared.js'
