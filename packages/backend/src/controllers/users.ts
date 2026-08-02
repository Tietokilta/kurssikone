import { Router } from 'express'
import { User } from '../models'
import hashIt from 'hash-it'
import { hashUserId } from '../utils/hashUserId'

const router = Router()

router.post('/', async (req, res) => {
  try {
    let { hash, id } = req.body
    const correctHash = hashIt({ userId: id })
    if (hash === correctHash) {
      const user = await User.create({ id: hashUserId(id) })
      const userResponse = user.toJSON()
      delete (userResponse as Record<string, unknown>).id
      res.json(userResponse)
    } else {
      res.status(400).end()
    }
  } catch (error) {
    res.status(400).json({ error })
  }
})

router.get('/:id', async (req, res) => {
  const user = await User.findByPk(hashUserId(req.params.id))
  if (user) {
    res.json(user)
  } else {
    res.status(404).end()
  }
})

export default router
