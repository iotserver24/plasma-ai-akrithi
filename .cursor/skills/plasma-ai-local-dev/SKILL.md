---
name: plasma-ai-local-dev
description: Run and troubleshoot the Plasma AI Aakrithi hackathon app locally, including env setup, Bun commands for backend/frontend, and verifying the end-to-end prompt → PR demo flow. Use when the user asks how to run, debug, or demo the project.
---

# Plasma AI Local Dev & Demo

## When to use this skill

Use this skill for this repository when:

- The user asks **how to run the app** (backend/frontend) locally.
- The user wants to **prepare or rehearse the demo** (Prompt → AI edits repo → PR).
- You need to **debug environment issues** (env vars, ports, MongoDB, E2B keys).
- You need to describe the **minimal steps** to get a fresh dev machine to a working demo.

This skill is **project-specific** to `plasma-ai-aakrithi`.

---

## 1. Tech stack recap

- **Frontend**: Next.js 16 (App Router) + Tailwind, Bun package manager.
- **Backend**: Node.js + Express, Bun for package management.
- **DB**: MongoDB via Mongoose.
- **AI agent**: Claude Code CLI, run inside an E2B sandbox.
- **Sandbox**: E2B template alias `claude`.
- **GitHub**: Clones target repo inside sandbox, creates branch `xibecode-ai-change`, pushes, then opens PR via REST API.

---

## 2. Environment variables

### Backend (`backend/.env`)

Copy from `backend/.env.example` and fill:

```env
APP_USERNAME=admin               # login username
APP_PASSWORD=password            # login password
JWT_SECRET=change-me-long-random
MONGODB_URI=mongodb://localhost:27017/plasma-ai
E2B_API_KEY=your-e2b-api-key
ANTHROPIC_API_KEY=your-anthropic-api-key
FRONTEND_URL=http://localhost:3000
PORT=4000
```

### Frontend (`frontend/.env.local`)

Copy from `frontend/.env.local.example`:

```env
NEXT_PUBLIC_API_URL=http://localhost:4000/api
```

**Rules:**

- Never log or commit real keys.
- For instructions, refer users to official docs:
  - E2B templates and API: `https://e2b.dev/docs`
  - Anthropic API: `https://docs.anthropic.com/`

---

## 3. Starting the stack (local)

### 3.1 MongoDB

Make sure MongoDB is running:

```bash
mongod --dbpath /data/db    # adjust path as needed
```

Or use a cloud MongoDB URI in `MONGODB_URI`.

### 3.2 Backend (Bun + Express)

From project root:

```bash
cd backend
cp .env.example .env        # if not already done, then edit .env
bun install                 # one-time
bun dev                     # runs on PORT (default 4000)
```

Backend health check:

- `GET http://localhost:4000/api/health` → `{ "status": "ok" }`.

### 3.3 Frontend (Next.js + Bun)

From project root:

```bash
cd frontend
cp .env.local.example .env.local   # if not already done
bun install                        # one-time
bun dev                            # Next.js dev server on 3000
```

Visit `http://localhost:3000`.

---

## 4. Demo flow checklist

Copy and adapt this when helping the user rehearse the demo:

```markdown
### Plasma AI Aakrithi Demo Script

- [ ] Backend running on http://localhost:4000 (healthcheck ok)
- [ ] Frontend running on http://localhost:3000
- [ ] MongoDB reachable (no connection errors in backend logs)
- [ ] E2B_API_KEY and ANTHROPIC_API_KEY set and valid

Flow:
- [ ] Open /login
      - Enter APP_USERNAME / APP_PASSWORD from backend .env
- [ ] Redirect to /dashboard
      - Paste GitHub PAT with repo scope
      - Click **Connect** → repos + username appear
- [ ] Pick a small test repo (ideally simple Node/JS/TS project)
      - Make sure PAT has push + PR rights
- [ ] Click **Start Coding** → /chat
- [ ] Enter prompt, e.g. "Add rate limiting middleware to this Express API"
- [ ] Click **Execute**
      - Watch ExecutionStatus steps progress:
        - Create Sandbox
        - Clone Repo
        - Run Claude
        - Commit & Push
        - Create PR
      - Watch LogsPanel stream:
        - cloning, planning, editing, tests (if any), git push, PR creation
- [ ] When done, click PR link banner
      - Show GitHub PR with diff
```

---

## 5. Common failure modes & fixes

### 5.1 Backend cannot connect to MongoDB

- Symptom: Logs show `MongoDB connection error`.
- Checklist:
  - Is `mongod` running?
  - Is `MONGODB_URI` correct?
  - Can you `mongo` or `mongosh` into that URI manually?

### 5.2 CORS / frontend cannot reach backend

- Symptom: Frontend network errors calling `/api/...`.
- Checklist:
  - `FRONTEND_URL` in backend `.env` must match the actual frontend origin.
  - `NEXT_PUBLIC_API_URL` in frontend `.env.local` must be `http://localhost:4000/api` (or wherever backend runs).

### 5.3 Login fails

- Symptom: `Invalid credentials` on `/api/auth/login`.
- Checklist:
  - Values typed in UI must match `APP_USERNAME` and `APP_PASSWORD` in backend `.env`.
  - Restart backend after changing `.env`.

### 5.4 GitHub PAT issues

- Symptom: Repo list fails or execution errors like `Authentication failed` or `403`.
- Checklist:
  - PAT must have **`repo`** scope (classic) or `Contents: Read & Write`, `Pull requests: Read & Write` (fine-grained).
  - PAT must belong to a user that has push permissions to the selected repo.
  - Validate PAT quickly using `curl`:

    ```bash
    curl -H "Authorization: Bearer $GITHUB_TOKEN" https://api.github.com/user
    ```

### 5.5 E2B / Claude issues

- Symptom: Sandbox creation fails or Claude command not found.
- Checklist:
  - `E2B_API_KEY` set and valid.
  - Template alias `claude` exists in the E2B account (per E2B docs).
  - Use the **`e2b-coding-agents`** skill for deeper troubleshooting and template setup.

---

## 6. When to combine with other skills

For more complex workflows:

- **With `e2b-coding-agents`**:
  - When debugging sandbox setup, Claude CLI, or streaming logs.
- **With `github-token-workflow`**:
  - When adjusting the GitHub branch/push/PR behavior, using PAT or `GITHUB_TOKEN`.

Use this `plasma-ai-local-dev` skill first for **run/demo** questions, then layer on the other skills as needed.

