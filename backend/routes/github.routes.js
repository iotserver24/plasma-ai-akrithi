import { Router } from 'express'
import { auth } from '../middleware/auth.js'

const router = Router()

function getGithubToken() {
  return process.env.GITHUB_TOKEN
}

router.get('/repos', auth, async (req, res) => {
  const githubToken = getGithubToken()
  if (!githubToken) {
    return res.status(500).json({ error: 'GitHub token is not configured on the server' })
  }

  const pageRaw =
    typeof req.query.page === 'string'
      ? req.query.page
      : Array.isArray(req.query.page)
      ? req.query.page[0]
      : undefined
  const page = Number.parseInt(pageRaw || '1', 10) || 1
  const perPage = 100

  try {
    const response = await fetch(
      `https://api.github.com/user/repos?per_page=${perPage}&page=${page}&sort=updated`,
      {
      headers: {
        Authorization: `token ${githubToken}`,
        Accept: 'application/vnd.github.v3+json',
      },
      }
    )

    if (!response.ok) {
      const err = await response.json()
      return res.status(response.status).json({ error: err.message || 'GitHub API error' })
    }

    const repos = await response.json()
    const simplified = repos.map((r) => ({
      id: r.id,
      name: r.name,
      full_name: r.full_name,
      owner: r.owner.login,
      private: r.private,
      description: r.description,
      default_branch: r.default_branch,
      updated_at: r.updated_at,
    }))

    res.json(simplified)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.get('/user', auth, async (_req, res) => {
  const githubToken = getGithubToken()
  if (!githubToken) {
    return res.status(500).json({ error: 'GitHub token is not configured on the server' })
  }

  try {
    const response = await fetch('https://api.github.com/user', {
      headers: { Authorization: `token ${githubToken}` },
    })
    const user = await response.json()
    res.json({ login: user.login, avatar_url: user.avatar_url, name: user.name })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
