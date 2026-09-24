const USER_ID_KEY = 'kurssikone_userId'
const ANONYMOUS_REACTOR_ID_KEY = 'kurssikone_anonymousReactorId'

export const getUserId = (): string | null => {
  return localStorage.getItem(USER_ID_KEY)
}

export const setUserId = (userId: string): void => {
  localStorage.setItem(USER_ID_KEY, userId)
}

export const clearUserId = (): void => {
  localStorage.removeItem(USER_ID_KEY)
}

export const getAnonymousReactorId = (): string => {
  let id = localStorage.getItem(ANONYMOUS_REACTOR_ID_KEY)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(ANONYMOUS_REACTOR_ID_KEY, id)
  }
  return id
}
