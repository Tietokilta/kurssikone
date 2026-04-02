import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const HomePage = () => {
  const [courseCode, setCourseCode] = useState('')
  const navigate = useNavigate()

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (courseCode.trim()) {
      navigate(`/course/${encodeURIComponent(courseCode.trim().toUpperCase())}`)
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-medium mb-2">Kurssikompassi</h1>
      <p className="text-gray-600 mb-8">
        Find and share course reviews for Aalto University courses
      </p>

      <form onSubmit={handleSearch} className="mb-8">
        <div className="flex gap-2 max-w-md">
          <input
            type="text"
            value={courseCode}
            onChange={(e) => setCourseCode(e.target.value)}
            placeholder="Enter course code (e.g., CS-A1140)"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Search
          </button>
        </div>
      </form>

      <div className="bg-gray-100 border border-gray-300 rounded-md p-6 mb-8">
        <h2 className="text-lg font-medium mb-4">How it works</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <h3 className="font-medium mb-1">1. Search</h3>
            <p className="text-sm text-gray-600">Enter a course code to find reviews</p>
          </div>
          <div>
            <h3 className="font-medium mb-1">2. Read</h3>
            <p className="text-sm text-gray-600">See ratings and reviews from other students</p>
          </div>
          <div>
            <h3 className="font-medium mb-1">3. Write</h3>
            <p className="text-sm text-gray-600">Share your own experience with a review</p>
          </div>
        </div>
      </div>

      <div>
        <h3 className="font-medium mb-3">Popular course codes</h3>
        <div className="flex gap-2 flex-wrap">
          {['CS-A1140', 'MS-A0001', 'ELEC-A7100', 'TU-A1100'].map((code) => (
            <button
              key={code}
              onClick={() => navigate(`/course/${code}`)}
              className="px-3 py-1.5 text-sm bg-gray-200 text-gray-900 border border-gray-300 rounded-md hover:bg-gray-300 transition-colors"
            >
              {code}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export default HomePage
