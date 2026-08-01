import { Routes, Route } from 'react-router-dom'
import HomePage from './pages/HomePage'
import CoursePage from './pages/CoursePage'
import AdminPage from './pages/admin/AdminPage'
import Layout from './components/Layout'
import { AdminAuthProvider } from './contexts/AdminAuthContext'

function App() {
  return (
    <AdminAuthProvider>
      <Layout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/course/:courseCode" element={<CoursePage />} />
          <Route path="/admin" element={<AdminPage />} />
        </Routes>
      </Layout>
    </AdminAuthProvider>
  )
}

export default App
