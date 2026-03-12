'use client'
import { useEffect, useRef } from 'react'

interface LogLine {
  type: 'log' | 'error' | 'warning'
  text: string
  ts: number
}

interface Props {
  lines: LogLine[]
}

export default function LogsPanel({ lines }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [lines])

  function lineColor(type: LogLine['type']) {
    if (type === 'error') return 'text-red-400'
    if (type === 'warning') return 'text-yellow-400'
    if (/ \[Claude\] /.test(lines[0]?.text ?? '')) return 'text-[#00e5a0]'
    return 'text-gray-300'
  }

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
              {new Date(line.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
            {line.text}
          </div>
        ))
      )}
      <div ref={bottomRef} />
    </div>
  )
}
