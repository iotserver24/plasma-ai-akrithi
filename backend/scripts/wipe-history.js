/**
 * One-off script: wipe all chat, execution, and execution log documents from MongoDB.
 * Run from repo root: bun run backend/scripts/wipe-history.js
 * Or from backend: bun run scripts/wipe-history.js
 */
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import mongoose from 'mongoose'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load backend .env
const envPath = path.join(__dirname, '..', '.env')
dotenv.config({ path: envPath, override: true })

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/plasma-ai'

async function wipe() {
  await mongoose.connect(MONGODB_URI)
  console.log('Connected to MongoDB')

  const db = mongoose.connection.db
  const collections = ['chats', 'executions', 'executionlogs']

  for (const name of collections) {
    try {
      const col = db.collection(name)
      const count = await col.countDocuments()
      await col.deleteMany({})
      console.log(`Deleted ${count} document(s) from "${name}"`)
    } catch (err) {
      console.error(`Error wiping "${name}":`, err.message)
    }
  }

  await mongoose.disconnect()
  console.log('Done. MongoDB history cleared.')
  process.exit(0)
}

wipe().catch((err) => {
  console.error(err)
  process.exit(1)
})
