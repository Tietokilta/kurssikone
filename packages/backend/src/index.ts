import express from 'express'
import cors from 'cors'
import { connectToDatabase } from './utils/db'
import reviewRouter from './controllers/reviews'
import userRouter from './controllers/users'
import testRouter from './controllers/testing'
import bodyParser from 'body-parser'
import { PORT } from './utils/config'
import morganBody from 'morgan-body'

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
if (process.env.ALLOW_RESET === 'true') {
  app.use('/api/testing', testRouter)
}

const start = async () => {
  await connectToDatabase()
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`)
  })
  console.log(process.env.ALLOW_RESET)
}

start()
