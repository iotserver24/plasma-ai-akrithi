'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { api, getToken, clearToken, setGithubToken, getGithubToken } from '@/lib/api'
import RepoSelector from '@/components/RepoSelector'

interface Repo {
  id: number
  name: string
  full_name: string
  owner: string
  private: boolean
  description: string | null
  default_branch: string
  updated_at: string
}

export default function DashboardPage() {
  const router = useRouter()
  const [pat, setPat] = useState('')
  const [patSaved, setPatSaved] = useState(false)
  const [repos, setRepos] = useState<Repo[]>([])
  const [selectedRepo, setSelectedRepo] = useState<Repo | null>(null)
  const [loadingRepos, setLoadingRepos] = useState(false)
  const [error, setError] = useState('')
  const [githubUser, setGithubUser] = useState('')

  useEffect(() => {
    if (!getToken()) {
      router.replace('/login')
      return
    }
    const saved = getGithubToken()
    if (saved) {
      setPat(saved)
      setPatSaved(true)
      fetchRepos(saved)
    }
    const savedRepo = localStorage.getItem('selectedRepo')
    if (savedRepo) setSelectedRepo(JSON.parse(savedRepo))
  }, [router])

  async function fetchRepos(token: string) {
    setLoadingRepos(true)
    setError('')
    try {
      const [reposRes, userRes] = await Promise.all([
        api.get('/github/repos', { headers: { 'x-github-token': token } }),
        api.get('/github/user', { headers: { 'x-github-token': token } }),
      ])
      setRepos(reposRes.data)
      setGithubUser(userRes.data.login)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      setError(msg || 'Failed to fetch repositories. Check your PAT.')
    } finally {
      setLoadingRepos(false)
    }
  }

  function handleSavePAT() {
    if (!pat.trim()) return
    setGithubToken(pat.trim())
    setPatSaved(true)
    fetchRepos(pat.trim())
  }

  function handleSelectRepo(repo: Repo) {
    setSelectedRepo(repo)
    localStorage.setItem('selectedRepo', JSON.stringify(repo))
  }

  function handleContinue() {
    if (!selectedRepo) return
    router.push('/chat')
  }

  function handleLogout() {
    clearToken()
    router.replace('/login')
  }

  return (
    <main className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-[#1e2535] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#00e5a0] to-[#00b87a] flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0d0f14" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="16 18 22 12 16 6" />
              <polyline points="8 6 2 12 8 18" />
            </svg>
          </div>
          <span className="font-bold text-lg">Plasma AI</span>
        </div>
        <button
          onClick={handleLogout}
          className="text-sm text-gray-500 hover:text-gray-300 transition-colors"
        >
          Sign out
        </button>
      </header>

      <div className="flex-1 max-w-2xl mx-auto w-full px-4 py-10 flex flex-col gap-8">
        <div>
          <h1 className="text-2xl font-bold">Select a Repository</h1>
          <p className="text-gray-500 text-sm mt-1">Connect your GitHub account and choose a repo to modify.</p>
        </div>

        {/* GitHub PAT */}
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00e5a0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <h2 className="font-semibold">GitHub Personal Access Token</h2>
            {patSaved && githubUser && (
              <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-[#00e5a0]/15 text-[#00e5a0] border border-[#00e5a0]/30">
                @{githubUser}
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <input
              className="input-field"
              type="password"
              placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
              value={pat}
              onChange={(e) => { setPat(e.target.value); setPatSaved(false) }}
            />
            <button
              onClick={handleSavePAT}
              disabled={!pat.trim() || loadingRepos}
              className="btn-primary whitespace-nowrap"
            >
              {loadingRepos ? (
                <span className="w-4 h-4 border-2 border-[#0d0f14] border-t-transparent rounded-full animate-spin" />
              ) : patSaved ? 'Refresh' : 'Connect'}
            </button>
          </div>
          {error && (
            <p className="text-red-400 text-sm mt-2 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">{error}</p>
          )}
          <p className="text-xs text-gray-600 mt-2">
            Requires <code className="bg-gray-800 px-1 rounded">repo</code> scope. Token is stored locally and never sent to our servers except to proxy GitHub API calls.
          </p>
        </div>

        {/* Repo selector */}
        {patSaved && (
          <div className="card">
            <div className="flex items-center gap-2 mb-4">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00e5a0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
              </svg>
              <h2 className="font-semibold">Repositories</h2>
              <span className="text-xs text-gray-600 ml-1">({repos.length})</span>
            </div>
            <RepoSelector
              repos={repos}
              selected={selectedRepo}
              onSelect={handleSelectRepo}
              loading={loadingRepos}
            />
          </div>
        )}

        {/* Continue */}
        {selectedRepo && (
          <div className="flex items-center justify-between bg-[#00e5a0]/10 border border-[#00e5a0]/30 rounded-xl px-5 py-4">
            <div>
              <p className="font-medium text-[#00e5a0]">Ready</p>
              <p className="text-sm text-gray-400">
                {selectedRepo.full_name} · {selectedRepo.default_branch}
              </p>
            </div>
            <button onClick={handleContinue} className="btn-primary">
              Start Coding
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </main>
  )
}
