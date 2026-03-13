'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { api, getToken } from '@/lib/api'

interface ChatItem {
  _id: string
  repo: string
  owner: string
  prompt: string
  status: string
  plan?: string
  prUrl?: string | null
  createdAt: string
}

interface ExecutionItem {
  _id: string
  chatId: string
  repo: string
  owner: string
  prompt: string
  status: string
  prUrl?: string | null
  startedAt: string
  endedAt?: string | null
}

export default function HistoryPage() {
  const router = useRouter()
  const [chats, setChats] = useState<ChatItem[]>([])
  const [executions, setExecutions] = useState<ExecutionItem[]>([])
  const [loadingChats, setLoadingChats] = useState(true)
  const [loadingExecutions, setLoadingExecutions] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!getToken()) {
      router.replace('/login')
      return
    }

    async function load() {
      setError('')
      try {
        const [chatsRes, execRes] = await Promise.all([
          api.get<ChatItem[]>('/execute/history'),
          api.get<{ executions: ExecutionItem[] }>('/execution/list'),
        ])
        setChats(Array.isArray(chatsRes.data) ? chatsRes.data : [])
        setExecutions(execRes.data?.executions ?? [])
      } catch (e) {
        setError('Failed to load history.')
      } finally {
        setLoadingChats(false)
        setLoadingExecutions(false)
      }
    }

    void load()
  }, [router])

  function formatDate(iso: string) {
    const d = new Date(iso)
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  function statusColor(s: string) {
    if (s === 'success') return 'text-emerald-400'
    if (s === 'failed') return 'text-red-400'
    if (s === 'running') return 'text-amber-400'
    return 'text-gray-400'
  }

  return (
    <div className="min-h-screen flex flex-col bg-fixai-bg text-white">
      {/* Nav */}
      <nav className="border-b border-fixai-border bg-fixai-bg flex items-center justify-between px-4 py-2 flex-wrap gap-3">
        <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
          <button
            type="button"
            onClick={() => router.push('/repository-explorer')}
            className="flex items-center gap-2 text-gray-400 hover:text-fixai-cyan transition-colors text-sm"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-fixai-cyan rounded flex items-center justify-center shadow-[0_0_10px_rgba(0,240,255,0.5)]">
              <span className="text-fixai-bg font-bold text-xl">PA</span>
            </div>
            <span className="text-xl font-semibold tracking-tight font-mono">
              Plasma<span className="text-fixai-cyan">AI</span>
            </span>
          </div>
        </div>
      </nav>

      <main className="flex-1 overflow-hidden flex flex-col p-4 sm:p-6">
        <div className="shrink-0 mb-4">
          <h1 className="text-xl sm:text-2xl font-bold mb-1">History</h1>
          <p className="text-gray-400 text-sm">Chat and execution history.</p>
        </div>

        {error && (
          <p className="text-red-400 text-sm mb-4 shrink-0">{error}</p>
        )}

        <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 1) Chat history */}
          <section className="flex flex-col min-h-0 border border-fixai-border rounded-lg bg-fixai-panel overflow-hidden">
            <h2 className="shrink-0 text-lg font-semibold text-fixai-cyan px-4 py-3 flex items-center gap-2 border-b border-fixai-border">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              Chat history
            </h2>
            <div className="flex-1 overflow-y-auto p-3">
              {loadingChats ? (
                <p className="text-gray-500 text-sm">Loading…</p>
              ) : chats.length === 0 ? (
                <p className="text-gray-500 text-sm">No chats yet.</p>
              ) : (
                <ul className="space-y-2">
                  {chats.map((chat) => (
                    <li key={chat._id}>
                      <button
                        type="button"
                        onClick={() => router.push(`/chat?id=${chat._id}`)}
                        className="w-full text-left rounded-lg border border-fixai-border bg-fixai-bg p-3 hover:border-fixai-cyan/50 hover:bg-fixai-bg/80 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="font-mono text-sm text-fixai-cyan truncate">
                              {chat.owner}/{chat.repo}
                            </p>
                            <p className="text-sm text-gray-300 mt-0.5 line-clamp-2">{chat.prompt}</p>
                            <p className="text-xs text-gray-500 mt-1">{formatDate(chat.createdAt)}</p>
                          </div>
                          <span className={`text-xs font-medium shrink-0 capitalize ${statusColor(chat.status)}`}>
                            {chat.status}
                          </span>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          {/* 2) Work history (executions) */}
          <section className="flex flex-col min-h-0 border border-fixai-border rounded-lg bg-fixai-panel overflow-hidden">
            <h2 className="shrink-0 text-lg font-semibold text-fixai-cyan px-4 py-3 flex items-center gap-2 border-b border-fixai-border">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
              Work history (executions)
            </h2>
            <div className="flex-1 overflow-y-auto p-3">
              {loadingExecutions ? (
                <p className="text-gray-500 text-sm">Loading…</p>
              ) : executions.length === 0 ? (
                <p className="text-gray-500 text-sm">No executions yet.</p>
              ) : (
                <ul className="space-y-2">
                  {executions.map((exec) => (
                    <li key={exec._id}>
                      <button
                        type="button"
                        onClick={() => router.push(`/code?id=${exec._id}`)}
                        className="w-full text-left rounded-lg border border-fixai-border bg-fixai-bg p-3 hover:border-fixai-cyan/50 hover:bg-fixai-bg/80 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="font-mono text-sm text-fixai-cyan truncate">
                              {exec.owner}/{exec.repo}
                            </p>
                            <p className="text-sm text-gray-300 mt-0.5 line-clamp-2">{exec.prompt}</p>
                            <p className="text-xs text-gray-500 mt-1">{formatDate(exec.startedAt)}</p>
                            {exec.prUrl && (
                              <p className="text-xs text-emerald-400 mt-1 truncate">PR: {exec.prUrl}</p>
                            )}
                          </div>
                          <span className={`text-xs font-medium shrink-0 capitalize ${statusColor(exec.status)}`}>
                            {exec.status}
                          </span>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}
