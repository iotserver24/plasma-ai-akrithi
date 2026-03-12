import { Router } from 'express'
import jwt from 'jsonwebtoken'

const router = Router()

router.post('/login', (req, res) => {
  const { username, password } = req.body

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' })
  }

  const validUser = username === process.env.APP_USERNAME
  const validPass = password === process.env.APP_PASSWORD

  if (!validUser || !validPass) {
    return res.status(401).json({ error: 'Invalid credentials' })
  }

  const token = jwt.sign(
    { userId: username, username },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  )

  res.json({ token, username })
})

export default router
