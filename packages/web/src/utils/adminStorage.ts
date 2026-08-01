const ADMIN_TOKEN_KEY = 'kurssikone_adminToken'
const ADMIN_USER_KEY = 'kurssikone_adminUser'

export type AdminInfo = { id: number; username: string }

export const getAdminToken = (): string | null => {
  return localStorage.getItem(ADMIN_TOKEN_KEY)
}

export const setAdminToken = (token: string): void => {
  localStorage.setItem(ADMIN_TOKEN_KEY, token)
}

export const getAdminUser = (): AdminInfo | null => {
  const raw = localStorage.getItem(ADMIN_USER_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as AdminInfo
  } catch {
    return null
  }
}

export const setAdminUser = (admin: AdminInfo): void => {
  localStorage.setItem(ADMIN_USER_KEY, JSON.stringify(admin))
}

export const clearAdmin = (): void => {
  localStorage.removeItem(ADMIN_TOKEN_KEY)
  localStorage.removeItem(ADMIN_USER_KEY)
}
