'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { getToken } from '../../lib/api'

interface Message {
  role: 'user' | 'assistant' | 'research'
  content: string
  filesRead?: string[]
  researching?: boolean
}

interface StoredRepo {
  name: string
  full_name: string
  owner?: string
  default_branch?: string
}

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api'

/** Split accumulated text into the chat message (outside tags) and plan (inside <plan>…</plan>). */
function parsePlanTags(text: string): { message: string; plan: string } {
  const startIdx = text.indexOf('<plan>')
  const endIdx = text.indexOf('</plan>')

  if (startIdx === -1) {
    // No plan tag yet — everything is a chat message
    return { message: text, plan: '' }
  }

  if (endIdx === -1) {
    // Plan tag opened but not closed yet (streaming in progress)
    const message = text.slice(0, startIdx).trim()
    const plan = text.slice(startIdx + 6) // content after <plan>
    return { message, plan }
  }

  // Both tags present — complete plan
  const before = text.slice(0, startIdx).trim()
  const after = text.slice(endIdx + 7).trim()
  const message = [before, after].filter(Boolean).join('\n\n')
  const plan = text.slice(startIdx + 6, endIdx).trim()
  return { message, plan }
}

function MermaidBlock({ chart }: { chart: string }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!ref.current || !chart.trim()) return
    let cancelled = false
    ;(async () => {
      try {
        const { default: mermaid } = await import('mermaid')
        mermaid.initialize({ startOnLoad: false, theme: 'dark' })
        const { svg } = await mermaid.render(`mermaid-${Math.random().toString(36).slice(2)}`, chart)
        if (!cancelled && ref.current) ref.current.innerHTML = svg
      } catch {}
    })()
    return () => { cancelled = true }
  }, [chart])

  return <div ref={ref} />
}

const markdownComponents = {
  code({ inline, className, children, ...props }: {
    inline?: boolean
    className?: string
    children?: React.ReactNode
  }) {
    const lang = /language-(\w+)/.exec(className || '')?.[1]
    if (!inline && lang === 'mermaid') {
      return <MermaidBlock chart={String(children ?? '').trim()} />
    }
    return <code className={className} {...props}>{children}</code>
  },
}

function ChatPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Capture the ID that was in the URL when the page first loaded.
  // We only hydrate from the server for that initial load — not when we
  // programmatically push a new id via router.replace during a send.
  const initialChatId = useRef(searchParams.get('id'))

  const [messages, setMessages] = useState<Message[]>([])
  const [plan, setPlan] = useState<string>('')
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isExecuting, setIsExecuting] = useState(false)
  const [error, setError] = useState('')
  const [repo, setRepo] = useState('')
  const [owner, setOwner] = useState('')
  const [defaultBranch, setDefaultBranch] = useState('main')
  const [currentChatId, setCurrentChatId] = useState<string | null>(initialChatId.current)
  const [researchStatus, setResearchStatus] = useState<string | null>(null)
  const [filesRead, setFilesRead] = useState<string[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Load repo from localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return
    const stored = window.localStorage.getItem('selectedRepo')
    if (!stored) return
    try {
      const parsed: StoredRepo = JSON.parse(stored)
      setRepo(parsed.name || parsed.full_name?.split('/')[1] || '')
      setOwner(parsed.owner || parsed.full_name?.split('/')[0] || '')
      setDefaultBranch(parsed.default_branch || 'main')
    } catch {}
  }, [])

  // Hydrate only when an id was present on initial page load (e.g. direct link or refresh)
  useEffect(() => {
    const id = initialChatId.current
    if (!id) return

    fetch(`${BASE_URL}/chat/${id}`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    })
      .then((r) => r.json())
      .then((data: { chat?: { messages: Message[]; plan?: string } }) => {
        if (!data.chat) return
        const visible = (data.chat.messages || []).filter(
          (m) => m.role === 'user' || m.role === 'assistant',
        )
        setMessages(visible)
        if (data.chat.plan) setPlan(data.chat.plan)
      })
      .catch(() => {})
  }, [])

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  async function handleSend() {
    const text = input.trim()
    if (!text || isLoading || isExecuting) return
    if (!repo || !owner) {
      setError('No repository selected. Go back and pick a repo first.')
      return
    }

    setError('')
    setInput('')
    setIsLoading(true)
    setFilesRead([])
    setResearchStatus(null)

    // Add user message, then a research bubble, then the assistant slot
    setMessages((prev) => [
      ...prev,
      { role: 'user', content: text },
      { role: 'research', content: '', filesRead: [], researching: true },
      { role: 'assistant', content: '' },
    ])

    const token = getToken()

    try {
      const response = await fetch(`${BASE_URL}/plan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          prompt: `${text}\n\nPlease respond in Markdown format, and when describing architectures, flows, or relationships, include Mermaid diagrams in fenced \`\`\`mermaid code blocks where helpful.`,
          repo,
          owner,
          defaultBranch,
          ...(currentChatId ? { chatId: currentChatId } : {}),
        }),
      })

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}))
        throw new Error((errData as { error?: string }).error || 'Request failed')
      }

      const reader = response.body!.getReader()
      const decoder = new TextDecoder()
      let accumulated = ''
      let lineBuf = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        lineBuf += decoder.decode(value, { stream: true })
        const lines = lineBuf.split('\n')
        lineBuf = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const payload = JSON.parse(line.slice(6)) as {
              type: string
              data: Record<string, unknown>
            }

            if (payload.type === 'chatId') {
              const id = payload.data.chatId as string
              if (!currentChatId) {
                setCurrentChatId(id)
                router.replace(`/chat?id=${id}`)
              }
            }

            if (payload.type === 'reading_file') {
              const p = payload.data.path as string
              setResearchStatus(`Reading ${p}`)
              setFilesRead((prev) => {
                const next = [...prev, p]
                setMessages((msgs) => {
                  const idx = msgs.findIndex((m) => m.role === 'research')
                  if (idx === -1) return msgs
                  const updated = [...msgs]
                  updated[idx] = { ...updated[idx], filesRead: next, researching: true }
                  return updated
                })
                return next
              })
            }

            if (payload.type === 'chunk') {
              accumulated += payload.data.content as string
              const { message, plan: planChunk } = parsePlanTags(accumulated)
              setMessages((prev) => {
                const lastIdx = prev.length - 1
                if (prev[lastIdx]?.role !== 'assistant') return prev
                const updated = [...prev]
                updated[lastIdx] = { role: 'assistant', content: message }
                return updated
              })
              if (planChunk) setPlan(planChunk)
            }

            if (payload.type === 'done') {
              const { message, plan: finalPlan } = parsePlanTags(accumulated)
              setMessages((prev) =>
                prev.map((m, i) => {
                  if (m.role === 'research') return { ...m, researching: false }
                  if (i === prev.length - 1 && m.role === 'assistant')
                    return { ...m, content: message || '✓ Plan generated.' }
                  return m
                })
              )
              if (finalPlan) setPlan(finalPlan)
              setResearchStatus(null)
            }

            if (payload.type === 'error') {
              setError((payload.data.message as string) || 'Error generating plan.')
              setMessages((prev) =>
                prev
                  .filter((_, i) => !(i === prev.length - 1 && prev[i].role === 'assistant'))
                  .map((m) => m.role === 'research' ? { ...m, researching: false } : m)
              )
              setResearchStatus(null)
            }
          } catch {
            // ignore parse errors for individual SSE lines
          }
        }
      }
    } catch (err: unknown) {
      setError((err as Error)?.message || 'Failed to generate plan.')
      setMessages((prev) =>
        prev
          .filter((m, i) => !(i === prev.length - 1 && m.role === 'assistant' && !m.content))
          .map((m) => m.role === 'research' ? { ...m, researching: false } : m)
      )
    } finally {
      setIsLoading(false)
      setResearchStatus(null)
    }
  }

  async function handleExecute() {
    if (!plan || !repo || !owner || isExecuting || isLoading) return
    setIsExecuting(true)
    setError('')

    const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user')
    const prompt = lastUserMsg?.content || plan
    const token = getToken()

    try {
      const response = await fetch(`${BASE_URL}/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          prompt,
          repo,
          owner,
          defaultBranch,
          ...(currentChatId ? { chatId: currentChatId } : {}),
        }),
      })

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}))
        throw new Error((errData as { error?: string }).error || 'Execution failed')
      }

      const reader = response.body!.getReader()
      const decoder = new TextDecoder()
      let redirected = false
      let lineBuf = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        if (redirected) continue

        lineBuf += decoder.decode(value, { stream: true })
        const lines = lineBuf.split('\n')
        lineBuf = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const payload = JSON.parse(line.slice(6)) as { type: string; data: Record<string, unknown> }
            if (payload.type === 'execution' && payload.data.id) {
              redirected = true
              router.push(`/code?id=${payload.data.id}`)
            }
          } catch {}
        }
      }

      if (!redirected) router.push('/dashboard')
    } catch (err: unknown) {
      setError((err as Error)?.message || 'Execution failed.')
      setIsExecuting(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const repoLabel = owner && repo ? `${owner}/${repo}` : repo || 'No repo selected'
  const hasPlan = plan.trim().length > 0

  return (
    <div
      className="flex flex-col w-full fixed inset-0 overflow-hidden"
      style={{ background: 'var(--color-bg)', color: 'var(--color-text)' }}
    >
      {/* Header — fixed at top */}
      <header
        className="h-14 flex items-center px-4 md:px-6 justify-between shrink-0 z-50"
        style={{ background: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)' }}
      >
        <div className="flex items-center gap-2 md:gap-3 min-w-0">
          <button
            onClick={() => router.push('/dashboard')}
            className="text-xs sm:text-sm opacity-60 hover:opacity-100 transition-opacity shrink-0"
          >
            ← Dashboard
          </button>
          <span style={{ color: 'var(--color-border)' }} className="hidden sm:inline">|</span>
          <span
            className="text-xs sm:text-sm font-mono px-2 py-0.5 rounded truncate"
            style={{ background: 'var(--color-bg)', color: 'var(--color-accent)' }}
          >
            {repoLabel}
          </span>
          {defaultBranch && (
            <span className="text-[10px] sm:text-xs opacity-40 hidden sm:inline">@ {defaultBranch}</span>
          )}
        </div>

        {/* Single Execute button — only in the header */}
        {hasPlan && (
          <button
            onClick={handleExecute}
            disabled={isExecuting || isLoading}
            className="btn-primary text-xs sm:text-sm"
          >
            {isExecuting ? (
              <>
                <span className="animate-spin inline-block w-3 h-3 border border-current border-t-transparent rounded-full" />
                Running…
              </>
            ) : (
              '▶ Execute'
            )}
          </button>
        )}
      </header>

      {/* Body: two-column, full width left-to-right; only chat and plan panels scroll */}
      <div className="flex flex-1 min-h-0 w-full flex-col lg:flex-row">
        {/* ─── Left: chat thread ─── */}
        <div
          className={`flex flex-col min-h-0 w-full ${hasPlan ? 'lg:w-[42%] lg:min-w-[320px] lg:shrink-0' : ''} ${hasPlan ? 'border-b lg:border-b-0 lg:border-r' : ''}`}
          style={{
            borderColor: 'var(--color-border)',
            transition: 'width 0.3s ease',
          }}
        >
          {/* Messages — only this area scrolls (vertical) */}
          <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
          <div className="max-w-2xl mx-auto px-3 sm:px-4 py-4 sm:py-5 space-y-4">
            {messages.length === 0 && !isLoading && (
              <div className="flex flex-col items-center justify-center h-full gap-3 opacity-40 text-sm select-none">
                <svg
                  width="40"
                  height="40"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M8 10h.01M12 10h.01M16 10h.01M21 16c0 1.1-.9 2-2 2H5l-4 4V6c0-1.1.9-2 2-2h16c1.1 0 2 .9 2 2v10z"
                  />
                </svg>
                <p>Describe a change and the AI will plan it for you.</p>
                {(!repo || !owner) && (
                  <p className="text-xs" style={{ color: 'var(--color-accent)' }}>
                    No repo selected —{' '}
                    <button
                      onClick={() => router.push('/repository-explorer')}
                      className="underline"
                    >
                      pick a repository
                    </button>
                  </p>
                )}
              </div>
            )}

            {messages.map((msg, i) => {
              const isLast = i === messages.length - 1
              const streaming = isLoading && isLast && msg.role === 'assistant'

              // ── Research bubble ──
              if (msg.role === 'research') {
                const files = msg.filesRead ?? []
                if (files.length === 0 && !msg.researching) return null
                return (
                  <div key={i} className="flex justify-start">
                    <div
                      className="max-w-full sm:max-w-[92%] rounded-2xl px-4 py-3 text-xs"
                      style={{
                        background: 'rgba(99,102,241,0.07)',
                        border: '1px solid rgba(99,102,241,0.22)',
                        minWidth: '180px',
                      }}
                    >
                      <div className="flex items-center gap-2 mb-2" style={{ color: 'rgba(165,180,252,0.85)' }}>
                        {msg.researching ? (
                          <span
                            className="inline-block w-3 h-3 border border-current border-t-transparent rounded-full"
                            style={{ animation: 'spin 0.8s linear infinite', flexShrink: 0 }}
                          />
                        ) : (
                          <span style={{ color: '#4ade80' }}>✓</span>
                        )}
                        <span className="font-semibold uppercase tracking-wide text-[10px]">
                          {msg.researching ? 'Researching repo…' : `Read ${files.length} file${files.length !== 1 ? 's' : ''}`}
                        </span>
                      </div>
                      <div className="flex flex-col gap-1" style={{ maxHeight: '160px', overflowY: 'auto' }}>
                        {files.map((f, fi) => (
                          <div key={fi} className="flex items-center gap-1.5" style={{ color: 'rgba(200,210,230,0.65)' }}>
                            <span style={{ color: '#4ade80', flexShrink: 0, fontSize: '10px' }}>✓</span>
                            <span className="font-mono truncate" style={{ fontSize: '11px' }}>{f}</span>
                          </div>
                        ))}
                        {msg.researching && researchStatus && (
                          <div className="flex items-center gap-1.5 mt-0.5" style={{ color: 'rgba(165,180,252,0.65)' }}>
                            <span
                              className="inline-block w-2 h-2 border border-current border-t-transparent rounded-full"
                              style={{ animation: 'spin 0.8s linear infinite', flexShrink: 0 }}
                            />
                            <span className="font-mono truncate" style={{ fontSize: '11px' }}>
                              {researchStatus.replace('Reading ', '')}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              }

              // ── Regular user / assistant bubbles ──
              return (
                <div
                  key={i}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className="max-w-[88%] rounded-2xl px-4 py-3 text-sm"
                    style={
                      msg.role === 'user'
                        ? {
                            background: 'rgba(0,229,160,0.1)',
                            border: '1px solid rgba(0,229,160,0.35)',
                          }
                        : {
                            background: 'var(--color-surface)',
                            border: '1px solid var(--color-border)',
                          }
                    }
                  >
                    <p className="text-[10px] uppercase tracking-wide mb-1 opacity-40">
                      {msg.role === 'user' ? 'You' : 'AI Planner'}
                    </p>
                    {msg.role === 'user' ? (
                      msg.content ? (
                        <p className="whitespace-pre-wrap leading-6 opacity-90">{msg.content}</p>
                      ) : null
                    ) : msg.content ? (
                      hasPlan && i === messages.length - 1 ? (
                        <div className="text-sm leading-6 opacity-80">
                          {msg.content.trim() ? (
                            <p className="whitespace-pre-wrap">{msg.content.trim().split('\n').slice(0, 2).join('\n')}</p>
                          ) : null}
                          <p className="mt-1 text-xs flex items-center gap-1.5" style={{ color: 'var(--color-accent)', opacity: 0.7 }}>
                            <span>→</span>
                            <span>Execution plan ready on the right</span>
                          </p>
                        </div>
                      ) : (
                        <div className="prose prose-invert prose-sm max-w-none text-sm leading-6 opacity-90 prose-pre:whitespace-pre-wrap prose-pre:break-words">
                          <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                            {msg.content}
                          </ReactMarkdown>
                        </div>
                      )
                    ) : streaming ? (
                      <span className="opacity-40 text-xs">Thinking…</span>
                    ) : null}
                    {streaming && (
                      <span
                        className="inline-block w-1.5 h-4 ml-0.5 rounded-sm animate-pulse"
                        style={{ background: 'var(--color-accent)', verticalAlign: 'text-bottom' }}
                      />
                    )}
                  </div>
                </div>
              )
            })}

            <div ref={messagesEndRef} />
          </div>
          </div>

          {/* Input — fixed at bottom of chat panel; stays visible when messages scroll */}
          <div
            className="shrink-0 py-3 px-3 sm:px-4"
            style={{ borderTop: '1px solid var(--color-border)', background: 'var(--color-surface)' }}
          >
            <div className="max-w-2xl mx-auto">
              {error && (
                <p
                  className="mb-2 text-xs px-3 py-1.5 rounded"
                  style={{
                    background: 'rgba(239,68,68,0.1)',
                    border: '1px solid rgba(239,68,68,0.3)',
                    color: '#f87171',
                  }}
                >
                  {error}
                </p>
              )}
              <div
                className="flex gap-2 items-end rounded-2xl px-3 py-2"
                style={{ border: '1px solid var(--color-border)', background: 'var(--color-bg)' }}
              >
                <textarea
                  className="flex-1 bg-transparent resize-none text-sm outline-none"
                  style={{ height: '56px', lineHeight: '1.5', paddingTop: '6px', color: 'inherit' }}
                  placeholder={
                    hasPlan
                      ? 'Refine the plan or ask for changes…'
                      : 'Describe a change to make to this repo…'
                  }
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={isLoading || isExecuting}
                />
                <button
                  onClick={handleSend}
                  disabled={isLoading || isExecuting || !input.trim()}
                  className="btn-primary text-xs sm:text-sm shrink-0 self-end"
                  style={{ padding: '0.4rem 1rem', marginBottom: '2px' }}
                >
                  {isLoading ? (
                    <span className="animate-spin inline-block w-3 h-3 border border-current border-t-transparent rounded-full" />
                  ) : hasPlan ? (
                    'Refine'
                  ) : (
                    'Plan'
                  )}
                </button>
              </div>
              <p className="text-[10px] opacity-20 mt-1 text-center">Enter to send · Shift+Enter for newline</p>
            </div>
          </div>
        </div>

        {/* ─── Right: plan panel (only when plan exists); only this area scrolls (vertical + horizontal) ─── */}
        {hasPlan && (
          <div className="flex flex-col min-h-0 min-w-0 flex-1 border-t lg:border-t-0" style={{ borderColor: 'var(--color-border)' }}>
            {/* Panel header — fixed, no scroll */}
            <div
              className="flex items-center gap-2 px-4 sm:px-5 py-3 shrink-0"
              style={{
                borderBottom: '1px solid var(--color-border)',
                background: 'var(--color-surface)',
              }}
            >
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{
                  background: 'var(--color-accent)',
                  boxShadow: '0 0 6px var(--color-accent)',
                }}
              />
              <h2
                className="text-xs font-bold uppercase tracking-widest"
                style={{ color: 'var(--color-accent)' }}
              >
                Execution Plan
              </h2>
              {isLoading && (
                <span
                  className="ml-auto text-[10px] opacity-50 flex items-center gap-1"
                >
                  <span className="animate-spin inline-block w-2.5 h-2.5 border border-current border-t-transparent rounded-full" />
                  Streaming…
                </span>
              )}
            </div>

            {/* Plan content — scrolls vertically only */}
            <div
              className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-4 sm:p-6"
              style={{ background: 'var(--color-bg)' }}
            >
              <div className="prose prose-invert prose-sm max-w-none min-w-0 prose-pre:whitespace-pre-wrap prose-pre:break-words prose-pre:overflow-x-auto">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={markdownComponents}
                >
                  {plan}
                </ReactMarkdown>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function ChatPage() {
  return (
    <Suspense
      fallback={
        <div
          className="flex flex-col w-full fixed inset-0 overflow-hidden items-center justify-center"
          style={{ background: 'var(--color-bg)', color: 'var(--color-text)' }}
        >
          <div className="text-center space-y-2 text-sm opacity-60">
            <p>Loading chat…</p>
          </div>
        </div>
      }
    >
      <ChatPageInner />
    </Suspense>
  )
}
