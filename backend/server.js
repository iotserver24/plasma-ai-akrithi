import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import express from 'express'
import cors from 'cors'
import { connectDB } from './db/mongo.js'
import authRoutes from './routes/auth.routes.js'
import githubRoutes from './routes/github.routes.js'
import executeRoutes from './routes/execute.routes.js'
import chatRoutes from './routes/chat.routes.js'
import executionRoutes from './routes/execution.routes.js'
import planRoutes from './routes/plan.routes.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
dotenv.config({ path: path.join(__dirname, '.env'), override: true })

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
app.use('/api/chat', chatRoutes)
app.use('/api/execution', executionRoutes)
app.use('/api/plan', planRoutes)

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' })
})

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Backend running on http://localhost:${PORT}`)
  })
})
