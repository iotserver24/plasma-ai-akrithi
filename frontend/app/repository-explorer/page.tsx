'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { api, getToken } from '@/lib/api'

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

interface RepoStats {
  open_issues: number
  approximate_files: number
  pull_requests_open: number
  contributors: {
    login: string
    contributions: number
    avatar_url: string
    html_url: string
  }[]
}

export default function RepositoryExplorerPage() {
  const router = useRouter()
  const [repos, setRepos] = useState<Repo[]>([])
  const [selectedRepo, setSelectedRepo] = useState<Repo | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [stats, setStats] = useState<RepoStats | null>(null)
  const [statsLoading, setStatsLoading] = useState(false)
  const [statsError, setStatsError] = useState('')
  const [statsRepoFullName, setStatsRepoFullName] = useState<string | null>(null)

  useEffect(() => {
    if (!getToken()) {
      router.replace('/login')
      return
    }
    void fetchRepos()
  }, [router])

  async function fetchRepos() {
    setLoading(true)
    setError('')
    try {
      const res = await api.get<Repo[]>('/github/repos', { params: { page: 1 } })
      const list = res.data
      setRepos(list)
      if (list.length) {
        const stored = typeof window !== 'undefined' ? localStorage.getItem('selectedRepo') : null
        if (stored) {
          try {
            const parsed: Repo = JSON.parse(stored)
            const match = list.find((r) => r.full_name === parsed.full_name) ?? list[0]
            setSelectedRepo(match)
            void fetchStats(match)
          } catch {
            setSelectedRepo(list[0])
            void fetchStats(list[0])
          }
        } else {
          setSelectedRepo(list[0])
          void fetchStats(list[0])
        }
      }
    } catch (e) {
      setError('Failed to load repositories. Check backend GitHub configuration.')
    } finally {
      setLoading(false)
    }
  }

  function handleSelect(repo: Repo) {
    setSelectedRepo(repo)
    void fetchStats(repo)
    if (typeof window !== 'undefined') {
      localStorage.setItem('selectedRepo', JSON.stringify(repo))
    }
  }

  function handleUseSelectedRepo() {
    if (!selectedRepo) return
    if (typeof window !== 'undefined') {
      localStorage.setItem('selectedRepo', JSON.stringify(selectedRepo))
    }
    router.push('/chat')
  }

  const filteredRepos = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return repos
    return repos.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.full_name.toLowerCase().includes(q) ||
        r.owner.toLowerCase().includes(q),
    )
  }, [repos, search])

  function formatUpdated(iso: string) {
    const date = new Date(iso)
    if (Number.isNaN(date.getTime())) return 'Recently'
    const diffMs = Date.now() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    if (diffDays <= 0) return 'Updated today'
    if (diffDays === 1) return 'Updated 1 day ago'
    if (diffDays < 7) return `Updated ${diffDays}d ago`
    const weeks = Math.floor(diffDays / 7)
    if (weeks === 1) return 'Updated 1 week ago'
    return `Updated ${weeks}w ago`
  }

  function privacyLabel(repo: Repo) {
    return repo.private ? 'Private' : 'Public'
  }

  async function fetchStats(repo: Repo) {
    // Avoid re-fetching stats if we already have them for this repo.
    if (stats && statsRepoFullName === repo.full_name && !statsError) {
      return
    }
    try {
      setStatsLoading(true)
      setStatsError('')
      const res = await api.get<RepoStats>(`/github/repo/${repo.owner}/${repo.name}/stats`)
      setStats(res.data)
      setStatsRepoFullName(repo.full_name)
    } catch (e) {
      setStatsError('Failed to load repository stats.')
      setStats(null)
      setStatsRepoFullName(null)
    } finally {
      setStatsLoading(false)
    }
  }

  const hasActiveStats =
    !!stats && !!selectedRepo && statsRepoFullName === selectedRepo.full_name && !statsError

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-fixai-bg">
      {/* Top Navigation Bar */}
      <nav
        className="h-14 border-b border-fixai-border bg-fixai-bg flex items-center justify-between px-4 z-50"
        data-purpose="top-navigation"
      >
        <div className="flex items-center gap-8">
          {/* Logo Section */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-fixai-cyan rounded flex items-center justify-center shadow-[0_0_10px_rgba(0,240,255,0.5)]">
              <span className="text-fixai-bg font-bold text-xl">PA</span>
            </div>
            <span className="text-xl font-semibold tracking-tight text-white font-mono">
              Plasma<span className="text-fixai-cyan">AI</span>
            </span>
          </div>
          {/* Search Input */}
          <div className="relative w-96">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg
                className="h-4 w-4 text-gray-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                />
              </svg>
            </div>
            <input
              className="block w-full pl-10 pr-3 py-1.5 bg-fixai-panel border border-fixai-border rounded-md text-sm text-gray-300 focus:ring-1 focus:ring-fixai-cyan focus:border-fixai-cyan transition-all outline-none"
              placeholder="Search repositories..."
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button className="p-2 text-gray-400 hover:text-fixai-cyan" type="button">
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
              />
            </svg>
          </button>
          <div className="flex items-center gap-2 pl-4 border-l border-fixai-border">
            <div className="text-right">
              <p className="text-xs font-medium text-white">dev_alex</p>
              <p className="text-[10px] text-fixai-cyan uppercase tracking-wider">Pro Tier</p>
            </div>
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-fixai-cyan to-blue-500 p-[1px]">
              <div className="w-full h-full rounded-full bg-fixai-bg flex items-center justify-center overflow-hidden">
                <span className="text-xs font-mono">AX</span>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <div className="flex flex-1 overflow-hidden">
        {/* Main Content Area (full-width list of repositories) */}
        <main
          className="flex-1 overflow-y-auto custom-scrollbar p-6"
          data-purpose="main-content"
        >
          <header className="mb-8">
            <h1 className="text-2xl font-bold text-white mb-2">Repository Explorer</h1>
            <p className="text-gray-400 text-sm">
              Select a repository to start debugging with AI assistance.
            </p>
          </header>

          {/* Repository Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {loading && (
              <div className="text-xs text-gray-500">Loading repositories from GitHub…</div>
            )}
            {error && !loading && (
              <div className="text-xs text-red-400 col-span-full">{error}</div>
            )}
            {!loading &&
              !error &&
              filteredRepos.map((repo) => (
                <div
                  key={repo.id}
                  className="glass-card p-5 rounded-lg flex flex-col justify-between h-56"
                >
                  <div>
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="font-mono text-lg text-white font-semibold truncate">
                        {repo.name}
                      </h3>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full uppercase tracking-widest ${
                          repo.private
                            ? 'border border-gray-600 text-gray-400'
                            : 'border border-fixai-cyan/30 text-fixai-cyan'
                        }`}
                      >
                        {privacyLabel(repo)}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-400 mb-2">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />{' '}
                        <span>{repo.owner}</span>
                      </span>
                      <span>{formatUpdated(repo.updated_at)}</span>
                    </div>
                    <p className="text-sm text-gray-500 line-clamp-2">
                      {repo.description || 'No description provided.'}
                    </p>
                  </div>
                  <button
                    className="w-full mt-4 py-2 bg-fixai-cyan/10 hover:bg-fixai-cyan/20 border border-fixai-cyan/30 text-fixai-cyan text-sm font-semibold rounded transition-colors"
                    type="button"
                    onClick={() => handleSelect(repo)}
                  >
                    Select Repository
                  </button>
                </div>
              ))}
          </div>
        </main>

        {/* Right Sidebar */}
        <aside
          className="w-80 bg-fixai-panel border-l border-fixai-border p-6 flex flex-col gap-8"
          data-purpose="right-sidebar"
        >
          <div>
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-6">
              Repository Stats
            </h2>
            <div className="space-y-6">
              <div className="flex flex-col gap-1" data-purpose="stat-item">
                <span className="text-xs text-gray-500">Selected Repository</span>
                <span className="text-sm font-mono text-fixai-cyan">
                  {selectedRepo ? selectedRepo.full_name : 'None selected'}
                </span>
              </div>
              {statsLoading && (
                <p className="text-[10px] text-gray-500">Loading repository stats…</p>
              )}
              {statsError && !statsLoading && (
                <p className="text-[10px] text-red-400">{statsError}</p>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-fixai-bg/50 p-3 rounded border border-fixai-border">
                  <p className="text-[10px] text-gray-500 uppercase">Active Issues</p>
                  <p className="text-xl font-mono text-white">
                    {hasActiveStats ? stats.open_issues : '--'}
                  </p>
                </div>
                <div className="bg-fixai-bg/50 p-3 rounded border border-fixai-border">
                  <p className="text-[10px] text-gray-500 uppercase">Contributors</p>
                  <p className="text-xl font-mono text-white">
                    {hasActiveStats ? stats.contributors.length : '--'}
                  </p>
                </div>
                <div className="bg-fixai-bg/50 p-3 rounded border border-fixai-border">
                  <p className="text-[10px] text-gray-500 uppercase">Files</p>
                  <p className="text-xl font-mono text-white">
                    {hasActiveStats ? stats.approximate_files : '--'}
                  </p>
                </div>
                <div className="bg-fixai-bg/50 p-3 rounded border border-fixai-border">
                  <p className="text-[10px] text-gray-500 uppercase">Pull Requests</p>
                  <p className="text-xl font-mono text-white">
                    {hasActiveStats ? stats.pull_requests_open : '--'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-fixai-border pt-6">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">
              Active Contributors
            </h2>
            <div className="space-y-3">
              {statsLoading && <p className="text-[10px] text-gray-500">Loading contributors…</p>}
              {!statsLoading && hasActiveStats && stats.contributors.length === 0 && (
                <p className="text-[10px] text-gray-500">No contributors found.</p>
              )}
              {!statsLoading &&
                hasActiveStats &&
                stats.contributors.map((c) => (
                  <div key={c.login} className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded bg-gray-700 flex items-center justify-center text-[10px] font-mono overflow-hidden">
                      <span>{c.login.slice(0, 2).toUpperCase()}</span>
                    </div>
                    <span className="text-sm text-gray-300">{c.login}</span>
                    <span className="ml-auto text-[10px] text-fixai-cyan">
                      {c.contributions} commits
                    </span>
                  </div>
                ))}
            </div>
          </div>

          {/* Select repo section at bottom of stats */}
          <div className="mt-auto space-y-4">
            <button
              type="button"
              onClick={handleUseSelectedRepo}
              disabled={!selectedRepo}
              className="w-full py-2 rounded-md border border-fixai-cyan/30 text-xs font-bold uppercase tracking-widest text-fixai-cyan disabled:opacity-40 disabled:cursor-not-allowed bg-fixai-cyan/5 hover:bg-fixai-cyan/10 transition-colors"
            >
              {selectedRepo ? 'Use this repository' : 'Select a repository first'}
            </button>

            <div className="bg-fixai-cyan/5 border border-fixai-cyan/20 p-4 rounded-lg">
              <h4 className="text-xs font-semibold text-fixai-cyan mb-2">AI Insights</h4>
              <p className="text-[11px] text-gray-400 leading-relaxed">
                Your most active repo{' '}
                <span className="text-white">
                  {selectedRepo ? selectedRepo.name : '—'}
                </span>{' '}
                has 4 critical performance bottlenecks detected in the last commit.
              </p>
              <button
                className="mt-3 text-[11px] font-bold text-fixai-cyan hover:underline uppercase tracking-tighter"
                type="button"
              >
                View Report
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}

