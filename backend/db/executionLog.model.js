import mongoose from 'mongoose'

const ExecutionLogSchema = new mongoose.Schema({
  executionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Execution', required: true },
  ts: { type: Date, default: Date.now },
  type: { type: String, enum: ['log', 'warning', 'error'], default: 'log' },
  message: { type: String, required: true },
  source: { type: String, default: null },
})

ExecutionLogSchema.index({ executionId: 1, ts: 1 })

export const ExecutionLog = mongoose.model('ExecutionLog', ExecutionLogSchema)
