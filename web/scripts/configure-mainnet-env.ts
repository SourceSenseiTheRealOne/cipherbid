import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { loadDeploymentManifest, type DeploymentEnvironment } from '@/config/deployment'
import { parseMainnetDeploymentRecord, renderMainnetEnvironment } from '@/config/mainnetAuctionPlan'

const defaultDeploymentRecord = path.resolve(process.cwd(), '..', '.runtime-evidence', 'mainnet', 'deployment.json')

function parseArguments(argv: readonly string[]): Readonly<{ deploymentRecord: string; write: boolean }> {
  let deploymentRecord = defaultDeploymentRecord
  let write = false
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index]
    if (argument === '--') continue
    if (argument === '--write') {
      write = true
      continue
    }
    if (argument === '--deployment-record') {
      const value = argv[index + 1]
      if (!value || value.startsWith('--')) throw new Error('--deployment-record requires a path')
      deploymentRecord = path.resolve(value)
      index += 1
      continue
    }
    throw new Error(`Unsupported option: ${argument}`)
  }
  return Object.freeze({ deploymentRecord, write })
}

function environmentFromText(text: string): DeploymentEnvironment {
  const environment: Record<string, string> = {}
  for (const line of text.split('\n')) {
    if (!line) continue
    const separator = line.indexOf('=')
    if (separator <= 0) throw new Error('Rendered mainnet environment is malformed')
    const key = line.slice(0, separator)
    if (Object.hasOwn(environment, key)) throw new Error(`Rendered mainnet environment repeats ${key}`)
    environment[key] = line.slice(separator + 1)
  }
  return environment
}

function main(): void {
  const options = parseArguments(process.argv.slice(2))
  if (!existsSync(options.deploymentRecord)) {
    throw new Error(`Verified mainnet deployment record not found: ${options.deploymentRecord}`)
  }
  const deployment = parseMainnetDeploymentRecord(readFileSync(options.deploymentRecord, 'utf8'))
  const rendered = renderMainnetEnvironment(deployment)
  loadDeploymentManifest(environmentFromText(rendered))

  if (!options.write) {
    process.stdout.write(rendered)
    return
  }
  const outputPath = path.resolve(process.cwd(), '.env.local')
  writeFileSync(outputPath, rendered, { encoding: 'utf8', mode: 0o600, flag: 'wx' })
  console.log(`Wrote verified public mainnet environment to ${outputPath}`)
}

try {
  main()
} catch (error: unknown) {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
}
