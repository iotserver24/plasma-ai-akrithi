'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { api, getToken, clearToken } from '@/lib/api'
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
  const [repos, setRepos] = useState<Repo[]>([])
  const [selectedRepo, setSelectedRepo] = useState<Repo | null>(null)
  const [loadingRepos, setLoadingRepos] = useState(false)
  const [error, setError] = useState('')
  const [githubUser, setGithubUser] = useState('')
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)

  useEffect(() => {
    if (!getToken()) {
      router.replace('/login')
      return
    }
    const savedRepo = localStorage.getItem('selectedRepo')
    if (savedRepo) setSelectedRepo(JSON.parse(savedRepo))
    fetchRepos(1, false)
  }, [router])

  async function fetchRepos(nextPage: number, append: boolean) {
    setLoadingRepos(true)
    setError('')
    try {
      const [reposRes, userRes] = await Promise.all([
        api.get('/github/repos', { params: { page: nextPage } }),
        api.get('/github/user'),
      ])
      const newRepos: Repo[] = reposRes.data
      setRepos((prev) => (append ? [...prev, ...newRepos] : newRepos))
      setPage(nextPage)
      setHasMore(newRepos.length === 100)
      setGithubUser(userRes.data.login)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      setError(msg || 'Failed to fetch repositories. Check server GitHub token configuration.')
    } finally {
      setLoadingRepos(false)
    }
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
        <div className="flex items-center gap-3">
          {githubUser && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-[#00e5a0]/15 text-[#00e5a0] border border-[#00e5a0]/30">
              @{githubUser}
            </span>
          )}
          <button
            onClick={handleLogout}
            className="text-sm text-gray-500 hover:text-gray-300 transition-colors"
          >
            Sign out
          </button>
        </div>
      </header>

      <div className="flex-1 max-w-2xl mx-auto w-full px-4 py-10 flex flex-col gap-8">
        <div>
          <h1 className="text-2xl font-bold">Select a Repository</h1>
          <p className="text-gray-500 text-sm mt-1">Choose a GitHub repository to modify with the AI agent.</p>
        </div>

        {/* Repo selector */}
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
          {hasMore && (
            <button
              type="button"
              onClick={() => fetchRepos(page + 1, true)}
              disabled={loadingRepos}
              className="mt-3 text-xs text-[#00e5a0] hover:text-[#00ffb5] disabled:opacity-40"
            >
              {loadingRepos ? 'Loading more…' : 'Load more repositories'}
            </button>
          )}
          {error && (
            <p className="text-red-400 text-sm mt-2 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
        </div>

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

