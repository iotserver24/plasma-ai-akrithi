import { Sandbox } from 'e2b'

/**
 * Runs the Claude Code agent inside an E2B sandbox.
 * Clones the repo, creates a branch, runs Claude, then commits and pushes.
 * @param {object} opts
 * @param {string} opts.repo - Repository name (without owner)
 * @param {string} opts.owner - GitHub username/org
 * @param {string} opts.prompt - Natural language task for Claude
 * @param {string} opts.githubToken - GitHub PAT
 * @param {function} opts.onLog - Callback for streaming log lines
 * @param {string} opts.defaultBranch - Default branch to base off (default: 'main')
 */
export async function runAgentInSandbox({ repo, owner, prompt, githubToken, onLog, defaultBranch = 'main' }) {
  const apiKey = process.env.E2B_API_KEY
  if (!apiKey) throw new Error('E2B_API_KEY is not set')

  const anthropicKey = process.env.ANTHROPIC_API_KEY
  if (!anthropicKey) throw new Error('ANTHROPIC_API_KEY is not set')

  const anthropicBaseUrl = process.env.ANTHROPIC_API_URL
  const anthropicModel = process.env.ANTHROPIC_MODEL

  onLog('Creating sandbox...')
  const sandbox = await Sandbox.create('claude', {
    apiKey,
    envs: {
      ANTHROPIC_API_KEY: anthropicKey,
      ...(anthropicBaseUrl ? { ANTHROPIC_API_URL: anthropicBaseUrl } : {}),
      ...(anthropicModel ? { ANTHROPIC_MODEL: anthropicModel } : {}),
      GIT_TERMINAL_PROMPT: '0',
    },
    timeoutMs: 10 * 60 * 1000,
  })

  try {
    const cloneUrl = `https://x-access-token:${githubToken}@github.com/${owner}/${repo}.git`
    const workdir = `/home/user/${repo}`

    onLog(`Cloning ${owner}/${repo}...`)
    const cloneResult = await sandbox.commands.run(
      `git clone ${cloneUrl} ${workdir} 2>&1 && echo "CLONE_OK"`,
      { timeoutMs: 60_000 }
    )
    if (!cloneResult.stdout.includes('CLONE_OK')) {
      throw new Error(`Clone failed: ${cloneResult.stdout}`)
    }

    onLog('Setting up git identity...')
    await sandbox.commands.run(
      `cd ${workdir} && ` +
      `git config user.email "ai@plasma.dev" && ` +
      `git config user.name "Plasma AI" && ` +
      `git checkout -b xibecode-ai-change`
    )

    onLog('Running Claude Code agent...')
    const safePrompt = prompt.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/`/g, '\\`').replace(/\$/g, '\\$')
    await sandbox.commands.run(
      `cd ${workdir} && claude --dangerously-skip-permissions --output-format stream-json -p "${safePrompt}"`,
      {
        timeoutMs: 8 * 60 * 1000,
        onStdout: (data) => {
          for (const line of data.split('\n').filter(Boolean)) {
            try {
              const event = JSON.parse(line)
              if (event.type === 'assistant') {
                const text = event.message?.content
                  ?.filter((b) => b.type === 'text')
                  ?.map((b) => b.text)
                  ?.join(' ')
                  ?.slice(0, 120)
                if (text) onLog(`[Claude] ${text}`)
              } else if (event.type === 'result') {
                onLog(`[Claude] Completed: ${event.subtype} (${Math.round((event.duration_ms || 0) / 1000)}s)`)
              } else if (event.type === 'system') {
                onLog(`[System] ${event.subtype}`)
              }
            } catch {
              if (data.trim()) onLog(data.trim())
            }
          }
        },
        onStderr: (data) => {
          if (data.trim()) onLog(`[stderr] ${data.trim()}`)
        },
      }
    )

    onLog('Checking for changes...')
    const statusResult = await sandbox.commands.run(`cd ${workdir} && git status --porcelain`)
    if (!statusResult.stdout.trim()) {
      onLog('No file changes detected — skipping commit.')
      return { committed: false }
    }

    onLog('Committing changes...')
    const commitMsg = `AI: ${prompt.slice(0, 72)}`
    await sandbox.commands.run(
      `cd ${workdir} && git add . && git commit -m "${commitMsg.replace(/"/g, '\\"')}"`
    )

    onLog('Pushing branch xibecode-ai-change...')
    const pushResult = await sandbox.commands.run(
      `cd ${workdir} && git push https://x-access-token:${githubToken}@github.com/${owner}/${repo}.git xibecode-ai-change --force 2>&1`
    )
    if (pushResult.exitCode !== 0) {
      throw new Error(`Push failed: ${pushResult.stdout}`)
    }

    onLog('Branch pushed successfully.')
    return { committed: true }
  } finally {
    onLog('Closing sandbox...')
    await sandbox.kill()
  }
}
