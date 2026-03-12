import { Router } from 'express'
import { auth } from '../middleware/auth.js'
import { runAgentInSandbox } from '../services/sandbox.service.js'
import { createPR } from '../services/pr.service.js'
import { Chat } from '../db/chat.model.js'
import { Execution } from '../db/execution.model.js'
import { ExecutionLog } from '../db/executionLog.model.js'

const router = Router()

router.post('/', auth, async (req, res) => {
  const { prompt, repo, owner, defaultBranch } = req.body
  const githubToken = process.env.GITHUB_TOKEN

  if (!prompt || !repo || !owner) {
    return res.status(400).json({ error: 'prompt, repo, and owner are required' })
  }
  if (!githubToken) {
    return res.status(500).json({ error: 'GitHub token is not configured on the server' })
  }

  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')
  res.flushHeaders()

  const send = (type, data) => {
    res.write(`data: ${JSON.stringify({ type, data })}\n\n`)
  }

  let chatDoc = null
  let executionDoc = null

  const persistLog = async (type, message, source = null) => {
    if (!executionDoc) return
    try {
      await ExecutionLog.create({
        executionId: executionDoc._id,
        type,
        message,
        source,
      })
    } catch (err) {
      await Execution.updateOne(
        { _id: executionDoc._id },
        { $push: { warnings: `log_persist_failed: ${err.message || 'unknown error'}` } }
      )
    }
  }

  const emit = (type, message, source = null) => {
    send(type, message)
    persistLog(type, message, source)
  }

  const onLog = (msg) => emit('log', msg, 'sandbox')
  try {
    chatDoc = await Chat.create({
      userId: req.user.userId,
      repo,
      owner,
      prompt,
      messages: [{ role: 'user', content: prompt }],
      status: 'running',
    })
    send('chat', { id: chatDoc._id })
  } catch {
    // non-fatal — continue even if DB write fails
  }

  try {
    if (chatDoc) {
      executionDoc = await Execution.create({
        chatId: chatDoc._id,
        repo,
        owner,
        prompt,
        status: 'running',
      })
      await chatDoc.updateOne({ $push: { executions: executionDoc._id } })
    }

    const { committed } = await runAgentInSandbox({
      repo,
      owner,
      prompt,
      githubToken,
      onLog,
      defaultBranch: defaultBranch || 'main',
    })

    if (!committed) {
      emit('warning', 'No changes were made by the agent.', 'server')
      send('done', null)
      if (executionDoc) {
        await Execution.updateOne(
          { _id: executionDoc._id },
          { status: 'success', endedAt: new Date() }
        )
      }
      return
    }

    emit('log', 'Creating Pull Request...', 'server')
    const pr = await createPR({
      owner,
      repo,
      githubToken,
      prompt,
      defaultBranch: defaultBranch || 'main',
    })

    emit('log', `Pull Request created: ${pr.url}`, 'server')
    send('pr', { url: pr.url, number: pr.number, title: pr.title })
    send('done', null)

    if (chatDoc) {
      await chatDoc.updateOne({
        prUrl: pr.url,
        status: 'success',
        $push: { messages: { role: 'assistant', content: `PR created: ${pr.url}` } },
      })
    }
    if (executionDoc) {
      await Execution.updateOne(
        { _id: executionDoc._id },
        { prUrl: pr.url, status: 'success', endedAt: new Date() }
      )
    }
  } catch (err) {
    emit('error', err.message || 'Execution failed', 'server')
    send('done', null)
    if (chatDoc) {
      await chatDoc.updateOne({ status: 'failed' })
    }
    if (executionDoc) {
      await Execution.updateOne(
        { _id: executionDoc._id },
        { status: 'failed', error: err.message || 'Execution failed', endedAt: new Date() }
      )
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
