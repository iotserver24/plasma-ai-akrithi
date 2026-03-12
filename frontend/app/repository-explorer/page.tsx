export default function RepositoryExplorerPage() {
  return (
    <div className="h-screen flex flex-col overflow-hidden bg-fixai-bg">
      {/* Top Navigation Bar */}
      <nav
        className="h-14 border-b border-fixai-border bg-fixai-bg flex items-center justify-between px-4 z-50"
        data-purpose="top-navigation"
      >
        <div className="flex items-center gap-8">
          {/* Logo Section */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-fixai-cyan rounded flex items-center justify-center shadow-[0_0_10px_rgba(0,240,255,0.5)]">
              <span className="text-fixai-bg font-bold text-xl">F</span>
            </div>
            <span className="text-xl font-semibold tracking-tight text-white font-mono">
              Fix<span className="text-fixai-cyan">AI</span>
            </span>
          </div>
          {/* Search Input */}
          <div className="relative w-96">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg
                className="h-4 w-4 text-gray-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                />
              </svg>
            </div>
            <input
              className="block w-full pl-10 pr-3 py-1.5 bg-fixai-panel border border-fixai-border rounded-md text-sm text-gray-300 focus:ring-1 focus:ring-fixai-cyan focus:border-fixai-cyan transition-all outline-none"
              placeholder="Search repositories..."
              type="text"
            />
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button className="p-2 text-gray-400 hover:text-fixai-cyan" type="button">
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
              />
            </svg>
          </button>
          <div className="flex items-center gap-2 pl-4 border-l border-fixai-border">
            <div className="text-right">
              <p className="text-xs font-medium text-white">dev_alex</p>
              <p className="text-[10px] text-fixai-cyan uppercase tracking-wider">Pro Tier</p>
            </div>
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-fixai-cyan to-blue-500 p-[1px]">
              <div className="w-full h-full rounded-full bg-fixai-bg flex items-center justify-center overflow-hidden">
                <span className="text-xs font-mono">AX</span>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        <aside
          className="w-64 bg-fixai-panel border-r border-fixai-border flex flex-col"
          data-purpose="left-sidebar"
        >
          <div className="p-4 border-b border-fixai-border flex justify-between items-center">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
              Repositories
            </h2>
            <button className="text-gray-400 hover:text-fixai-cyan" type="button">
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  d="M12 4v16m8-8H4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                />
              </svg>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar py-2">
            {/* Explorer Items */}
            <div className="sidebar-item px-4 py-2 flex items-center gap-3 cursor-pointer group">
              <svg
                className="w-4 h-4 text-gray-500 group-hover:text-fixai-cyan"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" />
              </svg>
              <span className="text-sm font-mono text-gray-300">core-engine-v2</span>
            </div>
            <div className="sidebar-item px-4 py-2 flex items-center gap-3 cursor-pointer group bg-fixai-cyan/5">
              <svg
                className="w-4 h-4 text-fixai-cyan"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                />
              </svg>
              <span className="text-sm font-mono text-fixai-cyan">fixai-webapp</span>
            </div>
            <div className="sidebar-item px-4 py-2 flex items-center gap-3 cursor-pointer group">
              <svg
                className="w-4 h-4 text-gray-500"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" />
              </svg>
              <span className="text-sm font-mono text-gray-300">auth-service</span>
            </div>
            <div className="sidebar-item px-4 py-2 flex items-center gap-3 cursor-pointer group">
              <svg
                className="w-4 h-4 text-gray-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                />
              </svg>
              <span className="text-sm font-mono text-gray-300">ml-inference</span>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main
          className="flex-1 overflow-y-auto custom-scrollbar p-6"
          data-purpose="main-content"
        >
          <header className="mb-8">
            <h1 className="text-2xl font-bold text-white mb-2">Repository Explorer</h1>
            <p className="text-gray-400 text-sm">
              Select a repository to start debugging with AI assistance.
            </p>
          </header>

          {/* Repository Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {/* Repo Card 1 */}
            <div className="glass-card p-5 rounded-lg flex flex-col justify-between h-56">
              <div>
                <div className="flex justify-between items-start mb-4">
                  <h3 className="font-mono text-lg text-fixai-cyan font-semibold">
                    fixai-webapp
                  </h3>
                  <span className="text-[10px] px-2 py-0.5 border border-fixai-cyan/30 text-fixai-cyan rounded-full uppercase tracking-widest">
                    Public
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-400 mb-2">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> TypeScript
                  </span>
                  <span>Updated 2h ago</span>
                </div>
                <p className="text-sm text-gray-500 line-clamp-2">
                  Main frontend application built with React and TailwindCSS.
                </p>
              </div>
              <button
                className="w-full mt-4 py-2 bg-fixai-cyan/10 hover:bg-fixai-cyan/20 border border-fixai-cyan/30 text-fixai-cyan text-sm font-semibold rounded transition-colors"
                type="button"
              >
                Select Repository
              </button>
            </div>

            {/* Repo Card 2 */}
            <div className="glass-card p-5 rounded-lg flex flex-col justify-between h-56">
              <div>
                <div className="flex justify-between items-start mb-4">
                  <h3 className="font-mono text-lg text-white font-semibold">core-engine-v2</h3>
                  <span className="text-[10px] px-2 py-0.5 border border-gray-600 text-gray-400 rounded-full uppercase tracking-widest">
                    Private
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-400 mb-2">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-yellow-600" /> Python
                  </span>
                  <span>Updated 1d ago</span>
                </div>
                <p className="text-sm text-gray-500 line-clamp-2">
                  Core AI processing engine and LLM orchestrator service.
                </p>
              </div>
              <button
                className="w-full mt-4 py-2 bg-fixai-cyan/10 hover:bg-fixai-cyan/20 border border-fixai-cyan/30 text-fixai-cyan text-sm font-semibold rounded transition-colors"
                type="button"
              >
                Select Repository
              </button>
            </div>

            {/* Repo Card 3 */}
            <div className="glass-card p-5 rounded-lg flex flex-col justify-between h-56">
              <div>
                <div className="flex justify-between items-start mb-4">
                  <h3 className="font-mono text-lg text-white font-semibold">auth-service</h3>
                  <span className="text-[10px] px-2 py-0.5 border border-gray-600 text-gray-400 rounded-full uppercase tracking-widest">
                    Private
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-400 mb-2">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-orange-600" /> Rust
                  </span>
                  <span>Updated 3d ago</span>
                </div>
                <p className="text-sm text-gray-500 line-clamp-2">
                  High-performance authentication and authorization middleware.
                </p>
              </div>
              <button
                className="w-full mt-4 py-2 bg-fixai-cyan/10 hover:bg-fixai-cyan/20 border border-fixai-cyan/30 text-fixai-cyan text-sm font-semibold rounded transition-colors"
                type="button"
              >
                Select Repository
              </button>
            </div>

            {/* Repo Card 4 */}
            <div className="glass-card p-5 rounded-lg flex flex-col justify-between h-56">
              <div>
                <div className="flex justify-between items-start mb-4">
                  <h3 className="font-mono text-lg text-white font-semibold">ml-inference</h3>
                  <span className="text-[10px] px-2 py-0.5 border border-fixai-cyan/30 text-fixai-cyan rounded-full uppercase tracking-widest">
                    Public
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-400 mb-2">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-400" /> Python
                  </span>
                  <span>Updated 5d ago</span>
                </div>
                <p className="text-sm text-gray-500 line-clamp-2">
                  Model deployment and inference utilities for machine learning pipelines.
                </p>
              </div>
              <button
                className="w-full mt-4 py-2 bg-fixai-cyan/10 hover:bg-fixai-cyan/20 border border-fixai-cyan/30 text-fixai-cyan text-sm font-semibold rounded transition-colors"
                type="button"
              >
                Select Repository
              </button>
            </div>
          </div>
        </main>

        {/* Right Sidebar */}
        <aside
          className="w-80 bg-fixai-panel border-l border-fixai-border p-6 flex flex-col gap-8"
          data-purpose="right-sidebar"
        >
          <div>
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-6">
              Repository Stats
            </h2>
            <div className="space-y-6">
              <div className="flex flex-col gap-1" data-purpose="stat-item">
                <span className="text-xs text-gray-500">Selected Repository</span>
                <span className="text-sm font-mono text-fixai-cyan">fixai-webapp</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-fixai-bg/50 p-3 rounded border border-fixai-border">
                  <p className="text-[10px] text-gray-500 uppercase">Active Issues</p>
                  <p className="text-xl font-mono text-white">24</p>
                </div>
                <div className="bg-fixai-bg/50 p-3 rounded border border-fixai-border">
                  <p className="text-[10px] text-gray-500 uppercase">Contributors</p>
                  <p className="text-xl font-mono text-white">12</p>
                </div>
                <div className="bg-fixai-bg/50 p-3 rounded border border-fixai-border">
                  <p className="text-[10px] text-gray-500 uppercase">Files</p>
                  <p className="text-xl font-mono text-white">842</p>
                </div>
                <div className="bg-fixai-bg/50 p-3 rounded border border-fixai-border">
                  <p className="text-[10px] text-gray-500 uppercase">Pull Requests</p>
                  <p className="text-xl font-mono text-white">3</p>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-fixai-border pt-6">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">
              Active Contributors
            </h2>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded bg-gray-700 flex items-center justify-center text-[10px] font-mono">
                  JD
                </div>
                <span className="text-sm text-gray-300">john_doe</span>
                <span className="ml-auto text-[10px] text-fixai-cyan">42 commits</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded bg-gray-700 flex items-center justify-center text-[10px] font-mono">
                  SM
                </div>
                <span className="text-sm text-gray-300">sarah_m</span>
                <span className="ml-auto text-[10px] text-fixai-cyan">18 commits</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded bg-gray-700 flex items-center justify-center text-[10px] font-mono">
                  RK
                </div>
                <span className="text-sm text-gray-300">ryan_k</span>
                <span className="ml-auto text-[10px] text-fixai-cyan">12 commits</span>
              </div>
            </div>
          </div>

          <div className="mt-auto">
            <div className="bg-fixai-cyan/5 border border-fixai-cyan/20 p-4 rounded-lg">
              <h4 className="text-xs font-semibold text-fixai-cyan mb-2">AI Insights</h4>
              <p className="text-[11px] text-gray-400 leading-relaxed">
                Your most active repo <span className="text-white">fixai-webapp</span> has 4
                critical performance bottlenecks detected in the last commit.
              </p>
              <button
                className="mt-3 text-[11px] font-bold text-fixai-cyan hover:underline uppercase tracking-tighter"
                type="button"
              >
                View Report
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}

