'use client'

import { useState } from 'react'

export default function DeveloperInterfacePage() {
  const [prompt, setPrompt] = useState('')
  const [isThinking, setIsThinking] = useState(false)
  const [hasPlan, setHasPlan] = useState(false)

  function handleGeneratePlan() {
    if (!prompt.trim()) {
      if (typeof window !== 'undefined') {
        window.alert('Please describe a change first.')
      }
      return
    }

    setIsThinking(true)

    // Simulate AI plan generation like the original script.
    setTimeout(() => {
      setIsThinking(false)
      setHasPlan(true)
    }, 1500)
  }

  const executeDisabled = !hasPlan

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
              <span className="text-sm font-medium text-white">payment-api</span>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs terminal-scrollbar">
            <div>
              <p className="text-white/40 mb-1">Branch</p>
              <p className="text-accent-lime">main</p>
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

        {/* CenterPanel - Input Area */}
        <section className="flex-1 flex flex-col gap-4" data-purpose="prompt-interface">
          <div className="flex-1 glass-panel flex flex-col overflow-hidden">
            <div className="flex items-center justify-between p-3 border-b border-white/5 bg-black/20">
              <div className="flex items-center gap-2">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500/50" />
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/50" />
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500/50" />
                </div>
                <span className="text-[10px] text-white/30 ml-4 font-mono uppercase tracking-widest">
                  Instruction_Console
                </span>
              </div>
              <span className="text-[10px] text-accent-lime/60">UTF-8</span>
            </div>
            <div className="flex-1 p-6 flex flex-col relative">
              <label className="text-sm text-accent-cyan mb-4 flex items-center gap-2">
                <span className="text-lg">&gt;</span> Describe your change:
              </label>
              <textarea
                id="ai-prompt-input"
                className="flex-1 bg-transparent border-none focus:ring-0 text-lg md:text-xl text-white resize-none placeholder-white/10 terminal-scrollbar"
                placeholder="Add rate limiting to login API..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
              />
              <div className="mt-6 flex justify-end">
                <button
                  id="generate-plan-btn"
                  onClick={handleGeneratePlan}
                  className="px-8 py-3 bg-accent-cyan/10 border border-accent-cyan text-accent-cyan rounded-md font-bold uppercase tracking-wider hover:bg-accent-cyan hover:text-black transition-all shadow-cyan-glow active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
                  disabled={isThinking}
                >
                  {isThinking ? 'Analyzing...' : hasPlan ? 'Regenerate Plan' : 'Generate AI Plan'}
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* RightPanel - AI Plan */}
        <aside className="w-80 glass-panel flex flex-col" data-purpose="ai-plan-output">
          <div className="p-4 border-b border-white/5 flex items-center justify-between">
            <h2 className="text-xs uppercase tracking-widest text-accent-cyan font-bold">
              AI Plan
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
          <div
            className="flex-1 p-4 overflow-y-auto terminal-scrollbar space-y-6"
            id="plan-container"
          >
            {!hasPlan && !isThinking && (
              <div
                className="h-full flex flex-col items-center justify-center text-center opacity-30"
                id="plan-empty"
              >
                <svg className="w-12 h-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                  />
                </svg>
                <p className="text-xs">
                  Describe a change to see the generation steps here.
                </p>
              </div>
            )}

            {hasPlan && (
              <div className="space-y-4" id="plan-steps">
                <div className="flex gap-4 items-start group">
                  <span className="w-6 h-6 rounded border border-accent-lime/30 bg-accent-lime/5 text-accent-lime flex items-center justify-center text-[10px] flex-shrink-0">
                    1
                  </span>
                  <div className="flex-1 border-b border-white/5 pb-3">
                    <h4 className="text-xs font-bold text-white mb-1">Create sandbox</h4>
                    <p className="text-[11px] text-white/40">
                      Initializing isolated cloud development environment.
                    </p>
                  </div>
                </div>
                <div className="flex gap-4 items-start group">
                  <span className="w-6 h-6 rounded border border-accent-lime/30 bg-accent-lime/5 text-accent-lime flex items-center justify-center text-[10px] flex-shrink-0">
                    2
                  </span>
                  <div className="flex-1 border-b border-white/5 pb-3">
                    <h4 className="text-xs font-bold text-white mb-1">Clone repository</h4>
                    <p className="text-[11px] text-white/40">
                      Fetching <span className="text-accent-cyan">payment-api:main</span>
                    </p>
                  </div>
                </div>
                <div className="flex gap-4 items-start group">
                  <span className="w-6 h-6 rounded border border-accent-lime/30 bg-accent-lime/5 text-accent-lime flex items-center justify-center text-[10px] flex-shrink-0">
                    3
                  </span>
                  <div className="flex-1 border-b border-white/5 pb-3">
                    <h4 className="text-xs font-bold text-white mb-1">Run AI coding agent</h4>
                    <p className="text-[11px] text-white/40">
                      Modifying <span className="text-accent-lime">auth.controller.ts</span> and{' '}
                      <span className="text-accent-lime">middleware/ratelimit.ts</span>
                    </p>
                  </div>
                </div>
                <div className="flex gap-4 items-start group">
                  <span className="w-6 h-6 rounded border border-white/10 text-white/40 flex items-center justify-center text-[10px] flex-shrink-0">
                    4
                  </span>
                  <div className="flex-1 border-b border-white/5 pb-3">
                    <h4 className="text-xs font-bold text-white mb-1">Commit changes</h4>
                    <p className="text-[11px] text-white/40">
                      Generating semantic commit message.
                    </p>
                  </div>
                </div>
                <div className="flex gap-4 items-start group">
                  <span className="w-6 h-6 rounded border border-white/10 text-white/40 flex items-center justify-center text-[10px] flex-shrink-0">
                    5
                  </span>
                  <div className="flex-1 border-b border-white/5 pb-3">
                    <h4 className="text-xs font-bold text-white mb-1">Push branch</h4>
                    <p className="text-[11px] text-white/40">
                      Target: <span className="text-accent-cyan">origin/feat-rate-limit</span>
                    </p>
                  </div>
                </div>
                <div className="flex gap-4 items-start group">
                  <span className="w-6 h-6 rounded border border-white/10 text-white/40 flex items-center justify-center text-[10px] flex-shrink-0">
                    6
                  </span>
                  <div className="flex-1">
                    <h4 className="text-xs font-bold text-white mb-1">Create Pull Request</h4>
                    <p className="text-[11px] text-white/40">
                      Review plan on GitHub/GitLab.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </aside>
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

