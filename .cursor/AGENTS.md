## Learned User Preferences

- Prefer Bun as the primary package manager and fall back to npm only if Bun does not work.
- When making code changes, always edit the actual files (not just propose changes) and explain what you are doing plus what changed.
- Keep explanations concise but clear, focusing on what matters for a hackathon demo rather than exhaustive theory.

## Learned Workspace Facts

- This repository implements “Plasma AI Aakrithi”, a hackathon project where an AI coding agent runs in an E2B sandbox to modify a GitHub repo and automatically open a Pull Request from a natural language prompt.
- The frontend is a Next.js App Router app (Next 16) with Tailwind CSS, using Bun as the package manager and exposing `/login`, `/dashboard`, and `/chat` pages.
- The backend is an Express server using Bun, MongoDB via Mongoose, and E2B sandboxes to run Claude Code, clone target GitHub repositories, create the `xibecode-ai-change` branch, commit changes, push, and create PRs via the GitHub REST API.
- Users provide their own GitHub Personal Access Token at runtime; tokens must never be logged or stored in the database and are only used in-memory to call GitHub APIs or git over HTTPS.

