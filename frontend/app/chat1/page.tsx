'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { getToken } from '@/lib/api'
import PromptInput from '@/components/PromptInput'
import LogsPanel from '@/components/LogsPanel'
import ExecutionStatus from '@/components/ExecutionStatus'

type Stage = 'idle' | 'sandbox' | 'clone' | 'agent' | 'commit' | 'pr' | 'done' | 'error'

interface LogLine {
  type: 'log' | 'error' | 'warning'
  text: string
  ts: number
}

interface Repo {
  name: string
  full_name: string
  owner: string
  default_branch: string
}

interface PRInfo {
  url: string
  number: number
  title: string
}

function inferStage(log: string): Stage | null {
  if (/creating sandbox/i.test(log)) return 'sandbox'
  if (/cloning/i.test(log)) return 'clone'
  if (/running claude/i.test(log) || /\[claude\]/i.test(log) || /\[system\]/i.test(log)) return 'agent'
  if (/committing|pushing branch/i.test(log)) return 'commit'
  if (/creating pull request/i.test(log)) return 'pr'
  return null
}

export default function ChatPage() {
  const router = useRouter()
  const [repo, setRepo] = useState<Repo | null>(null)
  const [prompt, setPrompt] = useState('')
  const [running, setRunning] = useState(false)
  const [logs, setLogs] = useState<LogLine[]>([])
  const [stage, setStage] = useState<Stage>('idle')
  const [pr, setPr] = useState<PRInfo | null>(null)
  const [execError, setExecError] = useState('')

  useEffect(() => {
    if (!getToken()) { router.replace('/login'); return }
    const saved = localStorage.getItem('selectedRepo')
    if (!saved) { router.replace('/dashboard'); return }
    setRepo(JSON.parse(saved))
  }, [router])

  const addLog = useCallback((text: string, type: LogLine['type'] = 'log') => {
    setLogs((prev) => [...prev, { type, text, ts: Date.now() }])
    const inferred = inferStage(text)
    if (inferred) setStage(inferred)
  }, [])

  async function handleExecute() {
    if (!repo || !prompt.trim()) return
    const token = getToken()
    if (!token) { router.replace('/login'); return }

    setRunning(true)
    setLogs([])
    setStage('sandbox')
    setPr(null)
    setExecError('')

    try {
      const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api'
      const response = await fetch(`${BASE_URL}/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          prompt: prompt.trim(),
          repo: repo.name,
          owner: repo.owner,
          defaultBranch: repo.default_branch,
        }),
      })

      if (!response.ok || !response.body) {
        const err = await response.text()
        throw new Error(err || 'Execution request failed')
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const parts = buffer.split('\n\n')
        buffer = parts.pop() ?? ''
        for (const part of parts) {
          const dataLine = part.trim()
          if (!dataLine.startsWith('data:')) continue
          try {
            const event = JSON.parse(dataLine.slice(5).trim())
            if (event.type === 'log') addLog(event.data)
            else if (event.type === 'warning') addLog(event.data, 'warning')
            else if (event.type === 'error') { addLog(event.data, 'error'); setExecError(event.data) }
            else if (event.type === 'pr') {
              setPr(event.data)
              setStage('done')
              addLog(`Pull Request #${event.data.number} created!`)
            }
            else if (event.type === 'done') {
              if (!execError) setStage('done')
            }
          } catch { /* ignore malformed lines */ }
        }
      }
    } catch (err: unknown) {
      const msg = (err as Error).message || 'An unexpected error occurred'
      addLog(msg, 'error')
      setExecError(msg)
      setStage('error')
    } finally {
      setRunning(false)
    }
  }

  if (!repo) return null

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
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/dashboard')}
            className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-200 transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
            </svg>
            {repo.full_name}
          </button>
        </div>
      </header>

      <div className="flex-1 max-w-3xl mx-auto w-full px-4 py-8 flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold">AI Coding Agent</h1>
          <p className="text-gray-500 text-sm mt-1">
            Describe a change and the agent will modify <span className="text-gray-300">{repo.full_name}</span> and create a Pull Request.
          </p>
        </div>

        {/* Execution status steps */}
        {stage !== 'idle' && (
          <div className="card overflow-x-auto">
            <ExecutionStatus stage={stage} />
          </div>
        )}

        {/* PR success banner */}
        {pr && (
          <a
            href={pr.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-4 px-5 py-4 rounded-xl border border-[#00e5a0]/40 bg-[#00e5a0]/10 hover:bg-[#00e5a0]/15 transition-colors group"
          >
            <div className="w-10 h-10 rounded-full bg-[#00e5a0] flex items-center justify-center shrink-0">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0d0f14" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="18" cy="18" r="3" />
                <circle cx="6" cy="6" r="3" />
                <path d="M13 6h3a2 2 0 0 1 2 2v7" />
                <line x1="6" y1="9" x2="6" y2="21" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-[#00e5a0]">Pull Request #{pr.number} Created!</p>
              <p className="text-sm text-gray-400 truncate">{pr.title}</p>
              <p className="text-xs text-gray-600 truncate">{pr.url}</p>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00e5a0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-auto shrink-0 opacity-60 group-hover:opacity-100">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
          </a>
        )}

        {/* Error banner */}
        {execError && !pr && (
          <div className="px-4 py-3 rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 text-sm">
            <strong>Error:</strong> {execError}
          </div>
        )}

        {/* Logs */}
        {logs.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-semibold text-gray-400">Execution Logs</h2>
              <span className="text-xs text-gray-600">{logs.length} lines</span>
            </div>
            <LogsPanel lines={logs} />
          </div>
        )}

        {/* Prompt input */}
        <div className="card">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00e5a0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            Your Prompt
          </h2>
          <PromptInput
            value={prompt}
            onChange={setPrompt}
            onSubmit={handleExecute}
            disabled={running}
          />
        </div>
      </div>
    </main>
  )
}
