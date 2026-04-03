import express from 'express'
import cors from 'cors'
import cron from 'node-cron'
import { connectToDatabase } from './utils/db'
import reviewRouter from './controllers/reviews'
import userRouter from './controllers/users'
import testRouter from './controllers/testing'
import courseRouter from './controllers/courses'
import bodyParser from 'body-parser'
import { PORT } from './utils/config'
import morganBody from 'morgan-body'
import { runFullSync } from './services/sisuSync'

const app = express()

app.use(cors())
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: false }))

morganBody(app, {
  logIP: false,
  logReqUserAgent: false,
  dateTimeFormat: 'clf',
})

app.use('/api/reviews', reviewRouter)
app.use('/api/users', userRouter)
app.use('/api/courses', courseRouter)
if (process.env.ALLOW_RESET === 'true') {
  app.use('/api/testing', testRouter)
}

const start = async () => {
  await connectToDatabase()

  cron.schedule('0 3 * * *', async () => {
    console.log('Running scheduled Sisu course sync...')
    try {
      await runFullSync()
    } catch (error) {
      console.error('Scheduled sync failed:', error)
    }
  })
  console.log('Scheduled daily course sync at 3:00 AM')

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`)
  })
  console.log(process.env.ALLOW_RESET)
}

start()
