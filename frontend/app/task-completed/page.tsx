export default function TaskCompletedPage() {
  return (
    <main
      className="bg-brand-dark text-slate-200 min-h-screen flex items-center justify-center p-4"
      data-purpose="completion-screen"
    >
      <div className="max-w-4xl w-full space-y-8">
        {/* HeaderSection */}
        <header className="text-center space-y-4" data-purpose="success-header">
          <div className="flex justify-center">
            {/* Success Animation Icon */}
            <svg
              className="w-20 h-20 text-brand-lime"
              fill="none"
              stroke="currentColor"
              strokeWidth={3}
              viewBox="0 0 52 52"
            >
              <circle className="opacity-20" cx="26" cy="26" r="24" />
              <path
                className="animate-checkmark"
                d="M14.1 27.2l7.1 7.2 16.7-16.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-white">
            AI Task Completed Successfully
          </h1>
          <p className="text-slate-400 font-mono text-sm tracking-widest uppercase">
            Pull Request Generated
          </p>
        </header>

        {/* StatsSummary */}
        <section className="grid grid-cols-1 md:grid-cols-4 gap-4" data-purpose="pr-summary">
          {/* Branch Info */}
          <div className="glass-panel p-4 rounded-xl flex flex-col justify-center">
            <span className="text-xs text-brand-cyan font-mono mb-1">BRANCH</span>
            <span className="font-mono text-sm truncate">fixai/add-rate-limit</span>
          </div>

          {/* Files Changed */}
          <div className="glass-panel p-4 rounded-xl flex flex-col justify-center text-center">
            <span className="text-xs text-slate-400 font-mono mb-1">FILES</span>
            <span className="text-xl font-bold">4</span>
          </div>

          {/* Additions */}
          <div className="glass-panel p-4 rounded-xl flex flex-col justify-center text-center border-l-4 border-l-brand-lime">
            <span className="text-xs text-brand-lime font-mono mb-1">ADDITIONS</span>
            <span className="text-xl font-bold">+92</span>
          </div>

          {/* Deletions */}
          <div className="glass-panel p-4 rounded-xl flex flex-col justify-center text-center border-l-4 border-l-red-500">
            <span className="text-xs text-red-400 font-mono mb-1">REMOVALS</span>
            <span className="text-xl font-bold">-15</span>
          </div>
        </section>

        {/* CodeDiffPreview */}
        <section
          className="glass-panel rounded-xl overflow-hidden shadow-2xl"
          data-purpose="diff-viewer"
        >
          <div className="bg-slate-800/50 px-4 py-2 border-b border-white/5 flex items-center justify-between">
            <span className="text-xs font-mono text-slate-400">
              src/middleware/rate-limiter.ts
            </span>
            <div className="flex space-x-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-slate-600" />
              <div className="w-2.5 h-2.5 rounded-full bg-slate-600" />
              <div className="w-2.5 h-2.5 rounded-full bg-slate-600" />
            </div>
          </div>
          <div className="p-6 font-mono text-sm overflow-x-auto leading-relaxed">
            <div className="opacity-50">@@ -12,4 +12,18 @@</div>
            <div className="flex">
              <span className="w-8 text-slate-600 select-none">12</span>
              <span className="text-slate-300"> export const apiRouter = Router();</span>
            </div>
            <div className="flex bg-red-900/30 text-red-200">
              <span className="w-8 text-red-400/50 select-none">-</span>
              <span> apiRouter.use(authMiddleware);</span>
            </div>
            <div className="flex bg-brand-lime/10 text-brand-lime">
              <span className="w-8 text-brand-lime/50 select-none">+</span>
              <span> const limiter = new RateLimiter(&#123; window: 60000, max: 100 &#125;);</span>
            </div>
            <div className="flex bg-brand-lime/10 text-brand-lime">
              <span className="w-8 text-brand-lime/50 select-none">+</span>
              <span> apiRouter.use(limiter.middleware);</span>
            </div>
            <div className="flex bg-brand-lime/10 text-brand-lime">
              <span className="w-8 text-brand-lime/50 select-none">+</span>
              <span> apiRouter.use(authMiddleware);</span>
            </div>
            <div className="flex">
              <span className="w-8 text-slate-600 select-none">16</span>
              <span className="text-slate-300"> export default apiRouter;</span>
            </div>
          </div>
        </section>

        {/* FooterActions */}
        <footer
          className="flex flex-col items-center space-y-6"
          data-purpose="action-buttons"
        >
          <button
            className="w-full md:w-auto px-12 py-4 bg-brand-cyan hover:bg-cyan-500 text-brand-dark font-bold rounded-lg transition-all transform hover:scale-105 shadow-[0_0_20px_rgba(6,182,212,0.3)]"
            type="button"
          >
            View Pull Request
          </button>
          <div className="flex items-center space-x-2 text-slate-500 text-sm bg-slate-800/30 px-4 py-2 rounded-full border border-white/5">
            {/* Security Shield Icon */}
            <svg
              className="w-4 h-4 text-brand-cyan"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
              />
            </svg>
            <span className="font-mono">Running in isolated sandbox environment</span>
          </div>
        </footer>
      </div>
    </main>
  )
}

