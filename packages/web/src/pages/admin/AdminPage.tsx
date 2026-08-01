import { useState, useEffect } from 'react'
import { getAdminStatus } from '../../api/adminClient'
import { useAdminAuth } from '../../contexts/AdminAuthContext'
import AdminBootstrapForm from './AdminBootstrapForm'
import AdminLoginForm from './AdminLoginForm'
import AdminDashboard from './AdminDashboard'

const AdminPage = () => {
  const { token, admin, login, isLoading: isAuthLoading } = useAdminAuth()
  const [bootstrapped, setBootstrapped] = useState<boolean | null>(null)

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const status = await getAdminStatus()
        setBootstrapped(status.bootstrapped)
      } catch (err) {
        console.error('Failed to check admin status:', err)
      }
    }
    checkStatus()
  }, [])

  const handleLogin = (newToken: string, adminInfo: { id: number; username: string }) => {
    login(newToken, adminInfo)
    setBootstrapped(true)
  }

  if (isAuthLoading || bootstrapped === null) {
    return <p className="text-gray-500 mt-16 text-center">Loading...</p>
  }

  if (token && admin) {
    return <AdminDashboard token={token} />
  }

  if (!bootstrapped) {
    return <AdminBootstrapForm onLogin={handleLogin} />
  }

  return <AdminLoginForm onLogin={handleLogin} />
}

export default AdminPage
