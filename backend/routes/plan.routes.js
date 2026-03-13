import { Router } from 'express'
import { auth } from '../middleware/auth.js'
import { Chat } from '../db/chat.model.js'

const router = Router()

const SYSTEM_PROMPT = `You are a senior coding agent planner. Given a git repository and a task, respond in this exact format:

1. One or two plain sentences outside any tags — acknowledging the task or asking a clarifying question.
2. Immediately after, wrap the detailed plan in <plan> and </plan> tags.

The content inside <plan>...</plan> MUST be valid Markdown with:
- ## Headers for each major step
- Bullet points listing exact files, functions, and what to change
- \`code spans\` for filenames, function names, and identifiers
- Do NOT write full code, only describe what to change and where

Example output:
Here's a plan to add error logging to the CLI.

<plan>
## 1. Create \`src/logger.ts\`
- Add a \`Logger\` class with \`log\`, \`warn\`, and \`error\` methods
- Write to stderr for errors, stdout otherwise

## 2. Update \`src/cli.ts\`
- Import \`Logger\` and wrap all \`console.log\` calls
</plan>`

router.post('/', auth, async (req, res) => {
  const { prompt, repo, owner, chatId } = req.body

  if (!prompt || !repo || !owner) {
    return res.status(400).json({ error: 'prompt, repo, and owner are required' })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  const baseUrl = (process.env.ANTHROPIC_BASE_URL || 'https://api.openai.com').replace(/\/$/, '')
  const model = process.env.ANTHROPIC_MODEL || 'gpt-4o-mini'

  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')
  res.flushHeaders()

  const send = (type, data) => {
    try {
      res.write(`data: ${JSON.stringify({ type, data })}\n\n`)
    } catch {}
  }

  try {
    let chat = null

    if (chatId) {
      chat = await Chat.findOne({ _id: chatId, userId: req.user.userId })
      if (!chat) {
        send('error', { message: 'Chat not found' })
        return res.end()
      }
      chat.messages.push({ role: 'user', content: prompt })
    } else {
      chat = await Chat.create({
        userId: req.user.userId,
        repo,
        owner,
        prompt,
        messages: [{ role: 'user', content: prompt }],
        status: 'planning',
      })
    }

    // Send chatId early so frontend can update the URL before stream finishes
    send('chatId', { chatId: String(chat._id) })

    const userMessages = chat.messages
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map((m) => ({ role: m.role, content: m.content }))

    // Enrich first message with repo context
    if (!chatId && userMessages.length > 0) {
      userMessages[0] = {
        role: 'user',
        content: `Repository: ${owner}/${repo}\n\nTask: ${prompt}`,
      }
    }

    const apiRes = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        max_tokens: 2048,
        stream: true,
        messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...userMessages],
      }),
    })

    if (!apiRes.ok) {
      const errText = await apiRes.text()
      send('error', { message: `API error ${apiRes.status}: ${errText.slice(0, 300)}` })
      return res.end()
    }

    const reader = apiRes.body.getReader()
    const decoder = new TextDecoder()
    let fullContent = ''
    let lineBuf = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      lineBuf += decoder.decode(value, { stream: true })
      const lines = lineBuf.split('\n')
      lineBuf = lines.pop() ?? ''

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const payload = line.slice(6).trim()
        if (payload === '[DONE]') continue
        try {
          const parsed = JSON.parse(payload)
          const chunk = parsed.choices?.[0]?.delta?.content ?? ''
          if (chunk) {
            fullContent += chunk
            send('chunk', { content: chunk })
          }
        } catch {
          // ignore individual chunk parse errors
        }
      }
    }

    // Persist to DB
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

export default router
