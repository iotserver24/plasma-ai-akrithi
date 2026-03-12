'use client'

interface Props {
  value: string
  onChange: (v: string) => void
  onSubmit: () => void
  disabled: boolean
}

const EXAMPLE_PROMPTS = [
  'Add rate limiting middleware to this Express API',
  'Add input validation to all API endpoints',
  'Create a README.md with setup instructions',
  'Add error handling middleware with proper HTTP status codes',
]

export default function PromptInput({ value, onChange, onSubmit, disabled }: Props) {
  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && !disabled) {
      onSubmit()
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <textarea
        className="input-field resize-none h-28"
        placeholder="Describe the feature or change you want to implement..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
      />
      <div className="flex flex-wrap gap-1.5">
        {EXAMPLE_PROMPTS.map((p) => (
          <button
            key={p}
            onClick={() => onChange(p)}
            disabled={disabled}
            className="text-xs px-2.5 py-1 rounded-full border border-[#1e2535] text-gray-500 hover:text-gray-300 hover:border-[#00e5a0]/40 transition-colors disabled:opacity-30"
          >
            {p}
          </button>
        ))}
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-600">
          {disabled ? 'Agent is running...' : 'Ctrl+Enter to execute'}
        </span>
        <button
          onClick={onSubmit}
          disabled={disabled || !value.trim()}
          className="btn-primary"
        >
          {disabled ? (
            <>
              <span className="w-4 h-4 border-2 border-[#0d0f14] border-t-transparent rounded-full animate-spin" />
              Running...
            </>
          ) : (
            <>
              Execute
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
            </>
          )}
        </button>
      </div>
    </div>
  )
}
