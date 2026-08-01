import type { AdminInfo } from '../utils/adminStorage'

const host = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

const authHeaders = (token: string): HeadersInit => ({
  Authorization: `Bearer ${token}`,
  'Content-Type': 'application/json',
})

export const getAdminStatus = async (): Promise<{ bootstrapped: boolean }> => {
  const res = await fetch(`${host}/admin/status`)
  return res.json()
}

export const bootstrapAdmin = async (
  secret: string,
  username: string,
  password: string
): Promise<{ token: string; admin: AdminInfo }> => {
  const res = await fetch(`${host}/admin/bootstrap`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ secret, username, password }),
  })
  if (!res.ok) {
    const data = await res.json()
    throw new Error(data.error || 'Bootstrap failed')
  }
  return res.json()
}

export const loginAdmin = async (
  username: string,
  password: string
): Promise<{ token: string; admin: AdminInfo }> => {
  const res = await fetch(`${host}/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })
  if (!res.ok) {
    const data = await res.json()
    throw new Error(data.error || 'Login failed')
  }
  return res.json()
}

export const deleteAdminReview = async (token: string, reviewId: number): Promise<void> => {
  const res = await fetch(`${host}/admin/reviews/${reviewId}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  })
  if (!res.ok) throw new Error('Failed to delete review')
}

export const triggerSync = async (
  token: string
): Promise<{ message: string }> => {
  const res = await fetch(`${host}/admin/sync`, {
    method: 'POST',
    headers: authHeaders(token),
  })
  if (!res.ok) throw new Error('Sync failed')
  return res.json()
}

export const listAdmins = async (
  token: string
): Promise<{ admins: AdminInfo[] }> => {
  const res = await fetch(`${host}/admin/admins`, {
    headers: authHeaders(token),
  })
  if (!res.ok) throw new Error('Unauthorized')
  return res.json()
}

export const deleteAdmin = async (token: string, id: number): Promise<void> => {
  const res = await fetch(`${host}/admin/admins/${id}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  })
  if (!res.ok) {
    const text = await res.text()
    let message = 'Failed to delete admin'
    try {
      message = JSON.parse(text).error || message
    } catch { /* non-JSON response */ }
    throw new Error(message)
  }
}

export const createAdmin = async (
  token: string,
  username: string,
  password: string
): Promise<{ admin: AdminInfo }> => {
  const res = await fetch(`${host}/admin/admins`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ username, password }),
  })
  if (!res.ok) {
    const data = await res.json()
    throw new Error(data.error || 'Failed to create admin')
  }
  return res.json()
}
