import { Template } from 'e2b'

// Minimal XibeCode + Claude Code template for Plasma AI.
// - Based on Node 24 image
// - Installs git, curl, ripgrep
// - Installs XibeCode and Claude Code CLIs globally
export const template = Template()
  .fromNodeImage('24')
  .aptInstall(['curl', 'git', 'ripgrep'])
  .npmInstall('@anthropic-ai/claude-code@latest', { g: true })
  .npmInstall('xibecode', { g: true })

