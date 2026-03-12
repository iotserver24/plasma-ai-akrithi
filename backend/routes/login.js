// Login route for the demo authentication backend.
// Valid credentials are read from environment variables and no database is used.

import express from 'express'

const router = express.Router()

// POST /login
// Expects a JSON body: { "username": "...", "password": "..." }
// If the credentials match APP_USERNAME and APP_PASSWORD, a session is created.
router.post('/', (req, res) => {
  const { username, password } = req.body

  const expectedUsername = process.env.APP_USERNAME
  const expectedPassword = process.env.APP_PASSWORD

  // Compare provided credentials with the expected demo credentials from .env.
  if (username === expectedUsername && password === expectedPassword) {
    // Store the username in the session so we can check it later in middleware.
    req.session.user = username
    return res.json({ success: true })
  }

  // For any mismatch, return a 401 Unauthorized with a clear error message.
  return res.status(401).json({
    success: false,
    message: 'Invalid credentials',
  })
})

export default router

