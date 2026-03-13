'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { api } from '../../lib/api'

interface Execution {
  _id: string
  chatId: string
  repo: string
  owner: string
  prompt: string
  status: 'running' | 'success' | 'failed'
  prUrl: string | null
  error: string | null
  warnings: string[]
  startedAt: string
  endedAt: string | null
}

interface LogEntry {
  _id: string
  executionId: string
  ts: string
  type: 'log' | 'warning' | 'error'
  message: string
  source: string | null
}

const POLL_MS = 2000

function formatTs(iso: string) {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

function elapsed(start: string, end: string | null) {
  const ms = new Date(end ?? Date.now()).getTime() - new Date(start).getTime()
  if (ms < 1000) return `${ms}ms`
  const s = Math.floor(ms / 1000)
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  return `${m}m ${s % 60}s`
}

export default function CodePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const executionId = searchParams.get('id')

  const [execution, setExecution] = useState<Execution | null>(null)
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [fetchError, setFetchError] = useState('')
  const logsEndRef = useRef<HTMLDivElement>(null)
  const pollingRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const logCountRef = useRef(0)

  // Scroll to bottom on new logs
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  async function fetchExecution() {
    if (!executionId) return null
    try {
      const res = await api.get(`/execution/${executionId}`)
      const exec = (res.data as { execution: Execution }).execution
      setExecution(exec)
      return exec
    } catch {
      setFetchError('Could not load execution.')
      return null
    }
  }

  async function fetchLogs() {
    if (!executionId) return
    try {
      const res = await api.get(`/execution/${executionId}/logs`, {
        params: { offset: logCountRef.current, limit: 200 },
      })
      const data = res.data as { logs: LogEntry[] }
      if (data.logs.length > 0) {
        setLogs((prev) => [...prev, ...data.logs])
        logCountRef.current += data.logs.length
      }
    } catch {
      // ignore poll errors
    }
  }

  useEffect(() => {
    if (!executionId) return

    // Initial load
    fetchExecution().then((exec) => {
      fetchLogs()

      if (exec && exec.status === 'running') {
        startPolling()
      }
    })

    return () => stopPolling()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [executionId])

  function startPolling() {
    stopPolling()
    pollingRef.current = setTimeout(poll, POLL_MS)
  }

  function stopPolling() {
    if (pollingRef.current) {
      clearTimeout(pollingRef.current)
      pollingRef.current = null
    }
  }

  async function poll() {
    const exec = await fetchExecution()
    await fetchLogs()

    if (exec && exec.status === 'running') {
      pollingRef.current = setTimeout(poll, POLL_MS)
    } else {
      stopPolling()
    }
  }

  if (!executionId) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--color-bg)', color: 'var(--color-text)' }}>
        <div className="text-center space-y-3">
          <p className="opacity-50">No execution ID provided.</p>
          <button onClick={() => router.push('/dashboard')} className="btn-primary text-sm">
            Go to Dashboard
          </button>
        </div>
      </div>
    )
  }

  const statusColor =
    execution?.status === 'success'
      ? 'var(--color-accent)'
      : execution?.status === 'failed'
        ? '#f87171'
        : '#facc15'

  const statusLabel =
    execution?.status === 'success'
      ? 'Success'
      : execution?.status === 'failed'
        ? 'Failed'
        : 'Running'

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--color-bg)', color: 'var(--color-text)' }}>
      {/* Header */}
      <header
        className="h-14 flex items-center px-6 gap-4 sticky top-0 z-50"
        style={{ background: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)' }}
      >
        <button
          onClick={() =>
            execution?.chatId
              ? router.push(`/chat?id=${execution.chatId}`)
              : router.push('/dashboard')
          }
          className="text-sm opacity-60 hover:opacity-100 transition-opacity"
        >
          ← Back
        </button>
        <span style={{ color: 'var(--color-border)' }}>|</span>
        {execution && (
          <span
            className="text-sm font-mono px-2 py-0.5 rounded"
            style={{ background: 'var(--color-bg)', color: 'var(--color-accent)' }}
          >
            {execution.owner}/{execution.repo}
          </span>
        )}
        <div className="ml-auto flex items-center gap-2">
          {execution && (
            <>
              <span
                className="w-2 h-2 rounded-full"
                style={{
                  background: statusColor,
                  boxShadow: `0 0 6px ${statusColor}`,
                  animation: execution.status === 'running' ? 'pulse 1.5s infinite' : undefined,
                }}
              />
              <span className="text-xs font-mono" style={{ color: statusColor }}>
                {statusLabel}
              </span>
              {execution.startedAt && (
                <span className="text-xs opacity-40 ml-2">
                  {elapsed(execution.startedAt, execution.endedAt)}
                </span>
              )}
            </>
          )}
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden" style={{ height: 'calc(100vh - 3.5rem)' }}>
        {/* Left: terminal logs */}
        <div className="flex flex-col flex-1 overflow-hidden">
          <div
            className="shrink-0 px-5 py-2 text-xs font-mono opacity-40 uppercase tracking-widest"
            style={{ borderBottom: '1px solid var(--color-border)' }}
          >
            Execution Logs
          </div>
          <div
            className="flex-1 overflow-y-auto p-4 terminal space-y-0.5"
            style={{ background: 'var(--color-bg)' }}
          >
            {fetchError && (
              <p style={{ color: '#f87171' }}>{fetchError}</p>
            )}
            {!fetchError && logs.length === 0 && (
              <p className="opacity-30 text-xs">Waiting for logs…</p>
            )}
            {logs.map((log, i) => (
              <div
                key={log._id || i}
                className="flex gap-3 text-xs font-mono leading-5"
                style={{
                  color:
                    log.type === 'error'
                      ? '#f87171'
                      : log.type === 'warning'
                        ? '#facc15'
                        : 'var(--color-text)',
                  opacity: log.type === 'log' ? 0.85 : 1,
                }}
              >
                <span className="shrink-0 opacity-30">{formatTs(log.ts)}</span>
                {log.source && (
                  <span className="shrink-0 opacity-40">[{log.source}]</span>
                )}
                <span className="break-all whitespace-pre-wrap">{log.message}</span>
              </div>
            ))}
            {execution?.status === 'running' && (
              <div className="flex items-center gap-2 text-xs opacity-40 pt-2">
                <span className="animate-spin w-3 h-3 border border-current border-t-transparent rounded-full inline-block" />
                Running…
              </div>
            )}
            <div ref={logsEndRef} />
          </div>
        </div>

        {/* Right: metadata + PR */}
        <div
          className="w-80 shrink-0 flex flex-col overflow-y-auto"
          style={{ borderLeft: '1px solid var(--color-border)', background: 'var(--color-surface)' }}
        >
          {/* PR card */}
          {execution?.prUrl && (
            <div
              className="m-4 p-4 rounded-xl space-y-3"
              style={{
                background: 'rgba(0,229,160,0.08)',
                border: '1px solid rgba(0,229,160,0.4)',
              }}
            >
              <div className="flex items-center gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M18 15l3-3-3-3M6 9l-3 3 3 3M14 4l-4 16" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--color-accent)' }}>
                  Pull Request
                </span>
              </div>
              <a
                href={execution.prUrl}
                target="_blank"
                rel="noreferrer"
                className="block text-sm break-all underline hover:opacity-80"
                style={{ color: 'var(--color-accent)' }}
              >
                {execution.prUrl}
              </a>
              <a
                href={execution.prUrl}
                target="_blank"
                rel="noreferrer"
                className="btn-primary text-xs w-full text-center block"
              >
                Open PR →
              </a>
            </div>
          )}

          {/* Execution metadata */}
          <div className="p-4 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-widest opacity-40">Execution</h3>

            {execution ? (
              <>
                <div className="space-y-3 text-sm">
                  <div>
                    <p className="text-[10px] uppercase opacity-40 mb-0.5">Repository</p>
                    <p className="font-mono text-xs" style={{ color: 'var(--color-accent)' }}>
                      {execution.owner}/{execution.repo}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase opacity-40 mb-0.5">Prompt</p>
                    <p className="text-xs opacity-80 leading-5 break-words">{execution.prompt}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase opacity-40 mb-0.5">Status</p>
                    <p className="text-xs font-mono" style={{ color: statusColor }}>
                      {statusLabel}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase opacity-40 mb-0.5">Started</p>
                    <p className="text-xs opacity-60 font-mono">{new Date(execution.startedAt).toLocaleString()}</p>
                  </div>
                  {execution.endedAt && (
                    <div>
                      <p className="text-[10px] uppercase opacity-40 mb-0.5">Ended</p>
                      <p className="text-xs opacity-60 font-mono">{new Date(execution.endedAt).toLocaleString()}</p>
                    </div>
                  )}
                  {execution.startedAt && (
                    <div>
                      <p className="text-[10px] uppercase opacity-40 mb-0.5">Duration</p>
                      <p className="text-xs opacity-60 font-mono">{elapsed(execution.startedAt, execution.endedAt)}</p>
                    </div>
                  )}
                  {execution.error && (
                    <div>
                      <p className="text-[10px] uppercase mb-0.5" style={{ color: '#f87171' }}>Error</p>
                      <p className="text-xs break-words" style={{ color: '#f87171' }}>{execution.error}</p>
                    </div>
                  )}
                  {execution.warnings.length > 0 && (
                    <div>
                      <p className="text-[10px] uppercase opacity-40 mb-0.5">Warnings</p>
                      <ul className="space-y-1">
                        {execution.warnings.map((w, i) => (
                          <li key={i} className="text-xs" style={{ color: '#facc15' }}>{w}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="pt-2 space-y-2">
                  <button
                    onClick={() =>
                      execution.chatId
                        ? router.push(`/chat?id=${execution.chatId}`)
                        : router.push('/chat')
                    }
                    className="w-full text-xs py-2 rounded-lg transition-opacity hover:opacity-80"
                    style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}
                  >
                    ← Back to plan
                  </button>
                </div>
              </>
            ) : (
              <div className="space-y-2">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="h-4 rounded animate-pulse"
                    style={{ background: 'var(--color-border)', width: `${60 + i * 10}%` }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
