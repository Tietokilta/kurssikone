import express from 'express'

const router = express.Router()

router.get('/:courseCode', async (req, res) => {
  const { courseCode } = req.params

  const response = await fetch(`https://tenttiarkisto.fi/api/courses/${courseCode}`)

  if (!response.ok) {
    return res.status(response.status).json({ error: 'Failed to fetch exams' })
  }

  const data = await response.json()
  return res.json(data)
})

export default router
