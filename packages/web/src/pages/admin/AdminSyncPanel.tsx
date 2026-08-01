import { useState } from 'react'
import { triggerSync } from '../../api/adminClient'

type Props = {
  token: string
}

const AdminSyncPanel = ({ token }: Props) => {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleSync = async () => {
    setLoading(true)
    setResult(null)
    setError(null)

    try {
      const data = await triggerSync(token)
      setResult(data.message || 'Sync completed successfully')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sync failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <p className="text-gray-600 mb-4">
        Trigger a manual sync of course data from the Sisu API. It's also done automatically every
        day at 03:00.
      </p>
      <button
        onClick={handleSync}
        disabled={loading}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Syncing...' : 'Run Sync'}
      </button>
      {result && <p className="mt-4 text-green-700">{result}</p>}
      {error && <p className="mt-4 text-red-600">{error}</p>}
    </div>
  )
}

export default AdminSyncPanel
