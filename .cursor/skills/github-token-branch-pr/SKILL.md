---
name: github-token-workflow
description: >
  Use this skill whenever the user needs to interact with GitHub programmatically using
  a Personal Access Token (PAT) — including creating branches, pushing commits, and opening
  pull requests. Trigger this skill when the user mentions: "create a branch via API",
  "push code with a token", "automate PR", "GitHub REST API", "PAT", "github token push",
  "open pull request programmatically", or any variant of automating GitHub git operations.
  Covers both the Git CLI approach (token in remote URL) and the GitHub REST API approach
  (curl / fetch / Node.js / Python). Always use this skill when GitHub token-based automation
  is involved, even if the user only mentions one part of the workflow.
---

# GitHub Token Workflow

A complete guide for using a GitHub Personal Access Token (PAT) to:
1. **Create a branch** (locally or via API)
2. **Push commits** (via Git CLI or REST API)
3. **Open a Pull Request** (via REST API or `gh` CLI)

## 1. Use token with git (create branch + push)

### 1.1 Configure remote URL with token

In an automated environment (sandbox, CI), use the token in the clone or push URL:

```bash
# Option A: clone with token embedded
git clone "https://x-access-token:${GITHUB_TOKEN}@github.com/${OWNER}/${REPO}.git"

# Option B: set remote after cloning anonymously
git remote set-url origin "https://x-access-token:${GITHUB_TOKEN}@github.com/${OWNER}/${REPO}.git"
```

For a PAT (outside Actions), replace `${GITHUB_TOKEN}` with `${GITHUB_PAT}`.

### 1.2 Create and switch to a new branch

```bash
git checkout -b "${BRANCH_NAME}"
```

Typical branch name in this project: `xibecode-ai-change`.

### 1.3 Commit and push using the token

```bash
git add .
git commit -m "AI: Implement requested feature"

# Push using the token-authenticated origin
git push origin "${BRANCH_NAME}"
```

In GitHub Actions, `origin` already points to the repository; after setting the URL with `x-access-token`, this push will authenticate using `GITHUB_TOKEN`.

## 2. Use token with GitHub REST API

### 2.1 Basic authentication header

For any `curl` or HTTP client call:

```bash
curl -H "Authorization: Bearer ${GITHUB_TOKEN}" \
     -H "Accept: application/vnd.github.v3+json" \
     https://api.github.com/user
```

In older examples, `Authorization: token <token>` is also accepted; modern guidance prefers `Bearer`.

### 2.2 Create a new branch via API (optional alternative)

Most workflows use **git + push** to create the branch. If you must create a branch purely via the API:

1. Get the SHA of the base branch (e.g. `main`):

```bash
BASE_SHA=$(curl -s \
  -H "Authorization: Bearer ${GITHUB_TOKEN}" \
  -H "Accept: application/vnd.github.v3+json" \
  "https://api.github.com/repos/${OWNER}/${REPO}/git/ref/heads/main" \
  | jq -r '.object.sha')
```

2. Create a new ref:

```bash
curl -s -X POST \
  -H "Authorization: Bearer ${GITHUB_TOKEN}" \
  -H "Accept: application/vnd.github.v3+json" \
  "https://api.github.com/repos/${OWNER}/${REPO}/git/refs" \
  -d @- <<EOF
{
  "ref": "refs/heads/${BRANCH_NAME}",
  "sha": "${BASE_SHA}"
}
EOF
```

In this project, sticking to **`git checkout -b` + push** is simpler and more familiar.

## 3. Create a Pull Request with the token

Once the branch with commits is pushed (using token-authenticated git), call the GitHub REST API to open a PR:

```bash
curl -s -X POST \
  -H "Authorization: Bearer ${GITHUB_TOKEN}" \
  -H "Accept: application/vnd.github.v3+json" \
  "https://api.github.com/repos/${OWNER}/${REPO}/pulls" \
  -d @- <<EOF
{
  "title": "AI Implementation",
  "head": "${BRANCH_NAME}",
  "base": "main",
  "body": "Generated automatically by the AI agent"
}
EOF
```

Key fields:

- `head`: the **source branch** name (`BRANCH_NAME`, e.g. `xibecode-ai-change`).
- `base`: the **target branch** to merge into (usually `main` or `default_branch`).

In this project’s backend, the equivalent is implemented in `pr.service.js` using `fetch` with an `Authorization` header and JSON body.

## 4. Permissions for GITHUB_TOKEN in GitHub Actions

When using `GITHUB_TOKEN` inside Actions, make sure permissions allow both **push** and **PR creation**:

```yaml
permissions:
  contents: write   # required to push branches/commits
  pull-requests: write  # required to create PRs via API
```

For jobs that only need to read, you can restrict permissions, but for this AI-agent flow the above are typical.

Example job skeleton:

```yaml
jobs:
  ai-agent:
    runs-on: ubuntu-latest
    permissions:
      contents: write
      pull-requests: write
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Configure git for GITHUB_TOKEN
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
          git remote set-url origin "https://x-access-token:${GITHUB_TOKEN}@github.com/${{ github.repository }}.git"

      - name: Create branch, push, and open PR
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          OWNER: ${{ github.repository_owner }}
          REPO: ${{ github.event.repository.name }}
          BRANCH_NAME: xibecode-ai-change
        run: |
          git checkout -b "${BRANCH_NAME}"
          # ... your edits here ...
          git add .
          git commit -m "AI: Implement requested feature" || echo "No changes to commit"
          git push origin "${BRANCH_NAME}" || echo "Push failed or no changes"

          # Create PR (optional guard if branch exists)
          curl -s -X POST \
            -H "Authorization: Bearer ${GITHUB_TOKEN}" \
            -H "Accept: application/vnd.github.v3+json" \
            "https://api.github.com/repos/${OWNER}/${REPO}/pulls" \
            -d "{\"title\": \"AI Implementation\",\"head\": \"${BRANCH_NAME}\",\"base\": \"main\",\"body\": \"Generated automatically by the AI agent\"}"
```

## 5. How to apply this in this project

When adapting this repo to use **`GITHUB_TOKEN`** (e.g. for CI) instead of a PAT:

- Replace PAT-based clone/push URLs inside the sandbox or workflow with the `x-access-token:${GITHUB_TOKEN}` pattern.
- Keep the **branch name** consistent (`xibecode-ai-change`) so the backend/frontends remain in sync.
- Use the REST API PR pattern above, mirroring what `pr.service.js` already does with `fetch`.

Always ensure that:

- Tokens are **not logged**.
- Permissions on `GITHUB_TOKEN` are the **minimum required** for the job (usually `contents: write`, `pull-requests: write` for this flow).

