import crypto from 'crypto'

export const hashUserId = (rawId: string): string =>
  crypto.createHash('sha256').update(rawId).digest('hex')
