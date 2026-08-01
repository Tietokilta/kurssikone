import { useState } from 'react'
import AdminSyncPanel from './AdminSyncPanel'
import AdminManagementPanel from './AdminManagementPanel'

type Props = {
  token: string
  adminUsername: string
  onLogout: () => void
}

type Tab = 'sync' | 'admins'

const AdminDashboard = ({ token, adminUsername, onLogout }: Props) => {
  const [activeTab, setActiveTab] = useState<Tab>('sync')

  const tabs: { key: Tab; label: string }[] = [
    { key: 'sync', label: 'Sync' },
    { key: 'admins', label: 'Admin Management' },
  ]

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Admin Panel</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">Logged in as {adminUsername}</span>
          <button
            onClick={onLogout}
            className="px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-100"
          >
            Log out
          </button>
        </div>
      </div>

      <div className="flex gap-1 border-b border-gray-300 mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium -mb-px ${
              activeTab === tab.key
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'sync' && <AdminSyncPanel token={token} />}
      {activeTab === 'admins' && <AdminManagementPanel token={token} />}
    </div>
  )
}

export default AdminDashboard
