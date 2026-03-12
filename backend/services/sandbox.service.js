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

  const anthropicBase =
    process.env.ANTHROPIC_BASE_URL && process.env.ANTHROPIC_BASE_URL.trim().length > 0
      ? process.env.ANTHROPIC_BASE_URL
      : process.env.ANTHROPIC_API_URL
  const anthropicModel = process.env.ANTHROPIC_MODEL

  // Prefer explicit template overrides; otherwise fall back to the prebuilt 'claude' template.
  const templateId =
    process.env.E2B_TEMPLATE_ID || process.env.E2B_TEMPLATE_ALIAS || 'claude'

  onLog('Creating sandbox...')
  const sandbox = await Sandbox.create(templateId, {
    apiKey,
    envs: {
      ANTHROPIC_API_KEY: anthropicKey,
      ...(anthropicBase
        ? {
            ANTHROPIC_BASE_URL: anthropicBase,
            ANTHROPIC_API_URL: anthropicBase,
          }
        : {}),
      ...(anthropicModel ? { ANTHROPIC_MODEL: anthropicModel } : {}),
      // Expose GitHub token to tools that understand GH_TOKEN/GITHUB_TOKEN (xibecode, gh CLI)
      GH_TOKEN: githubToken,
      GITHUB_TOKEN: githubToken,
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
      `git config user.name "Plasma AI"`
    )

    onLog('Running XibeCode run-pr (Anthropic provider)...')
    const safePrompt = prompt.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/`/g, '\\`').replace(/\$/g, '\\$')
    const xibecodeCommands = [
      `cd ${workdir}`,
      // Configure XibeCode using sandbox environment variables
      'xibecode config --set-key "$ANTHROPIC_API_KEY"',
      anthropicBase ? 'xibecode config --set-url "$ANTHROPIC_BASE_URL"' : null,
      anthropicModel ? 'xibecode config --set-model "$ANTHROPIC_MODEL"' : null,
      // Run end-to-end PR flow with Anthropic provider and model from env (if set)
      `XIBECODE_VERBOSE=true xibecode run-pr --provider anthropic${
        anthropicModel ? ' --model "$ANTHROPIC_MODEL"' : ''
      } "${safePrompt}"`
    ].filter(Boolean).join(' && ')

    let prUrl = null

    await sandbox.commands.run(xibecodeCommands, {
      timeoutMs: 8 * 60 * 1000,
      onStdout: (data) => {
        if (!data.trim()) return
        for (const line of data.split('\n').filter(Boolean)) {
          // Try to capture a PR URL if XibeCode prints one
          const match = line.match(/https:\/\/github\.com\/\S+\/pull\/\d+/)
          if (match) {
            prUrl = match[0]
          }
          onLog(`[XibeCode] ${line}`)
        }
      },
      onStderr: (data) => {
        if (data.trim()) onLog(`[stderr] ${data.trim()}`)
      },
    })

    // XibeCode run-pr already handled branch, commit, push, and PR creation.
    if (prUrl) {
      onLog(`PR detected from XibeCode: ${prUrl}`)
      return { committed: true, prUrl }
    }

    onLog('XibeCode run-pr completed but no PR URL was detected.')
    return { committed: false }
  } finally {
    onLog('Closing sandbox...')
    await sandbox.kill()
  }
}
