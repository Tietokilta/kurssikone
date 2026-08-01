import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { listAdmins } from '../api/adminClient'
import {
  getAdminToken,
  setAdminToken,
  getAdminUser,
  setAdminUser,
  clearAdmin,
  type AdminInfo,
} from '../utils/adminStorage'

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
    const init = async () => {
      const storedToken = getAdminToken()
      const storedAdmin = getAdminUser()
      if (storedToken && storedAdmin) {
        try {
          await listAdmins(storedToken)
          setToken(storedToken)
          setAdmin(storedAdmin)
        } catch {
          clearAdmin()
        }
      }
      setIsLoading(false)
    }
    init()
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
