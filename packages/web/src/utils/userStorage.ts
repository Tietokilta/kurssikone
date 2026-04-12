const USER_ID_KEY = 'kurssikone_userId'

export const getUserId = (): string | null => {
  return localStorage.getItem(USER_ID_KEY)
}

export const setUserId = (userId: string): void => {
  localStorage.setItem(USER_ID_KEY, userId)
}

export const clearUserId = (): void => {
  localStorage.removeItem(USER_ID_KEY)
}
