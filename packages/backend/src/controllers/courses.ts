import express from 'express'
import { Op, literal } from 'sequelize'
import { Course, CourseRealisation } from '../models'
import { runFullSync } from '../services/sisuSync'

const router = express.Router()

router.get('/', async (req, res) => {
  const { search, limit = '50', offset = '0' } = req.query

  const limitNum = Math.min(parseInt(limit as string, 10) || 50, 100)
  const offsetNum = parseInt(offset as string, 10) || 0

  const where: Record<string, unknown> = {}
  if (search && typeof search === 'string') {
    where[Op.or as unknown as string] = [
      { code: { [Op.iLike]: `%${search}%` } },
      { nameEn: { [Op.iLike]: `%${search}%` } },
      { nameFi: { [Op.iLike]: `%${search}%` } },
    ]
  }

  where.id = {
    [Op.in]: literal(`(
      SELECT DISTINCT ON (code) id
      FROM courses
      ORDER BY code, validity_start DESC NULLS LAST
    )`),
  }

  const { count, rows: courses } = await Course.findAndCountAll({
    where,
    limit: limitNum,
    offset: offsetNum,
    order: [['code', 'ASC']],
  })

  res.json({
    courses,
    total: count,
    limit: limitNum,
    offset: offsetNum,
  })
})

router.get('/:code', async (req, res) => {
  const { code } = req.params

  const courses = await Course.findAll({
    where: { code },
    include: [{ model: CourseRealisation, as: 'courseRealisations' }],
    order: [['validityStart', 'DESC']],
  })

  if (courses.length === 0) {
    return res.status(404).json({ error: 'Course not found' })
  }

  return res.json(courses)
})

router.get('/:code/realisations', async (req, res) => {
  const { code } = req.params

  const realisations = await CourseRealisation.findAll({
    where: { code },
    order: [['startDate', 'DESC']],
  })

  res.json(realisations)
})

router.post('/sync', async (req, res) => {
  const authHeader = req.headers.authorization
  const expectedSecret = process.env.GET_ALL_SECRET

  if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    const result = await runFullSync()
    return res.json({
      message: 'Sync completed successfully',
      ...result,
    })
  } catch (error) {
    console.error('Manual sync failed:', error)
    return res.status(500).json({ error: 'Sync failed' })
  }
})

export default router
