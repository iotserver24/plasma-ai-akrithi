'use client'
import { useState } from 'react'
import RepoSelector from '@/components/RepoSelector'
import PromptBox from '@/components/PromptBox'
import LogsPanel from '@/components/LogsPanel'

type Repo = {
  name: string
}

export default function DashboardPage() {
  const [repos, setRepos] = useState<Repo[]>([])
  const [selectedRepo, setSelectedRepo] = useState<string | null>(null)
  const [prompt, setPrompt] = useState('')
  const [logs, setLogs] = useState<string[]>([])
  const [prUrl, setPrUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleFetchRepos() {
    try {
      const res = await fetch('http://localhost:3001/repos')
      if (!res.ok) {
        console.error('Failed to fetch repos')
        return
      }
      const data: Repo[] = await res.json()
      setRepos(data)
    } catch (err) {
      console.error('Error fetching repos', err)
    }
  }

  async function handleCloneRepo() {
    if (!selectedRepo) {
      alert('Please select a repository first.')
      return
    }

    try {
      const res = await fetch('http://localhost:3001/clone', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ repo: selectedRepo }),
      })

      if (!res.ok) {
        alert('Failed to clone repository.')
      } else {
        alert(`Repository "${selectedRepo}" cloned successfully.`)
      }
    } catch (err) {
      console.error('Error cloning repository', err)
      alert('Failed to clone repository.')
    }
  }

  async function handleExecute() {
    if (!prompt.trim()) {
      alert('Please enter a prompt.')
      return
    }

    setLoading(true)
    setLogs([])
    setPrUrl(null)

    try {
      const res = await fetch('http://localhost:3001/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt }),
      })

      if (!res.ok) {
        setLogs(['Execution failed. Please try again.'])
        return
      }

      const data: { logs: string[]; pr_url?: string } = await res.json()
      setLogs(data.logs || [])
      setPrUrl(data.pr_url || null)
    } catch (err) {
      console.error('Error executing prompt', err)
      setLogs(['Execution failed. Please try again.'])
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex flex-col">
      <header className="border-b border-[#1e2535] px-6 py-4 flex items-center justify-between">
        <h1 className="font-bold text-lg">AI Coding Agent Dashboard</h1>
      </header>

      <div className="flex-1 max-w-2xl mx-auto w-full px-4 py-8 flex flex-col gap-8">
        <section>
          <h2 className="text-xl font-semibold mb-2">Repository Selector</h2>
          <RepoSelector
            repos={repos}
            selectedRepo={selectedRepo}
            onFetchRepos={handleFetchRepos}
            onRepoSelected={setSelectedRepo}
            onCloneRepo={handleCloneRepo}
          />
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">Prompt</h2>
          <PromptBox
            prompt={prompt}
            onPromptChange={setPrompt}
            onExecute={handleExecute}
            loading={loading}
          />
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">Execution Logs</h2>
          <LogsPanel logs={logs} prUrl={prUrl} loading={loading} />
        </section>
      </div>
    </main>
  )
}
