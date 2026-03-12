# Plasma AI — Aakrithi

AI coding agent that takes a natural language prompt, runs Claude Code in an E2B sandbox to modify a GitHub repository, and automatically creates a Pull Request.

## Demo Flow

**Prompt → AI edits repo → Pull Request created automatically**

## Stack

- **Frontend**: Next.js 14 (App Router) + Tailwind CSS
- **Backend**: Node.js + Express (ESM)
- **Database**: MongoDB (Mongoose)
- **AI Agent**: Claude Code (`@anthropic-ai/claude-code`)
- **Sandbox**: E2B (`claude` template)
- **Package Manager**: Bun

## Setup

### 1. Backend

```bash
cd backend
cp .env.example .env
# Fill in .env values
bun install
bun dev
```

### 2. Frontend

```bash
cd frontend
cp .env.local.example .env.local
# Set NEXT_PUBLIC_API_URL=http://localhost:4000/api
bun install
bun dev
```

### 3. MongoDB

Make sure MongoDB is running locally:

```bash
mongod --dbpath /data/db
```

Or use a free MongoDB Atlas cluster and set `MONGODB_URI` accordingly.

## Environment Variables

### `backend/.env`

| Variable | Description |
|---|---|
| `APP_USERNAME` | Login username (default: `admin`) |
| `APP_PASSWORD` | Login password (default: `password`) |
| `JWT_SECRET` | Secret for signing JWTs |
| `MONGODB_URI` | MongoDB connection string |
| `E2B_API_KEY` | E2B API key from [e2b.dev](https://e2b.dev) |
| `ANTHROPIC_API_KEY` | Anthropic API key |
| `FRONTEND_URL` | Frontend origin for CORS |
| `PORT` | Backend port (default: 4000) |

### `frontend/.env.local`

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_API_URL` | Backend API base URL |

## Pages

| Route | Description |
|---|---|
| `/login` | Username + password login |
| `/dashboard` | Enter GitHub PAT, select repository |
| `/chat` | Write prompt, execute agent, view logs and PR |

## How it works

1. User logs in with credentials from `.env`
2. User enters GitHub PAT and selects a repository
3. User writes a natural language prompt (e.g. "Add rate limiting middleware")
4. Backend creates an E2B sandbox with the `claude` template (Claude Code pre-installed)
5. Inside the sandbox: repo is cloned, `xibecode-ai-change` branch is created
6. `claude --dangerously-skip-permissions` runs the coding agent
7. Agent edits files, then changes are committed and pushed
8. Backend calls GitHub API to create a Pull Request
9. PR link is shown in real-time via SSE streaming

## E2B Claude Template

The `claude` E2B template has Claude Code pre-installed. If it doesn't exist in your E2B account, you can build it:

```bash
# template.ts
import { Template } from 'e2b'

Template()
  .fromNodeImage('24')
  .aptInstall(['curl', 'git', 'ripgrep'])
  .npmInstall('@anthropic-ai/claude-code@latest', { g: true })
```

Then build: `e2b template build --name claude`
