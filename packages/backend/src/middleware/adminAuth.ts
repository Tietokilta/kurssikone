import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { AdminUser } from '../models'
import { JWT_SECRET } from '../utils/config'

export const adminAuth = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const token = authHeader.slice(7)

  try {
    const payload = jwt.verify(token, JWT_SECRET) as { adminId: number; username: string }
    const admin = await AdminUser.findByPk(payload.adminId)
    if (!admin) {
      return res.status(401).json({ error: 'Unauthorized' })
    }
    req.adminUser = { id: admin.id, username: admin.username }
    next()
  } catch {
    return res.status(401).json({ error: 'Unauthorized' })
  }
}
