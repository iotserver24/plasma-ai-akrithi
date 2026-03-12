## Learned User Preferences

- Prefer Bun as the primary package manager and fall back to pnpm only if Bun does not work; avoid npm for installs and scripts.
- When making code changes, always edit the actual files (not just propose changes) and explain what you are doing plus what changed.
- Keep explanations concise but clear, focusing on what matters for a hackathon demo rather than exhaustive theory.

## Learned Workspace Facts

- This repository implements “Plasma AI Aakrithi”, a hackathon project where an AI coding agent runs in an E2B sandbox to modify a GitHub repo and automatically open a Pull Request from a natural language prompt.
- The frontend is a Next.js App Router app (Next 16) with Tailwind CSS, using Bun as the package manager and exposing `/login`, `/dashboard`, and `/chat` pages.
- The backend is an Express server using Bun, MongoDB via Mongoose, and E2B sandboxes to run XibeCode (Anthropic provider) in the cloned repository, create the `xibecode-ai-change` branch, commit changes, push, and create PRs via the GitHub REST API.
- The backend reads a GitHub Personal Access Token from the `GITHUB_TOKEN` environment variable and uses it for all GitHub API and git operations; the frontend never asks for or stores any GitHub tokens, and tokens are never written to the database or logs.
- Anthropic (or Claude-compatible) integration is configured via `ANTHROPIC_API_KEY`, `ANTHROPIC_BASE_URL`, and `ANTHROPIC_MODEL` in `backend/.env`, and these are passed through to the E2B sandbox for the XibeCode agent.

