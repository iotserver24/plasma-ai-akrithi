import LoginForm from '@/components/LoginForm'

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center font-mono text-gray-300 relative overflow-hidden">
      {/* Background Layer */}
      <div className="fixed inset-0 grid-bg -z-10" data-purpose="grid-overlay" />
      <div className="fixed inset-0 bg-gradient-to-b from-transparent via-[#0B0F14]/50 to-[#0B0F14] -z-10" />
      <div className="scanline" />

      {/* Decorative Terminal Text (static) */}
      <div
        className="fixed top-6 left-6 text-xs text-[#00F3FF]/40 select-none"
        data-purpose="decorative-terminal"
      >
        <div className="mb-1">
          SYSTEM_BOOT: OK
          <br />
          CORE_AI_LOADED: 100%
          <br />
          AUTH_WAITING_INPUT...
        </div>
        <span className="cursor-block" />
      </div>

      {/* Login Container */}
      <section className="w-full max-w-md px-4" data-purpose="login-form-container">
        <div className="glass-card p-8 rounded-lg relative overflow-hidden">
          {/* Decorative corner accents */}
          <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-[#00F3FF]/50" />
          <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-[#00F3FF]/50" />
          <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-[#00F3FF]/50" />
          <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-[#00F3FF]/50" />

          {/* Header */}
          <header className="text-center mb-10" data-purpose="login-header">
            <h1 className="text-5xl font-bold text-[#00F3FF] tracking-tighter mb-2 italic">
              Plasma AI
            </h1>
            <p className="text-xs uppercase tracking-[0.3em] text-[#00F3FF]/60">
              Self Hosted AI Coding Agent
            </p>
          </header>

          {/* Form (reuses existing LoginForm behavior) */}
          <div data-purpose="auth-form">
            <LoginForm />
          </div>

          {/* Footer Info */}
          <footer className="mt-8 text-center" data-purpose="login-footer">
            <div className="inline-flex items-center gap-2 text-[10px] text-gray-500 font-mono">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500/50 animate-pulse" />
              Credentials verified against .env configuration
            </div>
          </footer>
        </div>

        {/* Decorative Bottom Text */}
        <div className="mt-6 text-[10px] text-[#00F3FF]/20 flex justify-between uppercase tracking-widest px-2">
          <span>SECURE_ENCLAVE_V.2.4</span>
          <span>NODE_STATUS: READY</span>
        </div>
      </section>
    </main>
  )
}
