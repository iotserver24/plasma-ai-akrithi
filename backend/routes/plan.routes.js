import { Router } from 'express'
import { auth } from '../middleware/auth.js'
import { Chat } from '../db/chat.model.js'

const router = Router()

const SYSTEM_PROMPT = `You are a senior coding agent planner with full access to a GitHub repository.

You will receive the repository file tree and the user's task. Use the \`read_file\` tool to read any files you need to understand the codebase before writing your plan. Read as many as needed — entry points, config files, files related to the task.

Once you have enough context, produce your FINAL response in EXACTLY this format — no exceptions:

One sentence (max) acknowledging the task. Then immediately the plan tag:

<plan>
## 1. Step Title
- Exact file: \`path/to/file.ts\`
  - What function/class to change and how
- Any new file to create

## 2. Next step
...
</plan>

CRITICAL rules:
- Keep the text BEFORE <plan> to ONE sentence maximum. Do not write analysis, summaries, or explanations before the tag.
- All detail goes INSIDE <plan>…</plan>.
- Content inside <plan>…</plan> MUST be valid Markdown.
- Be specific: name exact files, functions, line ranges where useful.
- Do NOT guess file contents — use read_file to verify before referencing.
- Do NOT write full code inside the plan.`

const TOOL_DEF = [
  {
    type: 'function',
    function: {
      name: 'read_file',
      description: 'Read the contents of a file from the repository.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Repository-relative file path, e.g. src/index.ts' },
        },
        required: ['path'],
      },
    },
  },
]

const MAX_ITERATIONS = 15

async function getRepoTree(owner, repo, branch, token) {
  try {
    const res = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`,
      { headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3+json' } }
    )
    if (!res.ok) return []
    const data = await res.json()
    return (data.tree ?? []).filter((n) => n.type === 'blob').map((n) => n.path).slice(0, 300)
  } catch {
    return []
  }
}

async function readRepoFile(owner, repo, filePath, branch, token) {
  try {
    const res = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}?ref=${branch}`,
      { headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3+json' } }
    )
    if (!res.ok) return `[Error reading file: ${res.status}]`
    const data = await res.json()
    if (!data.content) return '[File is empty or binary]'
    return Buffer.from(data.content, 'base64').toString('utf8').slice(0, 8000)
  } catch (err) {
    return `[Error: ${err.message}]`
  }
}

/**
 * Consume an OpenAI-compatible SSE stream from the LLM.
 * Returns { contentText, toolCalls } when finished.
 * Calls onDelta(text) for every content delta so caller can forward it.
 */
async function consumeStream(apiRes, onDelta) {
  const reader = apiRes.body.getReader()
  const decoder = new TextDecoder()
  let buf = ''
  let contentText = ''
  const toolCalls = []

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buf += decoder.decode(value, { stream: true })

    const lines = buf.split('\n')
    buf = lines.pop() // keep last incomplete line

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const payload = line.slice(6).trim()
      if (payload === '[DONE]') continue

      let chunk
      try { chunk = JSON.parse(payload) } catch { continue }

      const delta = chunk.choices?.[0]?.delta
      if (!delta) continue

      // Content delta — forward immediately
      if (delta.content) {
        contentText += delta.content
        onDelta(delta.content)
      }

      // Tool call deltas — accumulate
      if (delta.tool_calls) {
        for (const tc of delta.tool_calls) {
          const idx = tc.index ?? 0
          if (!toolCalls[idx]) {
            toolCalls[idx] = { id: '', type: 'function', function: { name: '', arguments: '' } }
          }
          if (tc.id) toolCalls[idx].id = tc.id
          if (tc.function?.name) toolCalls[idx].function.name += tc.function.name
          if (tc.function?.arguments) toolCalls[idx].function.arguments += tc.function.arguments
        }
      }
    }
  }

  return { contentText: contentText.trim(), toolCalls: toolCalls.filter(Boolean) }
}

router.post('/', auth, async (req, res) => {
  const { prompt, repo, owner, chatId, defaultBranch } = req.body

  if (!prompt || !repo || !owner) {
    return res.status(400).json({ error: 'prompt, repo, and owner are required' })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  const baseUrl = (process.env.ANTHROPIC_BASE_URL || 'https://api.openai.com').replace(/\/$/, '')
  const model = process.env.ANTHROPIC_MODEL || 'gpt-4o-mini'
  const githubToken = process.env.GITHUB_TOKEN
  const branch = defaultBranch || 'main'

  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')
  res.flushHeaders()

  const send = (type, data) => {
    try { res.write(`data: ${JSON.stringify({ type, data })}\n\n`) } catch {}
  }

  try {
    let chat = null

    if (chatId) {
      chat = await Chat.findOne({ _id: chatId, userId: req.user.userId })
      if (!chat) { send('error', { message: 'Chat not found' }); return res.end() }
      chat.messages.push({ role: 'user', content: prompt })
    } else {
      chat = await Chat.create({
        userId: req.user.userId,
        repo, owner, prompt,
        messages: [{ role: 'user', content: prompt }],
        status: 'planning',
      })
    }

    send('chatId', { chatId: String(chat._id) })

    // Fetch repo file tree
    let tree = []
    if (githubToken) {
      send('reading_file', { path: '(fetching file tree…)' })
      tree = await getRepoTree(owner, repo, branch, githubToken)
    }

    const historyMessages = chat.messages
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map((m) => ({ role: m.role, content: m.content }))

    const treeSection = tree.length > 0
      ? `\n\nRepository: ${owner}/${repo} (branch: ${branch})\n\nFile tree (${tree.length} files):\n${tree.join('\n')}`
      : `\n\nRepository: ${owner}/${repo}`

    const llmMessages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...historyMessages.slice(0, -1),
      { role: 'user', content: historyMessages[historyMessages.length - 1].content + treeSection },
    ]

    let fullContent = ''

    // Agentic loop — tool-call turns use stream:false (fast), final turn streams live
    for (let i = 0; i < MAX_ITERATIONS; i++) {
      // Peek with stream:false for tool-call turns; we'll switch to streaming once plain text starts
      const peekRes = await fetch(`${baseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model, max_tokens: 4096, stream: false,
          tools: TOOL_DEF, tool_choice: 'auto',
          messages: llmMessages,
        }),
      })

      const rawText = await peekRes.text()

      if (!peekRes.ok) {
        if (peekRes.status === 502 || peekRes.status === 400) {
          console.warn('[plan.routes] tools not supported, falling back to text-based streaming loop')
          return runTextStreamLoop({ llmMessages, baseUrl, apiKey, model, send, chat, owner, repo, branch, githubToken, res })
        }
        send('error', { message: `API error ${peekRes.status}: ${rawText.slice(0, 400)}` })
        return res.end()
      }

      let data
      try { data = JSON.parse(rawText) } catch {
        send('error', { message: `Failed to parse API response: ${rawText.slice(0, 200)}` })
        return res.end()
      }

      const msg = data.choices?.[0]?.message
      if (!msg) { send('error', { message: 'Empty response from LLM' }); return res.end() }

      if (msg.tool_calls?.length) {
        // Tool-call turn — process and loop
        llmMessages.push(msg)

        for (const tc of msg.tool_calls) {
          let filePath = ''
          try { filePath = JSON.parse(tc.function.arguments).path || '' } catch {}

          if (!filePath) {
            llmMessages.push({ role: 'tool', tool_call_id: tc.id, content: '[Error: no path provided]' })
            continue
          }

          send('reading_file', { path: filePath })

          const content = githubToken
            ? await readRepoFile(owner, repo, filePath, branch, githubToken)
            : '[GitHub token not configured — cannot read files]'

          llmMessages.push({ role: 'tool', tool_call_id: tc.id, content: `File: ${filePath}\n\n${content}` })
        }
      } else {
        // Final turn — re-request with stream:true to stream the plan live
        const streamRes = await fetch(`${baseUrl}/v1/chat/completions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
          body: JSON.stringify({
            model, max_tokens: 4096, stream: true,
            messages: llmMessages,
          }),
        })

        if (!streamRes.ok) {
          // Fallback: just use the already-fetched non-streaming response
          fullContent = (msg.content ?? '').trim()
          send('chunk', { content: fullContent })
          break
        }

        let accumulated = ''
        const { contentText } = await consumeStream(streamRes, (delta) => {
          accumulated += delta
          send('chunk', { content: accumulated })
        })

        fullContent = contentText || accumulated
        break
      }
    }

    if (!fullContent) {
      send('error', { message: 'Planner did not produce a final response within iteration limit.' })
      return res.end()
    }

    chat.messages.push({ role: 'assistant', content: fullContent })
    const planMatch = fullContent.match(/<plan>([\s\S]*?)<\/plan>/i)
    chat.plan = planMatch ? planMatch[1].trim() : fullContent.trim()
    await chat.save()

    send('done', { chatId: String(chat._id) })
    res.end()
  } catch (err) {
    console.error('[plan.routes] error:', err.message)
    try { send('error', { message: err.message || 'Failed to generate plan' }) } catch {}
    res.end()
  }
})

// Fallback: text-based tool calling with streaming final response
async function runTextStreamLoop({ llmMessages, baseUrl, apiKey, model, send, chat, owner, repo, branch, githubToken, res }) {
  const TEXT_SYSTEM = llmMessages[0].content +
    '\n\nNOTE: When you want to read a file output ONLY this on one line: READ_FILE: path/to/file.ext'
  const msgs = [{ role: 'system', content: TEXT_SYSTEM }, ...llmMessages.slice(1)]
  let fullContent = ''

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    // Peek non-streaming to check for READ_FILE directive
    const peekRes = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model, max_tokens: 512, stream: false, messages: msgs }),
    })

    const rawText = await peekRes.text()
    if (!peekRes.ok) { send('error', { message: `API error ${peekRes.status}: ${rawText.slice(0, 400)}` }); return res.end() }

    const peekData = JSON.parse(rawText)
    const peekText = (peekData.choices?.[0]?.message?.content ?? '').trim()

    const readMatch = peekText.match(/^READ_FILE:\s*(.+)$/m)
    if (readMatch && !peekText.includes('<plan>')) {
      const filePath = readMatch[1].trim()
      send('reading_file', { path: filePath })

      const fileContent = githubToken
        ? await readRepoFile(owner, repo, filePath, branch, githubToken)
        : '[GitHub token not configured]'

      msgs.push({ role: 'assistant', content: peekText })
      msgs.push({
        role: 'user',
        content: `Content of \`${filePath}\`:\n\n\`\`\`\n${fileContent}\n\`\`\`\n\nContinue. Read more files or produce the final plan.`,
      })
    } else {
      // Final response — stream it
      const streamRes = await fetch(`${baseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ model, max_tokens: 4096, stream: true, messages: msgs }),
      })

      if (!streamRes.ok) {
        fullContent = peekText
        send('chunk', { content: fullContent })
        break
      }

      let accumulated = ''
      await consumeStream(streamRes, (delta) => {
        accumulated += delta
        send('chunk', { content: accumulated })
      })
      fullContent = accumulated
      break
    }
  }

  if (!fullContent) { send('error', { message: 'Planner did not produce a final response.' }); return res.end() }

  chat.messages.push({ role: 'assistant', content: fullContent })
  const planMatch = fullContent.match(/<plan>([\s\S]*?)<\/plan>/i)
  chat.plan = planMatch ? planMatch[1].trim() : fullContent.trim()
  await chat.save()

  send('done', { chatId: String(chat._id) })
  res.end()
}

export default router
