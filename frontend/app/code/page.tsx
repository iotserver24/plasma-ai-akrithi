'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import AnsiToHtml from 'ansi-to-html'
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

// Group of consecutive log lines that share the same source prefix (e.g. [XibeCode])
interface LogGroup {
  id: string        // first log _id in group
  ts: string        // timestamp of first line
  source: string | null
  type: 'log' | 'warning' | 'error'
  lines: LogEntry[]
}

const POLL_MS = 2000

const converter = new AnsiToHtml({
  fg: '#e2e8f0',
  bg: '#0d0f14',
  newline: false,
  escapeXML: true,
  stream: false,
})

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

/** Strip ANSI but convert via ansi-to-html — returns safe HTML string */
function renderAnsi(raw: string): string {
  try {
    return converter.toHtml(raw)
  } catch {
    return raw.replace(/\x1b\[[0-9;]*m/g, '')
  }
}

type Highlight =
  | 'pr'          // PR URL line
  | 'success'     // task complete / PR created
  | 'tool'        // tool call line (write_file, read_file …)
  | 'branch'      // creating branch
  | 'ai'          // AI is thinking…
  | 'agent'       // agent start / infra
  | 'warning'
  | 'error'
  | 'dim'         // banner / logo lines (pure ANSI art)
  | null

/** Classify a single stripped log message for visual highlighting */
function classifyLine(raw: string): Highlight {
  const t = raw.replace(/\x1b\[[0-9;]*m/g, '').trim()
  if (!t) return null
  if (/PR URL:/i.test(t) || /pull request created/i.test(t)) return 'pr'
  if (/pull\/\d+/.test(t) && /github\.com/i.test(t)) return 'pr'
  if (/task complete/i.test(t) || /✅/.test(t) || /✔\s*task/i.test(t)) return 'success'
  if (/╭─.*write_file|╰─.*write_file|lines written/i.test(t)) return 'tool'
  if (/╭─.*read_file|╰─.*read_file|lines\s+\d/i.test(t)) return 'tool'
  if (/creating branch:/i.test(t) || /PR title:/i.test(t)) return 'branch'
  if (/AI is thinking/i.test(t)) return 'ai'
  if (/starting agent/i.test(t) || /creating sandbox/i.test(t) || /closing sandbox/i.test(t)) return 'agent'
  if (/warning/i.test(t)) return 'warning'
  if (/error/i.test(t) && !/color/i.test(t)) return 'error'
  // Pure ANSI art lines (logo) — lots of box-drawing chars, no real text
  if (/^[█╗╔╝╚═║╠╣╦╩╬─│╭╮╰╯▄▀\s]+$/.test(t)) return 'dim'
  return null
}

interface HighlightStyle {
  bg?: string
  border?: string
  color?: string
  icon?: string
  bold?: boolean
}

const HIGHLIGHT_STYLES: Record<NonNullable<Highlight>, HighlightStyle> = {
  pr: {
    bg: 'rgba(0,229,160,0.1)',
    border: 'rgba(0,229,160,0.5)',
    color: '#6ee7b7',
    icon: '🔗',
    bold: true,
  },
  success: {
    bg: 'rgba(0,229,160,0.08)',
    border: 'rgba(0,229,160,0.35)',
    color: 'var(--color-accent)',
    icon: '✅',
    bold: true,
  },
  tool: {
    bg: 'rgba(99,102,241,0.08)',
    border: 'rgba(99,102,241,0.3)',
    color: '#a5b4fc',
    icon: '⚙',
  },
  branch: {
    bg: 'rgba(251,191,36,0.07)',
    border: 'rgba(251,191,36,0.3)',
    color: '#fde68a',
    icon: '⎇',
  },
  ai: {
    bg: 'rgba(148,163,184,0.05)',
    border: 'rgba(148,163,184,0.2)',
    color: '#94a3b8',
    icon: '✦',
  },
  agent: {
    bg: 'transparent',
    border: 'rgba(148,163,184,0.15)',
    color: '#64748b',
    icon: '◉',
  },
  warning: {
    bg: 'rgba(250,204,21,0.07)',
    border: 'rgba(250,204,21,0.3)',
    color: '#fde68a',
    icon: '⚠',
  },
  error: {
    bg: 'rgba(248,113,113,0.07)',
    border: 'rgba(248,113,113,0.3)',
    color: '#f87171',
    icon: '✗',
  },
  dim: {
    bg: 'transparent',
    border: 'transparent',
    color: undefined,
  },
}

/** Group consecutive log lines from the same source into visual blocks */
function groupLogs(logs: LogEntry[]): LogGroup[] {
  const groups: LogGroup[] = []
  for (const log of logs) {
    const prev = groups[groups.length - 1]
    if (prev && prev.source === log.source && prev.type === log.type) {
      prev.lines.push(log)
    } else {
      groups.push({
        id: log._id,
        ts: log.ts,
        source: log.source,
        type: log.type,
        lines: [log],
      })
    }
  }
  return groups
}

/** Pick a subtle left-border color per source */
function sourceBorderColor(source: string | null, type: 'log' | 'warning' | 'error') {
  if (type === 'error') return '#f87171'
  if (type === 'warning') return '#facc15'
  if (!source) return 'transparent'
  if (source === 'sandbox') return 'rgba(0,229,160,0.3)'
  if (source === 'server') return 'rgba(148,163,184,0.3)'
  return 'rgba(99,102,241,0.35)'   // XibeCode / other
}

function sourceLabel(source: string | null) {
  if (!source) return null
  if (source === 'sandbox') return 'sandbox'
  if (source === 'server') return 'server'
  return source
}

function CodePageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const executionId = searchParams.get('id')

  const [execution, setExecution] = useState<Execution | null>(null)
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [fetchError, setFetchError] = useState('')
  const [autoScroll, setAutoScroll] = useState(true)

  const seenIdsRef = useRef(new Set<string>())
  const logOffsetRef = useRef(0)
  const pollingRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const logsScrollRef = useRef<HTMLDivElement>(null)

  // Auto-scroll
  useEffect(() => {
    if (!autoScroll) return
    const el = logsScrollRef.current
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
  }, [logs, autoScroll])

  function handleLogsScroll(e: React.UIEvent<HTMLDivElement>) {
    const el = e.currentTarget
    setAutoScroll(el.scrollHeight - el.scrollTop - el.clientHeight < 80)
  }

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
        params: { offset: logOffsetRef.current, limit: 200 },
      })
      const data = res.data as { logs: LogEntry[] }
      const fresh = data.logs.filter((l) => !seenIdsRef.current.has(l._id))
      fresh.forEach((l) => seenIdsRef.current.add(l._id))
      if (fresh.length > 0) {
        setLogs((prev) => [...prev, ...fresh])
        logOffsetRef.current += fresh.length
      }
    } catch {}
  }

  useEffect(() => {
    if (!executionId) return
    fetchExecution().then((exec) => {
      fetchLogs()
      if (exec && exec.status === 'running') startPolling()
    })
    return () => stopPolling()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [executionId])

  function startPolling() {
    stopPolling()
    pollingRef.current = setTimeout(poll, POLL_MS)
  }
  function stopPolling() {
    if (pollingRef.current) { clearTimeout(pollingRef.current); pollingRef.current = null }
  }
  async function poll() {
    const exec = await fetchExecution()
    await fetchLogs()
    if (exec && exec.status === 'running') pollingRef.current = setTimeout(poll, POLL_MS)
    else stopPolling()
  }

  if (!executionId) {
    return (
      <div className="min-h-screen flex items-center justify-center"
        style={{ background: 'var(--color-bg)', color: 'var(--color-text)' }}>
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
    execution?.status === 'success' ? 'var(--color-accent)'
    : execution?.status === 'failed' ? '#f87171'
    : '#facc15'
  const statusLabel =
    execution?.status === 'success' ? 'Success'
    : execution?.status === 'failed' ? 'Failed'
    : 'Running'

  const groups = groupLogs(logs)

  return (
    <div className="flex flex-col"
      style={{ height: '100vh', background: 'var(--color-bg)', color: 'var(--color-text)', overflow: 'hidden' }}>

      {/* ── Header ── */}
      <header className="shrink-0 flex items-center px-4 sm:px-6 gap-3 sm:gap-4 py-3 sm:py-0"
        style={{ background: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)' }}>
        <button
          onClick={() => execution?.chatId ? router.push(`/chat?id=${execution.chatId}`) : router.push('/dashboard')}
          className="text-xs sm:text-sm opacity-60 hover:opacity-100 transition-opacity shrink-0">
          ← Back
        </button>
        <span style={{ color: 'var(--color-border)' }} className="hidden sm:inline">|</span>
        {execution && (
          <span className="text-xs sm:text-sm font-mono px-2 py-0.5 rounded truncate"
            style={{ background: 'var(--color-bg)', color: 'var(--color-accent)' }}>
            {execution.owner}/{execution.repo}
          </span>
        )}
        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          {execution && (
            <>
              <span className="w-2 h-2 rounded-full" style={{ background: statusColor, boxShadow: `0 0 6px ${statusColor}` }} />
              <span className="text-[10px] sm:text-xs font-mono font-bold" style={{ color: statusColor }}>{statusLabel}</span>
              {execution.startedAt && (
                <span className="text-[10px] sm:text-xs opacity-40 hidden sm:inline">{elapsed(execution.startedAt, execution.endedAt)}</span>
              )}
            </>
          )}
        </div>
      </header>

      {/* ── Body ── */}
      <div className="flex flex-1 min-h-0 flex-col lg:flex-row">

        {/* ── Left: log terminal ── */}
        <div className="flex flex-col flex-1 min-w-0">
          {/* Toolbar */}
          <div className="shrink-0 flex items-center justify-between px-4 py-2"
            style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface)' }}>
            <span className="text-xs font-mono opacity-40 uppercase tracking-widest">
              Execution Logs
              {logs.length > 0 && <span className="ml-2 opacity-60">({logs.length})</span>}
            </span>
            <div className="flex items-center gap-2">
              {execution?.status === 'running' && (
                <span className="flex items-center gap-1.5 text-xs" style={{ color: '#facc15' }}>
                  <span className="animate-pulse w-1.5 h-1.5 rounded-full bg-current" />
                  Live
                </span>
              )}
              <button
                onClick={() => {
                  const next = !autoScroll
                  setAutoScroll(next)
                  if (next && logsScrollRef.current) {
                    logsScrollRef.current.scrollTo({ top: logsScrollRef.current.scrollHeight, behavior: 'smooth' })
                  }
                }}
                className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded transition-all"
                style={{
                  background: autoScroll ? 'rgba(0,229,160,0.1)' : 'var(--color-bg)',
                  border: `1px solid ${autoScroll ? 'rgba(0,229,160,0.4)' : 'var(--color-border)'}`,
                  color: autoScroll ? 'var(--color-accent)' : 'var(--color-muted)',
                }}>
                ↓ Auto-scroll {autoScroll ? 'ON' : 'OFF'}
              </button>
            </div>
          </div>

          {/* Scrollable log area */}
          <div
            ref={logsScrollRef}
            onScroll={handleLogsScroll}
            className="flex-1 overflow-y-auto overflow-x-auto"
            style={{ background: '#0a0c10', fontFamily: 'var(--font-geist-mono), "Cascadia Code", "Fira Code", monospace' }}>

            {fetchError && (
              <div className="p-4 text-xs" style={{ color: '#f87171' }}>{fetchError}</div>
            )}
            {!fetchError && logs.length === 0 && (
              <div className="p-4 text-xs opacity-30">Waiting for logs…</div>
            )}

            <div className="py-2">
              {groups.map((group) => {
                const borderColor = sourceBorderColor(group.source, group.type)
                const label = sourceLabel(group.source)
                const isXibecode = group.lines.some((l) => l.message.startsWith('[XibeCode]'))

                return (
                  <div key={group.id}
                    className="group/block relative px-4 py-1.5 mb-0.5"
                    style={{ borderLeft: `2px solid ${borderColor}`, marginLeft: '0' }}>

                    {/* Source + timestamp badge */}
                    <div className="flex items-center gap-2 mb-1 select-none">
                      <span className="text-[10px] font-mono opacity-25">
                        {formatTs(group.ts)}
                      </span>
                      {label && (
                        <span className="text-[10px] uppercase tracking-widest px-1.5 py-0.5 rounded"
                          style={{
                            background: isXibecode ? 'rgba(99,102,241,0.15)' : 'rgba(0,229,160,0.08)',
                            color: isXibecode ? '#818cf8' : 'var(--color-accent)',
                            border: `1px solid ${isXibecode ? 'rgba(99,102,241,0.25)' : 'rgba(0,229,160,0.15)'}`,
                          }}>
                          {isXibecode ? 'xibecode' : label}
                        </span>
                      )}
                      {group.type === 'error' && (
                        <span className="text-[10px] uppercase tracking-widest px-1.5 py-0.5 rounded"
                          style={{ background: 'rgba(248,113,113,0.15)', color: '#f87171', border: '1px solid rgba(248,113,113,0.25)' }}>
                          error
                        </span>
                      )}
                      {group.type === 'warning' && (
                        <span className="text-[10px] uppercase tracking-widest px-1.5 py-0.5 rounded"
                          style={{ background: 'rgba(250,204,21,0.1)', color: '#facc15', border: '1px solid rgba(250,204,21,0.2)' }}>
                          warn
                        </span>
                      )}
                    </div>

                    {/* Log lines */}
                    <div className="space-y-0.5 pl-1">
                      {group.lines.map((log) => {
                        const raw = isXibecode
                          ? log.message.replace(/^\[XibeCode\]\s?/, '')
                          : log.message.replace(/^\[stderr\]\s?/, '')

                        const hl = log.type === 'error' ? 'error'
                          : log.type === 'warning' ? 'warning'
                          : classifyLine(raw)

                        const style = hl ? HIGHLIGHT_STYLES[hl] : null
                        const html = renderAnsi(raw)
                        const isDim = hl === 'dim'

                        if (isDim) {
                          return (
                            <div key={log._id}
                              className="text-xs leading-5 whitespace-pre-wrap break-all opacity-40"
                              style={{ color: '#64748b' }}
                              dangerouslySetInnerHTML={{ __html: html }}
                            />
                          )
                        }

                        if (style) {
                          return (
                            <div key={log._id}
                              className="flex items-start gap-2 rounded-md px-2.5 py-1.5 my-1"
                              style={{
                                background: style.bg,
                                border: `1px solid ${style.border}`,
                              }}>
                              {style.icon && (
                                <span className="shrink-0 text-sm leading-5 select-none">{style.icon}</span>
                              )}
                              <span
                                className={`text-xs leading-5 whitespace-pre-wrap break-all flex-1 ${style.bold ? 'font-semibold' : ''}`}
                                style={{ color: style.color }}
                                dangerouslySetInnerHTML={{ __html: html }}
                              />
                            </div>
                          )
                        }

                        return (
                          <div key={log._id}
                            className="text-xs leading-5 whitespace-pre-wrap break-all"
                            style={{ color: '#94a3b8' }}
                            dangerouslySetInnerHTML={{ __html: html }}
                          />
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>

            {execution?.status === 'running' && (
              <div className="px-6 pb-4 flex items-center gap-2 text-xs opacity-30">
                <span className="animate-spin w-3 h-3 border border-current border-t-transparent rounded-full inline-block" />
                Running…
              </div>
            )}
          </div>
        </div>

        {/* ── Right: fixed metadata panel ── */}
        <div
          className="shrink-0 flex flex-col overflow-y-auto w-full lg:w-72 border-t lg:border-t-0 lg:border-l"
          style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
        >

          {/* PR card */}
          {execution?.prUrl && (
            <div className="m-4 p-4 rounded-xl space-y-3 shrink-0"
              style={{ background: 'rgba(0,229,160,0.07)', border: '1px solid rgba(0,229,160,0.35)' }}>
              <div className="flex items-center gap-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
                  style={{ color: 'var(--color-accent)', flexShrink: 0 }}>
                  <circle cx="18" cy="18" r="3" />
                  <circle cx="6" cy="6" r="3" />
                  <path d="M6 9v12" strokeLinecap="round" />
                  <path d="M18 6V3m0 0L15 6m3-3l3 3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--color-accent)' }}>
                  Pull Request
                </span>
              </div>
              <a href={execution.prUrl} target="_blank" rel="noreferrer"
                className="block text-xs break-all leading-5 hover:opacity-80"
                style={{ color: 'var(--color-accent)', textDecoration: 'underline' }}>
                {execution.prUrl}
              </a>
              <a href={execution.prUrl} target="_blank" rel="noreferrer"
                className="btn-primary text-xs w-full text-center block">
                Open PR →
              </a>
            </div>
          )}

          {/* Metadata rows */}
          <div className="p-4 space-y-4">
            <h3 className="text-[10px] font-bold uppercase tracking-widest opacity-40">Execution</h3>

            {execution ? (
              <div className="space-y-3">
                {[
                  { label: 'Repository', value: `${execution.owner}/${execution.repo}`, accent: true },
                  { label: 'Prompt', value: execution.prompt },
                  { label: 'Status', value: statusLabel, color: statusColor },
                  { label: 'Started', value: new Date(execution.startedAt).toLocaleString(), mono: true },
                  ...(execution.endedAt ? [{ label: 'Ended', value: new Date(execution.endedAt).toLocaleString(), mono: true }] : []),
                  { label: 'Duration', value: elapsed(execution.startedAt, execution.endedAt), mono: true },
                ].map(({ label, value, accent, color, mono }) => (
                  <div key={label}>
                    <p className="text-[10px] uppercase opacity-40 mb-0.5">{label}</p>
                    <p className={`text-xs leading-5 wrap-break-word ${mono ? 'font-mono' : ''}`}
                      style={{ color: color || (accent ? 'var(--color-accent)' : undefined), opacity: color || accent ? 1 : 0.8 }}>
                      {value}
                    </p>
                  </div>
                ))}

                {execution.error && (
                  <div>
                    <p className="text-[10px] uppercase mb-0.5" style={{ color: '#f87171' }}>Error</p>
                    <p className="text-xs wrap-break-word leading-5" style={{ color: '#f87171' }}>{execution.error}</p>
                  </div>
                )}

                {execution.warnings.length > 0 && (
                  <div>
                    <p className="text-[10px] uppercase opacity-40 mb-1">Warnings</p>
                    <ul className="space-y-1">
                      {execution.warnings.map((w, i) => (
                        <li key={i} className="text-xs leading-5" style={{ color: '#facc15' }}>{w}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="pt-2">
                  <button
                    onClick={() => execution.chatId ? router.push(`/chat?id=${execution.chatId}`) : router.push('/chat')}
                    className="w-full text-xs py-2 rounded-lg transition-opacity hover:opacity-80"
                    style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}>
                    ← Back to plan
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {[70, 50, 80, 55].map((w, i) => (
                  <div key={i} className="h-3 rounded animate-pulse"
                    style={{ background: 'var(--color-border)', width: `${w}%` }} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function CodePage() {
  return (
    <Suspense
      fallback={
        <div
          className="min-h-screen flex items-center justify-center"
          style={{ background: 'var(--color-bg)', color: 'var(--color-text)' }}
        >
          <div className="text-center space-y-3 text-sm opacity-60">
            Loading execution…
          </div>
        </div>
      }
    >
      <CodePageInner />
    </Suspense>
  )
}
