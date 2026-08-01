import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import {
  getAdminToken,
  setAdminToken,
  getAdminUser,
  setAdminUser,
  clearAdmin,
  type AdminInfo,
} from '../utils/adminStorage'

const isTokenExpired = (token: string): boolean => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return payload.exp * 1000 < Date.now()
  } catch {
    return true
  }
}

type AdminAuthContextType = {
  token: string | null
  admin: AdminInfo | null
  login: (token: string, admin: AdminInfo) => void
  logout: () => void
  isLoading: boolean
}

const AdminAuthContext = createContext<AdminAuthContextType>({
  token: null,
  admin: null,
  login: () => {},
  logout: () => {},
  isLoading: true,
})

export const useAdminAuth = () => useContext(AdminAuthContext)

export const AdminAuthProvider = ({ children }: { children: ReactNode }) => {
  const [token, setToken] = useState<string | null>(null)
  const [admin, setAdmin] = useState<AdminInfo | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const storedToken = getAdminToken()
    const storedAdmin = getAdminUser()
    if (storedToken && storedAdmin && !isTokenExpired(storedToken)) {
      setToken(storedToken)
      setAdmin(storedAdmin)
    } else if (storedToken) {
      clearAdmin()
    }
    setIsLoading(false)
  }, [])

  const login = (newToken: string, adminInfo: AdminInfo) => {
    setAdminToken(newToken)
    setAdminUser(adminInfo)
    setToken(newToken)
    setAdmin(adminInfo)
  }

  const logout = () => {
    clearAdmin()
    setToken(null)
    setAdmin(null)
  }

  return (
    <AdminAuthContext.Provider value={{ token, admin, login, logout, isLoading }}>
      {children}
    </AdminAuthContext.Provider>
  )
}
