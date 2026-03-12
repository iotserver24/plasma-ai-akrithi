'use client'

type PromptBoxProps = {
  prompt: string
  onPromptChange: (value: string) => void
  onExecute: () => void
  loading: boolean
}

export default function PromptBox({
  prompt,
  onPromptChange,
  onExecute,
  loading,
}: PromptBoxProps) {
  return (
    <div className="space-y-3">
      <textarea
        value={prompt}
        onChange={(e) => onPromptChange(e.target.value)}
        placeholder="Describe the change you want the AI to implement"
        rows={5}
        className="w-full input-field min-h-[120px]"
      />
      <button
        onClick={onExecute}
        disabled={loading}
        className="btn-primary"
      >
        {loading ? 'Executing...' : 'Execute'}
      </button>
    </div>
  )
}

