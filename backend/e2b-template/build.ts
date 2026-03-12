import 'dotenv/config'
import { Template, defaultBuildLogger } from 'e2b'
import { template } from './template'

const TEMPLATE_ALIAS = 'plasma-xibecode-v3'

async function main() {
  console.log('🚀 Building Plasma XibeCode template...\n')

  const result = await Template.build(template, TEMPLATE_ALIAS, {
    cpuCount: 2,
    memoryMB: 2048,
    onBuildLogs: defaultBuildLogger(),
  })

  console.log('\n✅ Template built successfully')
  console.log(`Template ID:    ${result.templateId}`)
  console.log(`Template alias: ${TEMPLATE_ALIAS}`)
}

main().catch((err) => {
  console.error('❌ Failed to build template:', err)
  process.exit(1)
})

