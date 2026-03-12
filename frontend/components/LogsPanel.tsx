'use client'
import { useEffect, useRef } from 'react'

type LogLine = {
  type: 'log' | 'error' | 'warning'
  text: string
  ts: number
}

type Props = {
  logs?: string[]
  prUrl?: string | null
  loading?: boolean
  lines?: LogLine[]
}

export default function LogsPanel({ logs, prUrl, loading, lines }: Props) {
  if (lines) {
    const bottomRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [lines])

    return (
      <div className="terminal bg-[#0a0c10] border border-[#1e2535] rounded-xl p-4 h-72 overflow-y-auto">
        {lines.length === 0 ? (
          <span className="text-gray-600">Waiting for execution to start...</span>
        ) : (
          lines.map((line, i) => (
            <div
              key={i}
              className={`leading-relaxed ${
                line.type === 'error'
                  ? 'text-red-400'
                  : line.type === 'warning'
                  ? 'text-yellow-400'
                  : line.text.startsWith('[Claude]')
                  ? 'text-[#00e5a0]'
                  : line.text.startsWith('[stderr]')
                  ? 'text-orange-400'
                  : 'text-gray-300'
              }`}
            >
              <span className="text-gray-600 select-none mr-2">
                {new Date(line.ts).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                })}
              </span>
              {line.text}
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>
    )
  }

  if (loading) {
    return <div>AI is analyzing repository...</div>
  }

  return (
    <div className="space-y-3">
      {logs.length === 0 ? (
        <div>No execution yet.</div>
      ) : (
        <ul className="space-y-1">
          {logs.map((log, index) => (
            <li key={index}>{log}</li>
          ))}
        </ul>
      )}

      {prUrl && (
        <div className="space-y-1">
          <div>Pull Request Created:</div>
          <a
            href={prUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 underline break-all"
          >
            {prUrl}
          </a>
        </div>
      )}
    </div>
  )
}
