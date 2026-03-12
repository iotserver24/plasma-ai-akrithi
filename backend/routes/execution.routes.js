import { Router } from 'express'
import { auth } from '../middleware/auth.js'
import { Chat } from '../db/chat.model.js'
import { Execution } from '../db/execution.model.js'
import { ExecutionLog } from '../db/executionLog.model.js'

const router = Router()

router.get('/:id', auth, async (req, res) => {
  try {
    const execution = await Execution.findById(req.params.id).lean()
    if (!execution) {
      return res.status(404).json({ error: 'Execution not found' })
    }

    const chat = await Chat.findOne({ _id: execution.chatId, userId: req.user.userId }).lean()
    if (!chat) {
      return res.status(404).json({ error: 'Execution not found' })
    }

    res.json({ execution })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.get('/:id/logs', auth, async (req, res) => {
  try {
    const execution = await Execution.findById(req.params.id).lean()
    if (!execution) {
      return res.status(404).json({ error: 'Execution not found' })
    }

    const chat = await Chat.findOne({ _id: execution.chatId, userId: req.user.userId }).lean()
    if (!chat) {
      return res.status(404).json({ error: 'Execution not found' })
    }

    const beforeRaw = typeof req.query.before === 'string' ? req.query.before : ''
    const limitRaw = Number.parseInt(req.query.limit ?? '200', 10)
    const offsetRaw = Number.parseInt(req.query.offset ?? '0', 10)
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 1000) : 200
    const offset = Number.isFinite(offsetRaw) ? Math.max(offsetRaw, 0) : 0
    const beforeNum = Number(beforeRaw)
    const beforeDate = beforeRaw
      ? Number.isFinite(beforeNum)
        ? new Date(beforeNum)
        : new Date(beforeRaw)
      : null
    const before = beforeDate && !Number.isNaN(beforeDate.getTime()) ? beforeDate : null

    if (before) {
      const logsDesc = await ExecutionLog.find({
        executionId: execution._id,
        ts: { $lt: before },
      })
        .sort({ ts: -1 })
        .limit(limit + 1)
        .lean()

      const hasMore = logsDesc.length > limit
      const trimmed = logsDesc.slice(0, limit)
      const nextCursor = hasMore ? trimmed[trimmed.length - 1]?.ts?.toISOString?.() ?? null : null
      const logs = trimmed.reverse()

      return res.json({
        executionId: execution._id,
        logs,
        pagination: {
          mode: 'cursor',
          limit,
          nextCursor,
          hasMore,
        },
      })
    }

    const logs = await ExecutionLog.find({ executionId: execution._id })
      .sort({ ts: 1 })
      .skip(offset)
      .limit(limit)
      .lean()

    const total = await ExecutionLog.countDocuments({ executionId: execution._id })

    res.json({
      executionId: execution._id,
      logs,
      pagination: {
        mode: 'offset',
        limit,
        offset,
        total,
        hasMore: offset + logs.length < total,
      },
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
