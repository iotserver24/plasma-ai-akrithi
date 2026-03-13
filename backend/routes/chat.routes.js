import { Router } from 'express'
import { auth } from '../middleware/auth.js'
import { Chat } from '../db/chat.model.js'
import { Execution } from '../db/execution.model.js'

const router = Router()

router.get('/:id', auth, async (req, res) => {
  try {
    const chat = await Chat.findOne({ _id: req.params.id, userId: req.user.userId })
      .lean()
    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' })
    }

    const executions = await Execution.find({ chatId: chat._id })
      .sort({ startedAt: -1 })
      .lean()

    res.json({ chat, executions })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
