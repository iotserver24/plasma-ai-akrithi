'use client'

import { useEffect, useRef, useState } from 'react'

interface StoredRepo {
  name: string
  full_name: string
  default_branch?: string
}

export default function MissionControlPage() {
  const terminalRef = useRef<HTMLDivElement | null>(null)
  const [repoName, setRepoName] = useState<string | null>(null)
  const [branchName, setBranchName] = useState<string | null>(null)
  const [repoFullName, setRepoFullName] = useState<string | null>(null)

  // Scroll the terminal content to the bottom once on mount for a "live log" feel.
  useEffect(() => {
    const el = terminalRef.current
    if (el) {
      el.scrollTop = el.scrollHeight
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const stored = window.localStorage.getItem('selectedRepo')
    if (!stored) return
    try {
      const parsed: StoredRepo = JSON.parse(stored)
      setRepoName(parsed.name || parsed.full_name || null)
      setBranchName(parsed.default_branch || null)
      setRepoFullName(parsed.full_name || null)
    } catch {
      // ignore parse errors; keep defaults
    }
  }, [])

  return (
    <main className="bg-fixai-bg text-gray-300 font-mono min-h-screen overflow-hidden selection:bg-fixai-cyan selection:text-black">
      {/* Main Dashboard Layout */}
      <div className="h-screen w-full p-4 sm:p-6 flex flex-col gap-6 relative overflow-hidden">
        {/* Decorative Scanline Overlay */}
        <div className="pointer-events-none absolute inset-0 w-full h-full z-50 opacity-[0.03] overflow-hidden">
          <div className="w-full h-1 bg-white animate-scanline" />
        </div>

        {/* Header Section */}
        <header
          className="glass-panel rounded-lg p-4 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 glow-border-cyan"
          data-purpose="mission-control-header"
        >
          <div className="flex items-center gap-4 sm:gap-6 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-fixai-cyan rounded-full animate-pulse" />
              <h1 className="text-xl font-bold tracking-widest text-white uppercase">
                FixAI Mission Control
              </h1>
            </div>
            <div className="h-8 w-px bg-gray-700" />
            <div className="flex flex-col">
              <span className="text-[10px] text-gray-500 uppercase">Active Task</span>
              <span className="text-fixai-cyan font-semibold">
                {repoName && branchName
                  ? `Task: Analyze ${repoName}:${branchName}`
                  : 'Task: AI execution'}
              </span>
            </div>
          </div>
          <div className="flex gap-3 flex-wrap">
            {/* Status Badges */}
            <div className="flex items-center gap-2 px-3 py-1 bg-black/40 border border-fixai-lime/40 rounded text-xs">
              <span className="text-fixai-lime">✓</span>
              <span className="text-gray-400">Sandbox Agent</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1 bg-black/40 border border-fixai-cyan/40 rounded text-xs animate-pulse-cyan">
              <span className="w-2 h-2 rounded-full bg-fixai-cyan" />
              <span className="text-white">Code Agent: Running</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1 bg-black/40 border border-gray-700 rounded text-xs opacity-60">
              <span className="w-2 h-2 rounded-full bg-gray-500" />
              <span className="text-gray-500">Git Agent: Waiting</span>
            </div>
          </div>
        </header>

        <div className="flex flex-1 gap-6 min-h-0 flex-col lg:flex-row">
          {/* Center Content Area */}
          <section className="flex-1 flex flex-col gap-6 min-w-0">
            {/* Pipeline Visualizer */}
            <div
              className="glass-panel rounded-lg p-4 sm:p-8 flex flex-col justify-center items-center relative overflow-x-auto"
              data-purpose="pipeline-container"
            >
              <div className="w-full min-w-[720px] flex justify-between items-center relative">
                {/* Connection Lines */}
                <div className="absolute top-1/2 left-0 w-full h-[2px] bg-gray-800 -translate-y-1/2 z-0" />
                {/* Completed Line Progress */}
                <div className="absolute top-1/2 left-0 w-[42%] h-[2px] bg-fixai-lime -translate-y-1/2 z-10 shadow-[0_0_10px_#afff33]" />
                {/* Active Line Progress */}
                <div className="absolute top-1/2 left-[42%] w-[12%] h-[2px] bg-fixai-cyan -translate-y-1/2 z-10 animate-pulse-cyan" />

                {/* Phase 1: Completed */}
                <div className="flex flex-col items-center gap-4 z-20 w-32">
                  <div className="w-10 h-10 rounded-full bg-fixai-lime flex items-center justify-center text-black border-4 border-fixai-bg">
                    <svg
                      className="h-6 w-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M5 13l4 4L19 7"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={3}
                      />
                    </svg>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] font-bold text-fixai-lime">SUCCESS</p>
                    <p className="text-xs font-semibold text-white">Create Sandbox</p>
                    <p className="text-[9px] text-gray-500">1.2s</p>
                  </div>
                </div>

                {/* Phase 2: Completed */}
                <div className="flex flex-col items-center gap-4 z-20 w-32">
                  <div className="w-10 h-10 rounded-full bg-fixai-lime flex items-center justify-center text-black border-4 border-fixai-bg">
                    <svg
                      className="h-6 w-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M5 13l4 4L19 7"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={3}
                      />
                    </svg>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] font-bold text-fixai-lime">SUCCESS</p>
                    <p className="text-xs font-semibold text-white">Clone Repo</p>
                    <p className="text-[9px] text-gray-500">4.8s</p>
                  </div>
                </div>

                {/* Phase 3: Running */}
                <div className="flex flex-col items-center gap-4 z-20 w-32">
                  <div className="w-12 h-12 rounded-full bg-black border-2 border-fixai-cyan flex items-center justify-center shadow-[0_0_15px_rgba(0,242,255,0.4)] animate-pulse-cyan z-30">
                    <svg
                      className="h-6 w-6 text-fixai-cyan animate-spin"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                      />
                    </svg>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] font-bold text-fixai-cyan animate-pulse">
                      RUNNING
                    </p>
                    <p className="text-xs font-semibold text-white">Run AI Agent</p>
                    <p className="text-[9px] text-gray-400">0.45s...</p>
                  </div>
                </div>

                {/* Phase 4: Pending */}
                <div className="flex flex-col items-center gap-4 z-20 w-32 opacity-40">
                  <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center text-gray-500 border-4 border-fixai-bg">
                    <span className="text-sm font-bold">4</span>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] font-bold">WAITING</p>
                    <p className="text-xs font-semibold">Apply Patch</p>
                  </div>
                </div>

                {/* Phase 5: Pending */}
                <div className="flex flex-col items-center gap-4 z-20 w-32 opacity-40">
                  <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center text-gray-500 border-4 border-fixai-bg">
                    <span className="text-sm font-bold">5</span>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] font-bold">WAITING</p>
                    <p className="text-xs font-semibold">Commit &amp; Push</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Terminal Window */}
            <div
              className="flex-1 glass-panel rounded-lg border-t-2 border-gray-700 flex flex-col overflow-hidden"
              data-purpose="terminal-window"
            >
              <div className="bg-black/80 px-4 py-2 flex items-center justify-between border-b border-white/5">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-500/50" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
                    <div className="w-3 h-3 rounded-full bg-green-500/50" />
                  </div>
                  <span className="ml-4 text-[10px] text-gray-500 font-bold tracking-widest uppercase">
                    Console - fixai_execution.log
                  </span>
                </div>
                <div className="text-[10px] text-gray-600">STDOUT / STDERR</div>
              </div>
              <div
                ref={terminalRef}
                className="flex-1 p-4 font-mono text-sm terminal-scroll overflow-y-auto bg-black/40"
              >
                <p className="text-gray-500 mb-1">
                  [2024-05-20 14:02:11]{' '}
                  <span className="text-fixai-lime">INFO</span> Initializing environment...
                </p>
                <p className="text-gray-500 mb-1">
                  [2024-05-20 14:02:12]{' '}
                  <span className="text-fixai-lime">INFO</span> Sandbox container id:{' '}
                  <span className="text-yellow-400">sha256:8f4c2...</span>
                </p>
                <p className="text-white mb-1">
                  <span className="text-fixai-cyan">$</span> creating sandbox...
                </p>
                <p className="text-gray-500 mb-1">
                  [2024-05-20 14:02:15]{' '}
                  <span className="text-fixai-lime">INFO</span> Repository cloned to
                  {' /tmp/'}{repoName || 'repo'}
                </p>
                <p className="text-white mb-1">
                  <span className="text-fixai-cyan">$</span> git clone{' '}
                  {repoFullName ? `https://github.com/${repoFullName}.git` : 'https://github.com/org/project.git'}
                </p>
                <p className="text-white mb-1">
                  <span className="text-fixai-cyan">$</span> npm install --silent
                </p>
                <p className="text-gray-500 mb-1">
                  [2024-05-20 14:02:45]{' '}
                  <span className="text-fixai-lime">INFO</span> Dependencies installed successfully.
                </p>
                <p className="text-white mb-1">
                  <span className="text-fixai-cyan">$</span> fixai-agent --task &quot;Add rate
                  limiting to /api/auth&quot; --model &quot;gpt-4-turbo&quot;
                </p>
                <p className="text-fixai-cyan mb-1 ml-4">&gt; Analyzing codebase structure...</p>
                <p className="text-fixai-cyan mb-1 ml-4">
                  &gt; Identified middleware injection point:
                  {' server/middleware/rate-limiter.ts'}
                </p>
                <p className="text-fixai-cyan mb-1 ml-4">
                  &gt; Generating security implementation strategies...
                </p>
                <p className="text-fixai-cyan mb-1 ml-4 animate-pulse">&gt; Thinking...</p>
              </div>
            </div>
          </section>

          {/* Side Panel */}
          <aside className="w-full lg:w-80 flex flex-col gap-6" data-purpose="metrics-sidebar">
            {/* AI Confidence Chart */}
            <div className="glass-panel rounded-lg p-6 glow-border-lime flex flex-col items-center">
              <h3 className="text-[10px] text-gray-500 uppercase font-bold self-start mb-6 tracking-wider">
                AI Confidence Score
              </h3>
              <div className="relative flex items-center justify-center">
                {/* SVG Radial Progress */}
                <svg className="w-40 h-40 transform -rotate-90">
                  <circle
                    className="text-gray-800"
                    cx="80"
                    cy="80"
                    fill="transparent"
                    r="70"
                    stroke="currentColor"
                    strokeWidth={8}
                  />
                  <circle
                    className="text-fixai-lime shadow-[0_0_15px_#afff33]"
                    cx="80"
                    cy="80"
                    fill="transparent"
                    r="70"
                    stroke="currentColor"
                    strokeDasharray="440"
                    strokeDashoffset="44"
                    strokeWidth={8}
                  />
                </svg>
                <div className="absolute flex flex-col items-center">
                  <span className="text-4xl font-bold text-white">94%</span>
                  <span className="text-[10px] text-fixai-lime font-bold">OPTIMAL</span>
                </div>
              </div>
              <div className="mt-8 w-full grid grid-cols-2 gap-4">
                <div className="bg-black/40 p-2 rounded border border-white/5">
                  <p className="text-[9px] text-gray-500 uppercase">Context Coverage</p>
                  <p className="text-sm font-bold text-white">100%</p>
                </div>
                <div className="bg-black/40 p-2 rounded border border-white/5">
                  <p className="text-[9px] text-gray-500 uppercase">Risk Level</p>
                  <p className="text-sm font-bold text-green-400">LOW</p>
                </div>
              </div>
            </div>

            {/* Environment Resources */}
            <div className="glass-panel rounded-lg p-6 flex-1 flex flex-col">
              <h3 className="text-[10px] text-gray-500 uppercase font-bold mb-4 tracking-wider">
                Environment Resources
              </h3>
              <div className="space-y-4">
                {/* CPU */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px]">
                    <span className="text-gray-400">CPU LOAD</span>
                    <span className="text-white">42.8%</span>
                  </div>
                  <div className="w-full h-1 bg-gray-800 rounded-full overflow-hidden">
                    <div className="h-full bg-fixai-cyan w-[42.8%] shadow-[0_0_8px_rgba(0,242,255,0.5)]" />
                  </div>
                </div>

                {/* RAM */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px]">
                    <span className="text-gray-400">MEM ALLOC</span>
                    <span className="text-white">1.2GB / 4.0GB</span>
                  </div>
                  <div className="w-full h-1 bg-gray-800 rounded-full overflow-hidden">
                    <div className="h-full bg-fixai-cyan w-[30%] shadow-[0_0_8px_rgba(0,242,255,0.5)]" />
                  </div>
                </div>

                {/* Network */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px]">
                    <span className="text-gray-400">NET TRAFFIC</span>
                    <span className="text-white">128 KB/s</span>
                  </div>
                  <div className="w-full h-1 bg-gray-800 rounded-full overflow-hidden">
                    <div className="h-full bg-gray-500 w-[15%]" />
                  </div>
                </div>
              </div>

              {/* Sidebar Footer */}
              <div className="mt-auto pt-6 border-t border-white/5 space-y-4">
                <div className="flex flex-col gap-2">
                  <button
                    className="w-full py-2 bg-red-950/30 border border-red-500/50 text-red-500 text-[10px] font-bold uppercase hover:bg-red-900/40 transition-all rounded"
                    type="button"
                  >
                    Abort Execution
                  </button>
                  <button
                    className="w-full py-2 bg-fixai-cyan/10 border border-fixai-cyan/50 text-fixai-cyan text-[10px] font-bold uppercase hover:bg-fixai-cyan/20 transition-all rounded"
                    type="button"
                  >
                    View Workspace
                  </button>
                </div>
                <p className="text-[9px] text-gray-600 text-center italic">
                  Node: us-west-2-exec-04
                </p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  )
}

