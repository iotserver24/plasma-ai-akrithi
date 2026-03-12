// Minimal Node.js authentication backend for demo purposes only.
// This server uses in-memory sessions (no database) and a single login route.

import express from 'express'
import session from 'express-session'
import cors from 'cors'
import dotenv from 'dotenv'
import loginRouter from './routes/login.js'

// Load environment variables from .env so we can read
// APP_USERNAME, APP_PASSWORD and SESSION_SECRET.
dotenv.config()

const app = express()
// For the hackathon demo we always listen on port 5000.
const PORT = 5000

// Parse incoming JSON request bodies (e.g. login credentials).
app.use(express.json())

// Allow the frontend at http://localhost:3000 to talk to this backend
// and include cookies (sessions) in cross-origin requests.
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true,
}))

// Configure session middleware using a secret from the environment.
// Sessions are stored in memory, which is fine for a demo but NOT for production.
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // secure should be true only when serving over HTTPS
    httpOnly: true,
    sameSite: 'lax',
  },
}))

// Mount the login router at /login so the full path is POST /login.
app.use('/login', loginRouter)

// Simple health check endpoint to quickly verify the server is up.
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' })
})

// Start the HTTP server.
app.listen(PORT, () => {
  console.log(`Auth demo server running on http://localhost:${PORT}`)
})
