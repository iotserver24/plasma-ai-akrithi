# Plasma AI — Aakrithi

AI coding agent that takes a natural language prompt, runs XibeCode in an E2B sandbox to modify a GitHub repository, and automatically creates a Pull Request.

**Made by R3AP3R editz**

## Demo Flow

**Prompt → AI edits repo → Pull Request created automatically**

## Stack

- **Frontend**: Next.js 14 (App Router) + Tailwind CSS
- **Backend**: Node.js + Express (ESM)
- **Database**: MongoDB (Mongoose)
- **AI Agent**: XibeCode CLI (`xibecode`)
- **Sandbox**: E2B (custom `plasma-xibecode` template)
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
| `E2B_TEMPLATE_ALIAS` | E2B template alias to use (default: `plasma-xibecode`) |
| `ANTHROPIC_API_KEY` | Anthropic or proxy API key used by XibeCode inside the sandbox |
| `ANTHROPIC_BASE_URL` | Anthropic API base URL or your proxy URL (e.g. `https://api.anthropic.com` or your router) |
| `ANTHROPIC_MODEL` | Model ID that Anthropic or your proxy expects (e.g. `claude-3-7-sonnet-20250219` or your proxy’s model name) |
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
2. User selects a repository (GitHub PAT is configured on the backend via `GITHUB_TOKEN`)
3. User writes a natural language prompt (e.g. "Add rate limiting middleware")
4. Backend creates an E2B sandbox with the `plasma-xibecode` template (XibeCode + gh CLI pre-installed)
5. Inside the sandbox: repo is cloned and XibeCode is configured from `ANTHROPIC_API_KEY`, `ANTHROPIC_BASE_URL`, and `ANTHROPIC_MODEL`
6. `xibecode run-pr --provider anthropic ...` runs the autonomous coding + PR workflow
7. XibeCode edits files, runs tests (if configured), commits, pushes, and creates a PR via `gh pr create`
8. Backend parses the PR URL from XibeCode logs and streams it back over SSE

## E2B XibeCode Template

The `plasma-xibecode` E2B template has XibeCode (and `gh`) pre-installed. To build or update it:

```bash
cd backend
bunx tsx e2b-template/build.ts
```
