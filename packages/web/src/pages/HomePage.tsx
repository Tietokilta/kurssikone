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
    <div style={{ maxWidth: 600, margin: '0 auto', textAlign: 'center' }}>
      <h1 style={{ fontSize: 36, marginBottom: 16 }}>Kurssikompassi</h1>
      <p style={{ fontSize: 18, color: '#666', marginBottom: 40 }}>
        Find and share course reviews for Aalto University courses
      </p>

      <form onSubmit={handleSearch} style={{ marginBottom: 40 }}>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <input
            type="text"
            value={courseCode}
            onChange={(e) => setCourseCode(e.target.value)}
            placeholder="Enter course code (e.g., CS-A1140)"
            style={{
              padding: '12px 16px',
              fontSize: 16,
              width: '100%',
              maxWidth: 350,
              borderRadius: 8,
              border: '2px solid #ddd',
            }}
          />
          <button
            type="submit"
            className="btn btn-primary"
            style={{ padding: '12px 24px', fontSize: 16 }}
          >
            Search
          </button>
        </div>
      </form>

      <div
        style={{
          backgroundColor: '#fff',
          padding: 30,
          borderRadius: 12,
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        }}
      >
        <h2 style={{ fontSize: 20, marginBottom: 16 }}>How it works</h2>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: 20,
            textAlign: 'left',
          }}
        >
          <div>
            <h3 style={{ fontSize: 16, marginBottom: 8 }}>1. Search</h3>
            <p style={{ fontSize: 14, color: '#666' }}>
              Enter a course code to find reviews
            </p>
          </div>
          <div>
            <h3 style={{ fontSize: 16, marginBottom: 8 }}>2. Read</h3>
            <p style={{ fontSize: 14, color: '#666' }}>
              See ratings and reviews from other students
            </p>
          </div>
          <div>
            <h3 style={{ fontSize: 16, marginBottom: 8 }}>3. Write</h3>
            <p style={{ fontSize: 14, color: '#666' }}>
              Share your own experience with a review
            </p>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 40, padding: 20 }}>
        <h3 style={{ fontSize: 18, marginBottom: 12 }}>Popular course codes to try</h3>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          {['CS-A1140', 'MS-A0001', 'ELEC-A7100', 'TU-A1100'].map((code) => (
            <button
              key={code}
              onClick={() => navigate(`/course/${code}`)}
              className="btn btn-secondary btn-sm"
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
