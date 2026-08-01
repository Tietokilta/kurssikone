import { useAdminAuth } from '../contexts/AdminAuthContext'

const AdminBar = () => {
  const { admin, logout } = useAdminAuth()

  if (!admin) return null

  return (
    <div className="flex items-center gap-4">
      <span className="text-sm text-gray-600">Logged in as {admin.username}</span>
      <button
        onClick={logout}
        className="px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-100"
      >
        Log out
      </button>
    </div>
  )
}

export default AdminBar
