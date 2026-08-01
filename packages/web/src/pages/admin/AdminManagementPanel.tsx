import { useState, useEffect } from 'react'
import { listAdmins, createAdmin, deleteAdmin } from '../../api/adminClient'
import { useAdminAuth } from '../../contexts/AdminAuthContext'
import type { AdminInfo } from '../../utils/adminStorage'

type Props = {
  token: string
}

const AdminManagementPanel = ({ token }: Props) => {
  const { admin: currentAdmin } = useAdminAuth()
  const [admins, setAdmins] = useState<AdminInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [creating, setCreating] = useState(false)
  const [deleting, setDeleting] = useState<number | null>(null)

  useEffect(() => {
    const fetchAdmins = async () => {
      try {
        const data = await listAdmins(token)
        setAdmins(data.admins)
      } catch (err) {
        console.error('Failed to fetch admins:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchAdmins()
  }, [token])

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this admin?')) return
    setDeleting(id)
    setError('')
    try {
      await deleteAdmin(token, id)
      setAdmins((prev) => prev.filter((a) => a.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete admin')
    } finally {
      setDeleting(null)
    }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setCreating(true)

    try {
      const { admin } = await createAdmin(token, username, password)

      if (!admins.find((a) => a.username === admin.username)) {
        setAdmins((prev) => [...prev, admin])
        setSuccess(`Created new admin ${admin.username}`)
      } else {
        setSuccess(`Updated password for admin ${admin.username}`)
      }

      setUsername('')
      setPassword('')

      setTimeout(() => setSuccess(''), 5000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create admin')
    } finally {
      setCreating(false)
    }
  }

  if (loading) return <p className="text-gray-500">Loading...</p>

  return (
    <div>
      <h3 className="text-lg font-semibold mb-3">Current Admins</h3>
      <ul className="mb-6 space-y-1">
        {admins.map((admin) => (
          <li key={admin.id} className="text-sm text-gray-700 flex items-center gap-2">
            <span>{admin.username}</span>
            {admin.id !== currentAdmin?.id && (
              <button
                onClick={() => handleDelete(admin.id)}
                disabled={deleting === admin.id}
                className="text-red-600 hover:text-red-800 text-xs disabled:opacity-50"
              >
                {deleting === admin.id ? 'Deleting...' : 'Delete'}
              </button>
            )}
          </li>
        ))}
      </ul>

      <h3 className="text-lg font-semibold mb-3">Create/Update Admin</h3>
      <form onSubmit={handleCreate} className="space-y-3 max-w-sm">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            required
            minLength={3}
            maxLength={50}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            required
            minLength={8}
          />
        </div>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        {success && <p className="text-green-600 text-sm">{success}</p>}

        <button
          type="submit"
          disabled={creating}
          className="btn-primary px-4 py-2 rounded-lg"
        >
          {creating ? 'Working...' : 'Create/Update Admin'}
        </button>
      </form>
    </div>
  )
}

export default AdminManagementPanel
