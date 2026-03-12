// Simple session-based authentication middleware for demo purposes.
// It assumes that a successful login has stored a "user" property on req.session.

export function auth(req, res, next) {
  // If there is no session or no user on the session, the request is unauthorized.
  if (!req.session || !req.session.user) {
    return res.status(401).json({ message: 'Unauthorized' })
  }

  // At this point the user is considered authenticated; continue to the next handler.
  next()
}
