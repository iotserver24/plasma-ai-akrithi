import mongoose from 'mongoose'

const MessageSchema = new mongoose.Schema({
  role: { type: String, enum: ['user', 'assistant', 'system'], required: true },
  content: { type: String, required: true },
})

const ChatSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  repo: { type: String, required: true },
  owner: { type: String, required: true },
  prompt: { type: String, required: true },
  messages: [MessageSchema],
  executions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Execution' }],
  prUrl: { type: String, default: null },
  status: { type: String, enum: ['running', 'success', 'failed'], default: 'running' },
  createdAt: { type: Date, default: Date.now },
})

export const Chat = mongoose.model('Chat', ChatSchema)
