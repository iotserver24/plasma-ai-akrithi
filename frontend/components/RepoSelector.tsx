'use client'

type Repo = {
  name: string
}

type RepoSelectorProps = {
  repos: Repo[]
  selectedRepo: string | null
  onFetchRepos: () => void
  onRepoSelected: (repoName: string) => void
  onCloneRepo: () => void
}

export default function RepoSelector({
  repos,
  selectedRepo,
  onFetchRepos,
  onRepoSelected,
  onCloneRepo,
}: RepoSelectorProps) {
  return (
    <div className="space-y-3">
      <button onClick={onFetchRepos} className="btn-primary">
        Fetch Repositories
      </button>

      <div>
        {repos.length === 0 ? (
          <p className="text-sm text-gray-500">No repositories loaded.</p>
        ) : (
          <ul className="space-y-1">
            {repos.map((repo) => (
              <li key={repo.name}>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="repo"
                    value={repo.name}
                    checked={selectedRepo === repo.name}
                    onChange={() => onRepoSelected(repo.name)}
                  />
                  {repo.name}
                </label>
              </li>
            ))}
          </ul>
        )}
      </div>

      <button onClick={onCloneRepo} className="btn-secondary">
        Clone Repository
      </button>

      {selectedRepo && (
        <p className="text-xs text-gray-500">
          Selected: <span className="font-medium text-gray-300">{selectedRepo}</span>
        </p>
      )}
    </div>
  )
}
