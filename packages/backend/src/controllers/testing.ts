import { Router } from 'express'
import { Review, User } from '../models'
import { Op } from 'sequelize'

const router = Router()

router.post('/reset', async (req, res) => {
  await Review.destroy({ where: { id: { [Op.ne]: null } } })
  await User.destroy({ where: { id: { [Op.ne]: null } } })

  res.status(204).end()
})

export default router
