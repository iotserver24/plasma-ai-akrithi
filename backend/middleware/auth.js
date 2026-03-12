import jwt from 'jsonwebtoken'

// JWT-based authentication middleware.
// Expects Authorization: Bearer <token> with the JWT issued by /api/auth/login.
export function auth(req, res, next) {
  const header = req.headers['authorization']

  if (!header || typeof header !== 'string' || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid token' })
  }

  const token = header.slice(7)

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET)
    req.user = payload
    next()
  } catch {
    return res.status(401).json({ error: 'Token expired or invalid' })
  }
}

