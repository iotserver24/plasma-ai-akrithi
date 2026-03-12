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
  const redactedApiKey = anthropicKey
    ? `${anthropicKey.slice(0, 6)}...${anthropicKey.slice(-4)}`
    : 'missing'

  // #region agent log
  fetch('http://127.0.0.1:7481/ingest/b12e926a-f86f-43f6-bc76-9c02462ac54a', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Debug-Session-Id': 'cc1449',
    },
    body: JSON.stringify({
      sessionId: 'cc1449',
      runId: 'pre-xibecode-env',
      hypothesisId: 'H1-H2',
      location: 'backend/services/sandbox.service.js:30-48',
      message: 'E2B sandbox envs before Sandbox.create',
      data: {
        templateId,
        hasAnthropicKey: Boolean(anthropicKey),
        anthropicBase,
        anthropicModel,
      },
      timestamp: Date.now(),
    }),
  }).catch(() => {})
  // #endregion

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

    onLog(
      `Sandbox config → template=${templateId}, provider=anthropic, baseUrl=${anthropicBase || 'unset'}, model=${anthropicModel || 'unset'}, apiKey=${redactedApiKey}`
    )
    const versionResult = await sandbox.commands.run('xibecode --version', { timeoutMs: 15_000 })
    onLog(`Sandbox xibecode version: ${(versionResult.stdout || versionResult.stderr || 'unknown').trim()}`)

    onLog('Running XibeCode run-pr (Anthropic provider, using backend .env)...')
    const safePrompt = prompt.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/`/g, '\\`').replace(/\$/g, '\\$')
    const xibecodeCommands = [
      `cd ${workdir}`,
      // Run end-to-end PR flow, forcing config from env via CLI flags only
      `XIBECODE_VERBOSE=true xibecode run-pr --provider anthropic` +
        ` --api-key "$ANTHROPIC_API_KEY"` +
        (anthropicBase ? ' --base-url "$ANTHROPIC_BASE_URL"' : '') +
        (anthropicModel ? ' --model "$ANTHROPIC_MODEL"' : '') +
        ` "${safePrompt}"`
    ].join(' && ')

    // #region agent log
    fetch('http://127.0.0.1:7481/ingest/b12e926a-f86f-43f6-bc76-9c02462ac54a', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Debug-Session-Id': 'cc1449',
      },
      body: JSON.stringify({
        sessionId: 'cc1449',
        runId: 'pre-xibecode-run',
        hypothesisId: 'H3',
        location: 'backend/services/sandbox.service.js:71-80',
        message: 'XibeCode command about to run (redacted)',
        data: {
          hasAnthropicKeyEnv: true,
          anthropicBase,
          anthropicModel,
          commandPreview: 'XIBECODE_VERBOSE=true xibecode run-pr --provider anthropic --api-key "$ANTHROPIC_API_KEY"...',
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {})
    // #endregion

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
