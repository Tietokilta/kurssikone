import { Link } from 'react-router-dom'
import { useAdminAuth } from '../contexts/AdminAuthContext'

const AdminBar = () => {
  const { admin, logout } = useAdminAuth()

  if (!admin) return null

  return (
    <div className="flex items-center gap-4">
      <Link to="/" className="text-sm text-blue-600 hover:text-blue-800">Home</Link>
      <Link to="/admin" className="text-sm text-blue-600 hover:text-blue-800">Admin Panel</Link>
      <span className="text-sm text-gray-600">Logged in as {admin.username}</span>
      <button
        onClick={logout}
        className="btn-secondary py-1 rounded-lg"
      >
        Log out
      </button>
    </div>
  )
}

export default AdminBar
