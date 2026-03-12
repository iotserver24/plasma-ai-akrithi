import LoginForm from '@/components/LoginForm'

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo / Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-[#00e5a0] to-[#00b87a] mb-4 shadow-lg shadow-[#00e5a0]/20">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#0d0f14" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="16 18 22 12 16 6" />
              <polyline points="8 6 2 12 8 18" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Plasma AI</h1>
          <p className="text-sm text-gray-500 mt-1">AI coding agent for GitHub</p>
        </div>

        <div className="card">
          <h2 className="text-lg font-semibold mb-5">Sign in to continue</h2>
          <LoginForm />
        </div>

        <p className="text-center text-xs text-gray-600 mt-6">
          Prompt → AI edits repo → Pull Request, automatically.
        </p>
      </div>
    </main>
  )
}
