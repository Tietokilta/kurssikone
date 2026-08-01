import { useState } from 'react'
import AdminSyncPanel from './AdminSyncPanel'
import AdminManagementPanel from './AdminManagementPanel'

type Props = {
  token: string
}

type Tab = 'sync' | 'admins'

const AdminDashboard = ({ token }: Props) => {
  const [activeTab, setActiveTab] = useState<Tab>('sync')

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Admin Panel</h1>

      <div className="flex gap-1 border-b border-gray-300 mb-6">
        <button
          onClick={() => setActiveTab('sync')}
          className={`px-4 py-2 text-sm font-medium -mb-px ${
            activeTab === 'sync'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Sync
        </button>
        <button
          onClick={() => setActiveTab('admins')}
          className={`px-4 py-2 text-sm font-medium -mb-px ${
            activeTab === 'admins'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Admin Management
        </button>
      </div>

      {activeTab === 'sync' && <AdminSyncPanel token={token} />}
      {activeTab === 'admins' && <AdminManagementPanel token={token} />}
    </div>
  )
}

export default AdminDashboard
