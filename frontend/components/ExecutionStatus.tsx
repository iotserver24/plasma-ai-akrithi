'use client'

type Stage = 'idle' | 'sandbox' | 'clone' | 'agent' | 'commit' | 'pr' | 'done' | 'error'

interface Props {
  stage: Stage
}

const STEPS: { key: Stage; label: string }[] = [
  { key: 'sandbox', label: 'Create Sandbox' },
  { key: 'clone', label: 'Clone Repo' },
  { key: 'agent', label: 'Run Claude' },
  { key: 'commit', label: 'Commit & Push' },
  { key: 'pr', label: 'Create PR' },
  { key: 'done', label: 'Done' },
]

const stageOrder: Stage[] = ['idle', 'sandbox', 'clone', 'agent', 'commit', 'pr', 'done', 'error']

function stageIndex(s: Stage) {
  return stageOrder.indexOf(s)
}

export default function ExecutionStatus({ stage }: Props) {
  if (stage === 'idle') return null

  return (
    <div className="flex items-center gap-0">
      {STEPS.map((step, i) => {
        const stepIdx = stageIndex(step.key)
        const currentIdx = stageIndex(stage)
        const isDone = stepIdx < currentIdx || stage === 'done'
        const isActive = step.key === stage
        const isError = stage === 'error' && isActive

        return (
          <div key={step.key} className="flex items-center">
            <div className="flex flex-col items-center gap-1">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${
                  isDone
                    ? 'bg-[#00e5a0] border-[#00e5a0] text-[#0d0f14]'
                    : isError
                    ? 'bg-red-500/20 border-red-500 text-red-400'
                    : isActive
                    ? 'bg-[#00e5a0]/20 border-[#00e5a0] text-[#00e5a0] animate-pulse'
                    : 'bg-transparent border-[#1e2535] text-gray-600'
                }`}
              >
                {isDone ? (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : isError ? (
                  '✕'
                ) : (
                  i + 1
                )}
              </div>
              <span
                className={`text-[10px] whitespace-nowrap ${
                  isDone ? 'text-[#00e5a0]' : isActive ? 'text-gray-300' : 'text-gray-600'
                }`}
              >
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={`h-0.5 w-8 mb-4 mx-0.5 transition-all ${
                  stepIdx < currentIdx ? 'bg-[#00e5a0]' : 'bg-[#1e2535]'
                }`}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
