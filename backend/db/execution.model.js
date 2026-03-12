import mongoose from 'mongoose'

const ExecutionSchema = new mongoose.Schema({
  chatId: { type: mongoose.Schema.Types.ObjectId, ref: 'Chat', required: true },
  repo: { type: String, required: true },
  owner: { type: String, required: true },
  prompt: { type: String, required: true },
  status: { type: String, enum: ['running', 'success', 'failed'], default: 'running' },
  prUrl: { type: String, default: null },
  error: { type: String, default: null },
  warnings: [{ type: String }],
  startedAt: { type: Date, default: Date.now },
  endedAt: { type: Date, default: null },
})

export const Execution = mongoose.model('Execution', ExecutionSchema)
