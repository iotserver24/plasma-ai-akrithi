---
name: e2b-coding-agents
description: Use E2B sandboxes and templates to run Claude Code or other coding agents safely, consulting e2b.dev/docs via the browser tool when the user mentions E2B, sandboxes, templates, or coding agents.
---

# E2B Coding Agents & Templates

## When to use this skill

Use this skill whenever:

- The user mentions **E2B**, **sandboxes**, **coding agents**, **Claude Code**, or **E2B templates**.
- You need to **run code, git, or CLI tools in isolation** (e.g., npm/bun install, tests, builds).
- You need to **configure or explain an E2B template** (e.g., `claude` template for Claude Code).
- You are unsure about E2B APIs, options, or limitations and need to consult the **official docs at `e2b.dev/docs`**.

This skill is **project-scoped** for `plasma-ai-aakrithi`, which uses E2B to run Claude Code that edits GitHub repositories and opens PRs.

## Browser usage with E2B docs

When you need authoritative information or details not in your training data:

- Use the **`cursor-ide-browser`** MCP server (the Browser tools) to:
  - Open `https://e2b.dev/docs` or specific subpages like:
    - `https://e2b.dev/docs/use-cases/coding-agents`
    - `https://e2b.dev/docs/template`
    - `https://e2b.dev/docs/template/quickstart`
  - Navigate from the docs landing page if the exact URL is unknown.
- Prefer reading **one focused page at a time** (e.g., the Template quickstart) instead of multiple broad pages.
- After reading a page:
  - Extract only the **minimal** API and template details you need (methods, arguments, constraints).
  - Do **not** copy long prose; summarize key points into concrete steps.

Only use the browser when:

- You need **exact syntax, options, or current version information**, or
- You suspect **breaking changes** in the E2B SDK/template system compared to your existing knowledge.

Otherwise, rely on the distilled workflow in this skill.

## Core concepts for this project

In this repo we:

- Use **E2B Code (Node SDK)** to create **coding sandboxes**.
- Prefer a **pre-built Claude Code template** (alias often `claude`), which has:
  - A Node base image.
  - Global installation of `@anthropic-ai/claude-code` so the `claude` CLI is available.
  - Git and basic CLI tools installed.
- Run commands using `sandbox.commands.run()` with:
  - `stdout` and `stderr` available.
  - Optional `onStdout` and `onStderr` callbacks for **streaming logs** to the frontend.

Key benefits:

- **Isolation**: Repos are cloned inside the sandbox, not on the host.
- **Safety**: Claude can run `git`, package managers, and tests without touching the developer’s machine.
- **Repeatability**: Templates ensure the same base environment each run.

## Template usage (Claude Code)

When setting up or describing the **Claude Code template**:

- The typical template looks like:

```ts
// template.ts (for reference only)
import { Template } from 'e2b'

export const template = Template()
  .fromNodeImage('24')
  .aptInstall(['curl', 'git', 'ripgrep'])
  // Claude Code available globally as "claude"
  .npmInstall('@anthropic-ai/claude-code@latest', { g: true })
```

Build steps (high level):

- Use the **E2B CLI** or Template SDK as per `https://e2b.dev/docs/template`:
  - `e2b template init` to scaffold.
  - `Template.build(...)` or `e2b template build` to build and push the template.
- The resulting template is referenced by an **alias or template ID** (e.g., `'claude'`).

When asked how to create/update templates:

1. Mention that E2B templates are defined via **Template API** or **CLI**.
2. Refer the user to `https://e2b.dev/docs/template/quickstart` for the latest exact commands.
3. Keep examples **minimal** and focused on:
   - Base image selection (`fromNodeImage`, `fromBaseImage`, etc.).
   - Installing packages/tools needed by the agent (e.g., `git`, `ripgrep`, `@anthropic-ai/claude-code`).
   - Setting env vars and start commands only if required.

## Runtime pattern for coding agents

When running coding agents (especially Claude Code) inside E2B sandboxes, follow this pattern:

1. **Check environment variables**
   - `E2B_API_KEY` must be set on the host (never log it).
   - Agent-specific keys must be provided as envs, e.g.:
     - `ANTHROPIC_API_KEY` for Claude Code.
2. **Create sandbox from template**
   - Use the correct template alias (e.g., `'claude'`).
   - Example (TypeScript/JavaScript):

```ts
import { Sandbox } from 'e2b'

const sandbox = await Sandbox.create('claude', {
  apiKey: process.env.E2B_API_KEY!,
  envs: {
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY!,
  },
  timeoutMs: 10 * 60 * 1000,
})
```

3. **Run terminal commands**
   - Use `sandbox.commands.run('...')` to:
     - Clone repos.
     - Run `claude` CLI in full-auto mode.
     - Run tests/builds if needed.
   - Use `onStdout` and `onStderr` to stream logs:

```ts
await sandbox.commands.run('echo hello', {
  onStdout: (data) => {
    // Forward to frontend / logs
  },
  onStderr: (data) => {
    // Forward errors
  },
})
```

4. **Run Claude Code in autonomous mode**
   - Pattern:

```bash
claude --dangerously-skip-permissions --output-format stream-json -p "<prompt>"
```

   - Use `--output-format stream-json` when you need **structured streaming events**.
   - Always run `claude` from within the cloned repo directory (`cd /path/to/repo`).

5. **Git operations inside sandbox**
   - Clone the repo with the PAT injected into the URL:

```bash
git clone https://<GITHUB_PAT>@github.com/<owner>/<repo>.git /home/user/repo
```

   - After Claude edits the repo:
     - `git add .`
     - `git commit -m "<message>"`
     - `git push origin <branch>`

6. **Always terminate the sandbox**
   - Use `await sandbox.kill()` (or equivalent) in a `finally` block.
   - Never leave long-lived sandboxes running for this hackathon project.

## Safety and secrets

When using E2B in this project:

- **Never log** full API keys, PATs, or `.env` contents.
- If you must show commands with tokens (e.g., clone URL for explanation), redact them in user-facing logs.
- Keep sandbox lifetime **short and task-scoped** (create → run → kill).

## When to adjust or extend this skill

Update or extend this skill when:

- You add new agent types (e.g., Codex, Amp, OpenCode) and need their specific template/runtime patterns.
- You change how sandboxes are created (different template alias, new env vars, new start commands).
- E2B updates its SDK or CLI in ways that affect:
  - `Sandbox.create` parameters.
  - Template build flow.
  - Required base images or constraints.

In those cases, re-consult `https://e2b.dev/docs` using the Browser tools, then update the examples and guidance here **succinctly**.

