import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  fetchCurrentUser,
  loginUser,
  registerUser,
  setStoredToken,
  getStoredToken,
} from '../lib/api'
import type { AuthUser } from '../types/auth'

interface AuthContextValue {
  user: AuthUser | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (input: {
    name: string
    phone: string
    email: string
    password: string
    confirmPassword: string
    birth: import('../types/charts').SavedChartPayload
  }) => Promise<string>
  logout: () => void
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  const refreshUser = useCallback(async () => {
    const token = getStoredToken()
    if (!token) {
      setUser(null)
      return
    }
    const { user: current } = await fetchCurrentUser()
    setUser(current)
  }, [])

  useEffect(() => {
    refreshUser()
      .catch(() => {
        setStoredToken(null)
        setUser(null)
      })
      .finally(() => setLoading(false))
  }, [refreshUser])

  const login = useCallback(async (email: string, password: string) => {
    const { token, user: loggedIn } = await loginUser({ email, password })
    setStoredToken(token)
    setUser(loggedIn)
  }, [])

  const register = useCallback(
    async (input: {
      name: string
      phone: string
      email: string
      password: string
      confirmPassword: string
      birth: import('../types/charts').SavedChartPayload
    }) => {
      const { message } = await registerUser(input)
      return message
    },
    [],
  )

  const logout = useCallback(() => {
    setStoredToken(null)
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({ user, loading, login, register, logout, refreshUser }),
    [user, loading, login, register, logout, refreshUser],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
