'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface StoredRepo {
  name: string
  full_name: string
  default_branch?: string
}

export default function DeveloperInterfacePage() {
  const router = useRouter()
  const [prompt, setPrompt] = useState('')
  const [isThinking, setIsThinking] = useState(false)
  const [hasPlan, setHasPlan] = useState(false)
  const [repoName, setRepoName] = useState('payment-api')
  const [branchName, setBranchName] = useState('main')
  const [error, setError] = useState('')

  useEffect(() => {
    if (typeof window === 'undefined') return
    const stored = window.localStorage.getItem('selectedRepo')
    if (!stored) return
    try {
      const parsed: StoredRepo = JSON.parse(stored)
      const name = parsed.name || parsed.full_name || repoName
      const branch = parsed.default_branch || branchName
      setRepoName(name)
      setBranchName(branch)
    } catch {
      // ignore parse errors and keep defaults
    }
  }, [])

  function isValidPrompt(text: string) {
    const t = text.trim().toLowerCase()
    if (t.length < 20) return false
    const trivial = ['hi', 'hey', 'hello', 'bye', 'ok', 'thanks', 'thank you']
    if (trivial.includes(t)) return false
    const intentWords = ['add', 'update', 'create', 'remove', 'delete', 'refactor', 'fix', 'implement', 'change']
    return intentWords.some((w) => t.includes(w))
  }

  function handleGeneratePlan() {
    if (!prompt.trim()) {
      setError('Please describe a change first.')
      return
    }
    if (!isValidPrompt(prompt)) {
      setError('I’m here for bugs, commits, and PRs… not tea and chit-chat')
      return
    }

    setError('')
    setIsThinking(true)

    // Simulate AI plan generation like the original script.
    setTimeout(() => {
      setIsThinking(false)
      setHasPlan(true)
    }, 1500)
  }

  const executeDisabled = !hasPlan

  function handleExecute() {
    if (executeDisabled) return
    router.push('/mission-control')
  }

  return (
    <div className="bg-dark-bg text-gray-300 font-mono min-h-screen flex flex-col">
      {/* MainHeader */}
      <header className="h-14 border-b border-white/10 flex items-center px-6 justify-between bg-dark-bg/80 sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-accent-cyan shadow-[0_0_8px_#00f2ff]" />
          <h1 className="text-xl font-bold tracking-tighter text-white">
            Fix<span className="text-accent-cyan">AI</span>
          </h1>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <span className="text-white/40">v1.2.4-stable</span>
          <div className="h-8 w-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
            <span className="text-accent-lime">JD</span>
          </div>
        </div>
      </header>

      {/* LayoutWrapper */}
      <main className="flex-1 flex overflow-hidden p-4 gap-4">
        {/* LeftPanel - Repo Info */}
        <aside
          className="w-64 glass-panel flex flex-col overflow-hidden"
          data-purpose="repository-sidebar"
        >
          <div className="p-4 border-b border-white/5 bg-white/5">
            <h2 className="text-xs uppercase tracking-widest text-accent-cyan font-bold mb-4">
              Active Repository
            </h2>
            <div className="flex items-center gap-3 p-2 bg-black/40 border border-white/10 rounded">
              <svg
                className="w-5 h-5 text-accent-lime"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                />
              </svg>
              <span className="text-sm font-medium text-white truncate">{repoName}</span>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs terminal-scrollbar">
            <div>
              <p className="text-white/40 mb-1">Branch</p>
              <p className="text-accent-lime">{branchName}</p>
            </div>
            <div>
              <p className="text-white/40 mb-1">Last Commit</p>
              <p className="font-mono truncate">a8f2c31 [Add CORS support]</p>
            </div>
            <div>
              <p className="text-white/40 mb-1">Language</p>
              <p>TypeScript / Node.js</p>
            </div>
            <div className="pt-4 border-t border-white/5">
              <h3 className="text-white/60 mb-2 uppercase text-[10px]">Recent Branches</h3>
              <ul className="space-y-2 text-white/40">
                <li className="hover:text-accent-cyan cursor-pointer">fix/auth-leak</li>
                <li className="hover:text-accent-cyan cursor-pointer">feat/stripe-v3</li>
                <li className="hover:text-accent-cyan cursor-pointer">refactor/error-handler</li>
              </ul>
            </div>
          </div>
        </aside>

        {/* Center: Chat-style conversation + prompt */}
        <section className="flex-1 flex flex-col gap-4">
          <div className="glass-panel flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
              {/* Chat messages */}
              {!prompt && !hasPlan && (
                <p className="text-sm text-gray-500 text-center mt-10">
                  Start by describing a change you want to make to this repository.
                </p>
              )}
              {prompt && (
                <div className="self-end max-w-[80%] rounded-2xl bg-accent-cyan/10 border border-accent-cyan/40 px-4 py-3 text-sm text-accent-cyan">
                  <p className="text-[10px] uppercase tracking-wide mb-1 text-accent-cyan/70">
                    You
                  </p>
                  <p>{prompt}</p>
                </div>
              )}
              {hasPlan && (
                <div className="self-start max-w-[80%] rounded-2xl bg-black/40 border border-white/10 px-4 py-3 text-sm text-gray-100">
                  <p className="text-[10px] uppercase tracking-wide mb-1 text-gray-400">
                    AI Plan
                  </p>
                  <ul className="space-y-1.5 text-xs text-gray-300">
                    <li>1. Create an isolated sandbox for {repoName}.</li>
                    <li>
                      2. Clone <span className="text-accent-cyan">{repoName}:{branchName}</span> and
                      install dependencies.
                    </li>
                    <li>3. Run the coding agent to apply the requested changes.</li>
                    <li>4. Commit the diff with a semantic message.</li>
                    <li>5. Push a new branch and open a Pull Request.</li>
                  </ul>
                </div>
              )}
            </div>

            {/* Prompt input + validation error */}
            <div className="border-t border-white/5 p-4">
              {error && (
                <p className="mb-2 text-xs text-red-400 bg-red-500/10 border border-red-500/30 rounded px-3 py-1.5">
                  {error}
                </p>
              )}
              <label className="text-xs text-accent-cyan mb-2 flex items-center gap-2">
                <span className="text-lg">&gt;</span> Describe your change:
              </label>
              <div className="flex gap-2 items-end">
                <textarea
                  id="ai-prompt-input"
                  className="flex-1 bg-transparent border border-white/10 rounded-md focus:ring-0 text-sm md:text-base text-white resize-none placeholder-white/20 px-3 py-2 h-20"
                  placeholder="Add rate limiting to login API..."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                />
                <button
                  id="generate-plan-btn"
                  onClick={handleGeneratePlan}
                  className="px-4 py-2 bg-accent-cyan/10 border border-accent-cyan text-accent-cyan rounded-md text-xs font-bold uppercase tracking-wider hover:bg-accent-cyan hover:text-black transition-all shadow-cyan-glow active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
                  disabled={isThinking}
                >
                  {isThinking ? 'Analyzing...' : hasPlan ? 'Regenerate Plan' : 'Generate Plan'}
                </button>
              </div>
            </div>
          </div>

          {/* Right: Simple AI plan summary card (mirrors chat bubble) */}
          <aside className="w-full glass-panel p-4 flex flex-col gap-3" data-purpose="ai-plan-output">
            <div className="flex items-center justify-between">
              <h2 className="text-xs uppercase tracking-widest text-accent-cyan font-bold">
                Plan Summary
              </h2>
              {isThinking && (
                <div className="flex items-center gap-1.5" id="status-indicator">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-lime opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-accent-lime" />
                  </span>
                  <span className="text-[10px] text-accent-lime uppercase tracking-tighter">
                    Thinking
                  </span>
                </div>
              )}
            </div>
            {!hasPlan && !isThinking && (
              <p className="text-xs text-gray-500">
                Once a valid change request is entered, the AI plan will appear here.
              </p>
            )}
            {hasPlan && (
              <ul className="space-y-1.5 text-xs text-gray-300">
                <li>• Create sandbox for {repoName}.</li>
                <li>
                  • Clone <span className="text-accent-cyan">{repoName}:{branchName}</span> and
                  install dependencies.
                </li>
                <li>• Run coding agent and apply edits.</li>
                <li>• Commit, push branch, and open PR.</li>
              </ul>
            )}
          </aside>
        </section>
      </main>

      {/* BottomActionArea */}
      <footer
        className="h-20 border-t border-white/10 px-6 flex items-center justify-between glass-panel mx-4 mb-4"
        data-purpose="execution-bar"
      >
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-accent-lime shadow-[0_0_5px_#32ff7e]" />
            <span className="text-[10px] uppercase tracking-tighter">System Ready</span>
          </div>
          <div className="h-4 w-px bg-white/10" />
          <p className="text-[11px] text-white/50 italic">
            AI core initialized. Waiting for task configuration...
          </p>
        </div>
        <button
          id="execute-btn"
          disabled={executeDisabled}
          onClick={handleExecute}
          className={
            'px-10 py-3 rounded-md font-bold uppercase tracking-wider transition-all ' +
            (executeDisabled
              ? 'bg-white/5 border border-white/10 text-white/20 cursor-not-allowed'
              : 'bg-accent-lime/10 border border-accent-lime text-accent-lime shadow-lime-glow hover:bg-accent-lime hover:text-black')
          }
        >
          Execute Plan
        </button>
      </footer>
    </div>
  )
}

