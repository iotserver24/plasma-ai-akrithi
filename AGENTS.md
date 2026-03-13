# AGENTS.md

## Learned User Preferences

- Use Bun or pnpm for package management; avoid npm.
- Backend LLM/API config must come from `backend/.env`; use dotenv with override so .env wins over shell environment (e.g. correct base URL and key).
- E2B sandbox template must have xibecode installed; pin xibecode version (e.g. 0.6.3) and bump template alias when rebuilding to avoid cached builds.
- "Use this repository" should navigate to `/chat`, not `/developer`.
- Chat/plan flow: first prompt creates chat in MongoDB and URL becomes `/chat?id=chatId`; plan in `<plan>…</plan>`; show plan on right in markdown; Execute leads to `/code?id=executionId`; persist PR URL and logs in MongoDB.
- Remove or avoid fake/placeholder UI (e.g. fake "AI Insights" or non-real analytics).

## Learned Workspace Facts

- Planning API uses OpenAI-compatible `/v1/chat/completions`; proxy may support both OpenAI and Anthropic formats and tool calling.
- Agentic planning can use a `read_file` tool; file tree and file content are fetched via GitHub API on the backend only.
- Frontend chat shows research (files read) in the thread; plan content is restricted to the right panel with a brief intro in the left bubble when a plan exists.
