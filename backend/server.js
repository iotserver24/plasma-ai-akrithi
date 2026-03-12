import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { connectDB } from './db/mongo.js'
import authRoutes from './routes/auth.routes.js'
import githubRoutes from './routes/github.routes.js'
import executeRoutes from './routes/execute.routes.js'

const app = express()
const PORT = process.env.PORT ? Number(process.env.PORT) : 4000

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}))

app.use(express.json())

app.use('/api/auth', authRoutes)
app.use('/api/github', githubRoutes)
app.use('/api/execute', executeRoutes)

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' })
})

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Backend running on http://localhost:${PORT}`)
  })
})
