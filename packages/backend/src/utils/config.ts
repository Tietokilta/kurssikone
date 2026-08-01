import dotenv from 'dotenv'
dotenv.config()

const PORT = process.env.PORT || 3001

const { POSTGRES_HOST, POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB, POSTGRES_PORT } = process.env
const POSTGRES_URL =
  POSTGRES_HOST && POSTGRES_USER && POSTGRES_DB
    ? `postgres://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${POSTGRES_HOST}:${POSTGRES_PORT}/${POSTGRES_DB}`
    : 'postgres://localhost:5432/kurssikone'

const SISU_COURSE_API_KEY = process.env.SISU_COURSE_API_KEY || ''
const ADMIN_SECRET = process.env.ADMIN_SECRET || ''
const JWT_SECRET = process.env.JWT_SECRET || ''

export { PORT, POSTGRES_URL, SISU_COURSE_API_KEY, ADMIN_SECRET, JWT_SECRET }
