import { Router } from 'express'
import { auth } from '../middleware/auth.js'
import { runAgentInSandbox } from '../services/sandbox.service.js'
import { createPR } from '../services/pr.service.js'
import { Chat } from '../db/chat.model.js'

const router = Router()

router.post('/', auth, async (req, res) => {
  const { prompt, repo, owner, defaultBranch } = req.body
  const githubToken = req.headers['x-github-token']

  if (!prompt || !repo || !owner) {
    return res.status(400).json({ error: 'prompt, repo, and owner are required' })
  }
  if (!githubToken) {
    return res.status(400).json({ error: 'x-github-token header is required' })
  }

  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')
  res.flushHeaders()

  const send = (type, data) => {
    res.write(`data: ${JSON.stringify({ type, data })}\n\n`)
  }

  const onLog = (msg) => send('log', msg)

  const logMessages = []
  const collectingOnLog = (msg) => {
    logMessages.push(msg)
    onLog(msg)
  }

  let chatDoc = null
  try {
    chatDoc = await Chat.create({
      userId: req.user.userId,
      repo,
      owner,
      prompt,
      messages: [{ role: 'user', content: prompt }],
      status: 'running',
    })
  } catch {
    // non-fatal — continue even if DB write fails
  }

  try {
    const { committed } = await runAgentInSandbox({
      repo,
      owner,
      prompt,
      githubToken,
      onLog: collectingOnLog,
      defaultBranch: defaultBranch || 'main',
    })

    if (!committed) {
      send('warning', 'No changes were made by the agent.')
      send('done', null)
      res.end()
      return
    }

    onLog('Creating Pull Request...')
    const pr = await createPR({
      owner,
      repo,
      githubToken,
      prompt,
      defaultBranch: defaultBranch || 'main',
    })

    onLog(`Pull Request created: ${pr.url}`)
    send('pr', { url: pr.url, number: pr.number, title: pr.title })
    send('done', null)

    if (chatDoc) {
      await chatDoc.updateOne({
        prUrl: pr.url,
        status: 'success',
        $push: { messages: { role: 'assistant', content: `PR created: ${pr.url}` } },
      })
    }
  } catch (err) {
    send('error', err.message || 'Execution failed')
    send('done', null)
    if (chatDoc) {
      await chatDoc.updateOne({ status: 'failed' })
    }
  } finally {
    res.end()
  }
})

router.get('/history', auth, async (req, res) => {
  try {
    const chats = await Chat.find({ userId: req.user.userId })
      .sort({ createdAt: -1 })
      .limit(20)
      .select('-messages')
    res.json(chats)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
