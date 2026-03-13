'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import ReactMarkdown from 'react-markdown'
import { getToken } from '../../lib/api'

interface Message {
  role: 'user' | 'assistant'
  content: string
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

export default function ChatPage() {
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

    // Add user message immediately
    setMessages((prev) => [...prev, { role: 'user', content: text }])
    // Reserve an assistant slot for streaming
    setMessages((prev) => [...prev, { role: 'assistant', content: '' }])

    const token = getToken()

    try {
      const response = await fetch(`${BASE_URL}/plan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          prompt: text,
          repo,
          owner,
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

            if (payload.type === 'chunk') {
              accumulated += payload.data.content as string
              const { message, plan: planChunk } = parsePlanTags(accumulated)
              // Update streaming assistant message
              setMessages((prev) => [
                ...prev.slice(0, -1),
                { role: 'assistant', content: message },
              ])
              if (planChunk) setPlan(planChunk)
            }

            if (payload.type === 'done') {
              const { message, plan: finalPlan } = parsePlanTags(accumulated)
              setMessages((prev) => [
                ...prev.slice(0, -1),
                { role: 'assistant', content: message || '✓ Plan generated.' },
              ])
              if (finalPlan) setPlan(finalPlan)
            }

            if (payload.type === 'error') {
              setError((payload.data.message as string) || 'Error generating plan.')
              setMessages((prev) => prev.slice(0, -1)) // remove empty assistant slot
            }
          } catch {
            // ignore parse errors for individual SSE lines
          }
        }
      }
    } catch (err: unknown) {
      setError((err as Error)?.message || 'Failed to generate plan.')
      setMessages((prev) => {
        // remove empty assistant slot and optimistic user message
        const withoutAssistant = prev.slice(0, -1)
        return withoutAssistant[withoutAssistant.length - 1]?.content === text
          ? withoutAssistant.slice(0, -1)
          : withoutAssistant
      })
    } finally {
      setIsLoading(false)
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
      className="min-h-screen flex flex-col"
      style={{ background: 'var(--color-bg)', color: 'var(--color-text)' }}
    >
      {/* Header */}
      <header
        className="h-14 flex items-center px-6 justify-between sticky top-0 z-50 shrink-0"
        style={{ background: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)' }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/dashboard')}
            className="text-sm opacity-60 hover:opacity-100 transition-opacity"
          >
            ← Dashboard
          </button>
          <span style={{ color: 'var(--color-border)' }}>|</span>
          <span
            className="text-sm font-mono px-2 py-0.5 rounded"
            style={{ background: 'var(--color-bg)', color: 'var(--color-accent)' }}
          >
            {repoLabel}
          </span>
          {defaultBranch && (
            <span className="text-xs opacity-40">@ {defaultBranch}</span>
          )}
        </div>

        {/* Single Execute button — only in the header */}
        {hasPlan && (
          <button
            onClick={handleExecute}
            disabled={isExecuting || isLoading}
            className="btn-primary text-sm"
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

      {/* Body: two-column */}
      <div className="flex flex-1 overflow-hidden" style={{ height: 'calc(100vh - 3.5rem)' }}>
        {/* ─── Left: chat thread ─── */}
        <div
          className="flex flex-col"
          style={{
            width: hasPlan ? '42%' : '100%',
            borderRight: hasPlan ? '1px solid var(--color-border)' : 'none',
            transition: 'width 0.3s ease',
          }}
        >
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
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
                    {msg.content ? (
                      <p className="whitespace-pre-wrap leading-6 opacity-90">{msg.content}</p>
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

          {/* Input */}
          <div
            className="shrink-0 p-4"
            style={{ borderTop: '1px solid var(--color-border)', background: 'var(--color-surface)' }}
          >
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
            <div className="flex gap-2 items-end">
              <textarea
                className="input-field resize-none text-sm"
                style={{ height: '72px' }}
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
                className="btn-primary text-sm shrink-0"
                style={{ height: '72px', padding: '0 1.2rem' }}
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
            <p className="text-[10px] opacity-25 mt-1">Enter to send · Shift+Enter for newline</p>
          </div>
        </div>

        {/* ─── Right: plan panel (only when plan exists) ─── */}
        {hasPlan && (
          <div className="flex flex-col overflow-hidden" style={{ flex: 1 }}>
            {/* Panel header — NO execute button here */}
            <div
              className="flex items-center gap-2 px-5 py-3 shrink-0"
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

            {/* Plan content */}
            <div
              className="flex-1 overflow-y-auto p-6"
              style={{ background: 'var(--color-bg)' }}
            >
              <div className="prose prose-invert prose-sm max-w-none">
                <ReactMarkdown>{plan}</ReactMarkdown>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
