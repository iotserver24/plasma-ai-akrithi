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

router.get('/repo/:owner/:repo/stats', auth, async (req, res) => {
  const githubToken = getGithubToken()
  if (!githubToken) {
    return res.status(500).json({ error: 'GitHub token is not configured on the server' })
  }

  const { owner, repo } = req.params

  try {
    const headers = {
      Authorization: `token ${githubToken}`,
      Accept: 'application/vnd.github.v3+json',
    }

    // Basic repo details
    const repoRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers })
    if (!repoRes.ok) {
      const err = await repoRes.json()
      return res.status(repoRes.status).json({ error: err.message || 'GitHub repo fetch failed' })
    }
    const repoData = await repoRes.json()

    // Top contributors (limited to keep it light)
    const contribRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contributors?per_page=5&anon=false`,
      { headers }
    )
    const contribData = contribRes.ok ? await contribRes.json() : []

    // Open pull requests count via search API
    const prSearchRes = await fetch(
      `https://api.github.com/search/issues?q=repo:${owner}/${repo}+type:pr+state:open`,
      { headers }
    )
    const prSearchData = prSearchRes.ok ? await prSearchRes.json() : { total_count: 0 }

    const response = {
      name: repoData.name,
      full_name: repoData.full_name,
      open_issues: repoData.open_issues_count,
      default_branch: repoData.default_branch,
      // GitHub's size field is in KB and roughly correlates to repository size on disk;
      // we surface it here as a simple "files/size" indicator for the UI.
      approximate_files: repoData.size,
      pull_requests_open: prSearchData.total_count || 0,
      contributors: Array.isArray(contribData)
        ? contribData.map((c) => ({
            login: c.login,
            contributions: c.contributions,
            avatar_url: c.avatar_url,
            html_url: c.html_url,
          }))
        : [],
    }

    res.json(response)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
