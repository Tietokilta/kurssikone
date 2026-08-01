import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { AdminUser, Review } from '../models'
import { ADMIN_SECRET, JWT_SECRET } from '../utils/config'
import { adminAuth } from '../middleware/adminAuth'
import { refreshCourseReviewAggregates } from '../services/reviewAggregates'
import { runFullSync } from '../services/sisuSync'

const router = Router()

const signToken = (admin: { id: number; username: string }) =>
  jwt.sign({ adminId: admin.id, username: admin.username }, JWT_SECRET, { expiresIn: '24h' })

router.get('/status', async (_req, res) => {
  const count = await AdminUser.count()
  res.json({ bootstrapped: count > 0 })
})

router.post('/bootstrap', async (req, res) => {
  const { secret, username, password } = req.body

  const count = await AdminUser.count()
  if (count > 0) {
    return res.status(403).json({ error: 'Bootstrap no longer available' })
  }

  if (!ADMIN_SECRET || secret !== ADMIN_SECRET) {
    return res.status(401).json({ error: 'Invalid secret' })
  }

  if (!username || typeof username !== 'string' || username.length < 3 || username.length > 50) {
    return res.status(400).json({ error: 'Username must be 3-50 characters' })
  }

  if (!password || typeof password !== 'string' || password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' })
  }

  const passwordHash = await bcrypt.hash(password, 12)
  const admin = await AdminUser.create({ username, passwordHash })

  const token = signToken({ id: admin.id, username: admin.username })
  res.json({ token, admin: { id: admin.id, username: admin.username } })
})

router.post('/login', async (req, res) => {
  const { username, password } = req.body

  const admin = await AdminUser.findOne({ where: { username } })
  if (!admin) {
    return res.status(401).json({ error: 'Invalid credentials' })
  }

  const valid = await bcrypt.compare(password, admin.passwordHash)
  if (!valid) {
    return res.status(401).json({ error: 'Invalid credentials' })
  }

  const token = signToken({ id: admin.id, username: admin.username })
  res.json({ token, admin: { id: admin.id, username: admin.username } })
})

router.delete('/reviews/:id', adminAuth, async (req, res) => {
  const id = Number(req.params.id)
  const review = await Review.findByPk(id)
  if (!review) {
    return res.status(404).json({ error: 'Review not found' })
  }

  const { courseCode } = review
  await review.destroy()
  await refreshCourseReviewAggregates(courseCode)
  res.status(204).end()
})

router.post('/sync', adminAuth, async (_req, res) => {
  try {
    const result = await runFullSync()
    res.json({ message: 'Sync completed successfully', ...result })
  } catch (error) {
    console.error('Manual sync failed:', error)
    res.status(500).json({ error: 'Sync failed' })
  }
})

router.get('/admins', adminAuth, async (_req, res) => {
  const admins = await AdminUser.findAll({ attributes: ['id', 'username'] })
  res.json({ admins })
})

router.delete('/admins/:id', adminAuth, async (req, res) => {
  const id = Number(req.params.id)

  if (id === req.adminUser!.id) {
    return res.status(400).json({ error: 'Cannot delete yourself' })
  }

  const admin = await AdminUser.findByPk(id)
  if (!admin) {
    return res.status(404).json({ error: 'Admin not found' })
  }

  await admin.destroy()
  res.status(204).end()
})

router.post('/admins', adminAuth, async (req, res) => {
  const { username, password } = req.body

  if (!username || typeof username !== 'string' || username.length < 3 || username.length > 50) {
    return res.status(400).json({ error: 'Username must be 3-50 characters' })
  }

  if (!password || typeof password !== 'string' || password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' })
  }

  const existing = await AdminUser.findOne({ where: { username } })
  if (existing) {
    return res.status(409).json({ error: 'Username already taken' })
  }

  const passwordHash = await bcrypt.hash(password, 12)
  const admin = await AdminUser.create({ username, passwordHash })
  res.json({ admin: { id: admin.id, username: admin.username } })
})

export default router
