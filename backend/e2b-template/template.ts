import { Template } from 'e2b'

// Minimal XibeCode template for Plasma AI.
// - Based on Node 24 image
// - Installs git, curl, ripgrep, gh (GitHub CLI)
// - Installs XibeCode CLI globally
export const template = Template()
  .fromNodeImage('24')
  .aptInstall(['curl', 'git', 'ripgrep', 'gh'])
  .npmInstall('xibecode@0.6.3', { g: true })
  // xibecode's pattern-miner imports 'typescript' at runtime
  .npmInstall('typescript', { g: true })

