'use client'
import { useState, useEffect } from 'react'

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

interface Props {
  repos: Repo[]
  selected: Repo | null
  onSelect: (repo: Repo) => void
  loading: boolean
}

export default function RepoSelector({ repos, selected, onSelect, loading }: Props) {
  const [search, setSearch] = useState('')

  const filtered = repos.filter((r) =>
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    r.full_name.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-gray-500 py-4">
        <span className="w-4 h-4 border-2 border-[#00e5a0] border-t-transparent rounded-full animate-spin" />
        Loading repositories...
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <input
        className="input-field"
        type="text"
        placeholder="Search repositories..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <div className="max-h-72 overflow-y-auto flex flex-col gap-1.5 pr-1">
        {filtered.length === 0 && (
          <p className="text-gray-500 text-sm py-3 text-center">No repositories found.</p>
        )}
        {filtered.map((repo) => (
          <button
            key={repo.id}
            onClick={() => onSelect(repo)}
            className={`text-left px-4 py-3 rounded-lg border transition-all ${
              selected?.id === repo.id
                ? 'border-[#00e5a0] bg-[#00e5a0]/10 text-[#00e5a0]'
                : 'border-[#1e2535] bg-[#161a23] hover:border-[#00e5a0]/40 hover:bg-[#00e5a0]/5'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 opacity-60">
                  <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
                </svg>
                <span className="font-medium text-sm truncate">{repo.full_name}</span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {repo.private && (
                  <span className="text-xs px-1.5 py-0.5 rounded bg-gray-700/50 text-gray-400">private</span>
                )}
                <span className="text-xs text-gray-500">{repo.default_branch}</span>
              </div>
            </div>
            {repo.description && (
              <p className="text-xs text-gray-500 mt-1 truncate">{repo.description}</p>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
