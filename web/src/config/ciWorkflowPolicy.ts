import { parse } from 'yaml'

const CHECKOUT = 'actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1'
const SETUP_NODE = 'actions/setup-node@820762786026740c76f36085b0efc47a31fe5020'
const SETUP_SCARB = 'software-mansion/setup-scarb@2a96b748888e3329ee44ac9ac073d930e692b3cd'
const SETUP_USC = 'software-mansion/setup-universal-sierra-compiler@30c139bca57cc0561cfae6f5353825bbc42c9f37'

const APPROVED_ACTIONS = Object.freeze([CHECKOUT, SETUP_NODE, CHECKOUT, SETUP_SCARB, SETUP_USC])
const BRANCHES = Object.freeze(['development', 'staging', 'main'])
const WEB_ENVIRONMENT = Object.freeze({
  NEXT_PUBLIC_CIPHERBID_NETWORK: 'mainnet',
  NEXT_PUBLIC_STARKNET_RPC_URL: 'https://api.zan.top/public/starknet-mainnet/rpc/v0_10',
  NEXT_PUBLIC_AUCTION_HOUSE_ADDRESS: '0x01b32af8bab712ede82117b8ff1b8866e09798f6c81edc255ffe59dd42e4843e',
  NEXT_PUBLIC_AUCTION_HOUSE_CLASS_HASH: '0x06aa99b7ae9e10619b5a3c1713a4d71054844d3dda8e21bef98db6e653d5efc4',
  NEXT_PUBLIC_STRK20_POOL_ADDRESS: '0x040337b1af3c663e86e333bab5a4b28da8d4652a15a69beee2b677776ffe812a',
  NEXT_PUBLIC_STRK_TOKEN_ADDRESS: '0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d',
})
const SNFOUNDRY_INSTALL = `set -euo pipefail
archive="$RUNNER_TEMP/starknet-foundry.tar.gz"
install_root="$RUNNER_TEMP/starknet-foundry"
curl --fail --location --silent --show-error --proto '=https' --tlsv1.2 \\
  https://github.com/foundry-rs/starknet-foundry/releases/download/v0.63.0/starknet-foundry-v0.63.0-x86_64-unknown-linux-gnu.tar.gz \\
  --output "$archive"
printf '%s  %s\\n' 'a861c13238fe0686e921820b9606065cf07b1ccc6cc22d95cd299cd78b37a869' "$archive" | sha256sum --check --strict
mkdir -p "$install_root"
tar -xzf "$archive" --strip-components=1 -C "$install_root"
printf '%s\\n' "$install_root/bin" >> "$GITHUB_PATH"
`

type UnknownRecord = Record<string, unknown>

function record(value: unknown): UnknownRecord | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null
  return value as UnknownRecord
}

function exactKeys(value: UnknownRecord, expected: readonly string[]): boolean {
  const actual = Object.keys(value).sort()
  const sortedExpected = [...expected].sort()
  return actual.length === sortedExpected.length && actual.every((key, index) => key === sortedExpected[index])
}

function exactStringRecord(value: unknown, expected: Readonly<Record<string, string>>): boolean {
  const candidate = record(value)
  if (!candidate || !exactKeys(candidate, Object.keys(expected))) return false
  return Object.entries(expected).every(([key, expectedValue]) => candidate[key] === expectedValue)
}

function exactBranches(value: unknown): boolean {
  const trigger = record(value)
  if (!trigger || !exactKeys(trigger, ['branches']) || !Array.isArray(trigger.branches)) return false
  return (
    trigger.branches.length === BRANCHES.length && trigger.branches.every((branch, index) => branch === BRANCHES[index])
  )
}

function stepsOf(job: UnknownRecord | null): UnknownRecord[] {
  if (!job || !Array.isArray(job.steps)) return []
  return job.steps.map(record).filter((step): step is UnknownRecord => step !== null)
}

function namedStep(steps: readonly UnknownRecord[], name: string): UnknownRecord | null {
  return steps.find((step) => step.name === name) ?? null
}

function exactRunStep(steps: readonly UnknownRecord[], name: string, run: string, workingDirectory?: string): boolean {
  const step = namedStep(steps, name)
  if (!step || step.run !== run || step.if !== undefined || step['continue-on-error'] !== undefined) return false
  return workingDirectory === undefined
    ? step['working-directory'] === undefined
    : step['working-directory'] === workingDirectory
}

function exactCheckout(step: UnknownRecord | null): boolean {
  const withBlock = record(step?.with)
  return Boolean(
    step &&
      step.uses === CHECKOUT &&
      withBlock &&
      exactKeys(withBlock, ['persist-credentials']) &&
      withBlock['persist-credentials'] === false,
  )
}

export function verifyCiWorkflow(source: string): readonly string[] {
  const errors: string[] = []
  const fail = (label: string) => {
    if (!errors.includes(label)) errors.push(label)
  }

  if (typeof source !== 'string' || source.length === 0 || source.length > 100_000) {
    return Object.freeze(['workflow-source-invalid'])
  }
  if (/\bpull_request_target\b/.test(source)) fail('workflow-event-invalid')
  if (/\$\{\{\s*secrets(?:\.|\[)/i.test(source)) fail('workflow-secret-expression-forbidden')
  if (/(^|[\s"'])dotenv(?:[\s"']|$)|(^|[\s"'])\.env(?:[.\s"']|$)/im.test(source)) {
    fail('workflow-dotenv-forbidden')
  }

  let parsed: unknown
  try {
    parsed = parse(source, { maxAliasCount: 0, uniqueKeys: true })
  } catch {
    return Object.freeze([...errors, 'workflow-yaml-invalid'])
  }

  const root = record(parsed)
  if (!root) return Object.freeze([...errors, 'workflow-document-invalid'])
  if (root.name !== 'CipherBid CI') fail('workflow-name-invalid')

  const events = record(root.on)
  if (
    !events ||
    !exactKeys(events, ['pull_request', 'push', 'workflow_dispatch']) ||
    !exactBranches(events.pull_request) ||
    !exactBranches(events.push)
  ) {
    fail('workflow-event-invalid')
  }
  if (!exactStringRecord(root.permissions, { contents: 'read' })) fail('workflow-permissions-invalid')
  const concurrency = record(root.concurrency)
  if (
    !concurrency ||
    !exactKeys(concurrency, ['group', 'cancel-in-progress']) ||
    concurrency.group !== 'ci-${{ github.workflow }}-${{ github.ref }}' ||
    concurrency['cancel-in-progress'] !== true
  ) {
    fail('workflow-concurrency-invalid')
  }

  const jobs = record(root.jobs)
  if (!jobs || !exactKeys(jobs, ['web', 'cairo'])) {
    fail('workflow-jobs-invalid')
    return Object.freeze(errors)
  }
  const web = record(jobs.web)
  const cairo = record(jobs.cairo)
  if (
    !web ||
    !exactKeys(web, ['runs-on', 'timeout-minutes', 'env', 'steps']) ||
    web['runs-on'] !== 'ubuntu-latest' ||
    web['timeout-minutes'] !== 30 ||
    !exactStringRecord(web.env, WEB_ENVIRONMENT)
  ) {
    fail('workflow-web-job-invalid')
  }
  if (
    !cairo ||
    !exactKeys(cairo, ['runs-on', 'timeout-minutes', 'steps']) ||
    cairo['runs-on'] !== 'ubuntu-latest' ||
    cairo['timeout-minutes'] !== 30
  ) {
    fail('workflow-cairo-job-invalid')
  }

  const webSteps = stepsOf(web)
  const cairoSteps = stepsOf(cairo)
  const actionReferences = [...webSteps, ...cairoSteps]
    .map((step) => step.uses)
    .filter((value): value is string => typeof value === 'string')
  if (
    actionReferences.length !== APPROVED_ACTIONS.length ||
    actionReferences.some((action, index) => action !== APPROVED_ACTIONS[index])
  ) {
    fail('workflow-actions-invalid')
  }
  if (webSteps.length !== 13 || cairoSteps.length !== 8) fail('workflow-step-count-invalid')

  if (!exactCheckout(namedStep(webSteps, 'Checkout')) || !exactCheckout(namedStep(cairoSteps, 'Checkout'))) {
    fail('workflow-checkout-invalid')
  }
  const nodeWith = record(namedStep(webSteps, 'Setup Node')?.with)
  if (!nodeWith || !exactKeys(nodeWith, ['node-version']) || nodeWith['node-version'] !== '24.13.1') {
    fail('workflow-node-invalid')
  }
  const scarbWith = record(namedStep(cairoSteps, 'Setup Scarb')?.with)
  if (
    !scarbWith ||
    !exactKeys(scarbWith, ['scarb-version', 'cache', 'cache-targets']) ||
    scarbWith['scarb-version'] !== '2.20.1' ||
    scarbWith.cache !== 'false' ||
    scarbWith['cache-targets'] !== 'false'
  ) {
    fail('workflow-scarb-invalid')
  }
  const uscWith = record(namedStep(cairoSteps, 'Setup Universal Sierra Compiler')?.with)
  if (
    !uscWith ||
    !exactKeys(uscWith, ['universal-sierra-compiler-version']) ||
    uscWith['universal-sierra-compiler-version'] !== '2.10.0'
  ) {
    fail('workflow-usc-invalid')
  }

  for (const [name, command, directory] of [
    ['Enable Corepack', 'corepack enable', undefined],
    ['Install frontend dependencies', 'pnpm install --frozen-lockfile', 'web'],
    ['Verify workflow policies', 'pnpm ci:verify\npnpm pages:verify\n', 'web'],
    ['Check frontend formatting', 'pnpm format:check', 'web'],
    ['Lint frontend', 'pnpm lint', 'web'],
    ['Type-check frontend', 'pnpm typecheck', 'web'],
    ['Test frontend', 'pnpm test', 'web'],
    ['Install Chromium', 'pnpm exec playwright install --with-deps chromium', 'web'],
    ['Test frontend in Chromium', 'pnpm test:e2e', 'web'],
    ['Build frontend', 'pnpm build', 'web'],
  ] as const) {
    if (!exactRunStep(webSteps, name, command, directory)) fail('workflow-web-command-invalid')
  }
  const staticBuild = namedStep(webSteps, 'Build static Pages artifact')
  if (
    !staticBuild ||
    staticBuild.run !== 'pnpm build' ||
    staticBuild['working-directory'] !== 'web' ||
    !exactStringRecord(staticBuild.env, { CIPHERBID_PAGES_BUILD: '1' }) ||
    staticBuild.if !== undefined ||
    staticBuild['continue-on-error'] !== undefined
  ) {
    fail('workflow-static-build-invalid')
  }

  const foundry = namedStep(cairoSteps, 'Install Starknet Foundry')
  if (
    !foundry ||
    foundry.shell !== 'bash' ||
    foundry.run !== SNFOUNDRY_INSTALL ||
    foundry.if !== undefined ||
    foundry['continue-on-error'] !== undefined
  ) {
    fail('workflow-foundry-install-invalid')
  }
  for (const [name, command, directory] of [
    ['Verify Cairo toolchain', 'scarb --version\nuniversal-sierra-compiler --version\nsnforge --version\n', undefined],
    ['Check Cairo formatting', 'scarb fmt --check', 'contracts'],
    ['Build Cairo contracts', 'scarb build', 'contracts'],
    ['Test Cairo contracts', 'snforge test', 'contracts'],
  ] as const) {
    if (!exactRunStep(cairoSteps, name, command, directory)) fail('workflow-cairo-command-invalid')
  }

  return Object.freeze(errors)
}
