import { parse } from 'yaml'

const APPROVED_ACTIONS = Object.freeze([
  'actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1',
  'actions/setup-node@820762786026740c76f36085b0efc47a31fe5020',
  'actions/configure-pages@45bfe0192ca1faeb007ade9deae92b16b8254a0d',
  'actions/upload-pages-artifact@fc324d3547104276b827a68afc52ff2a11cc49c9',
  'actions/deploy-pages@cd2ce8fcbc39b97be8ca5fce6e763baed58fa128',
])

const PUBLIC_BUILD_ENVIRONMENT = Object.freeze({
  CIPHERBID_PAGES_BUILD: '1',
  NEXT_PUBLIC_CIPHERBID_NETWORK: 'mainnet',
  NEXT_PUBLIC_STARKNET_RPC_URL: 'https://api.zan.top/public/starknet-mainnet/rpc/v0_10',
  NEXT_PUBLIC_AUCTION_HOUSE_ADDRESS: '0x01b32af8bab712ede82117b8ff1b8866e09798f6c81edc255ffe59dd42e4843e',
  NEXT_PUBLIC_AUCTION_HOUSE_CLASS_HASH: '0x06aa99b7ae9e10619b5a3c1713a4d71054844d3dda8e21bef98db6e653d5efc4',
  NEXT_PUBLIC_STRK20_POOL_ADDRESS: '0x040337b1af3c663e86e333bab5a4b28da8d4652a15a69beee2b677776ffe812a',
  NEXT_PUBLIC_STRK_TOKEN_ADDRESS: '0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d',
})

type UnknownRecord = Record<string, unknown>

function record(value: unknown): UnknownRecord | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null
  return value as UnknownRecord
}

function exactKeys(value: UnknownRecord, expected: readonly string[]): boolean {
  const actual = Object.keys(value).sort()
  return actual.length === expected.length && actual.every((key, index) => key === [...expected].sort()[index])
}

function exactStringRecord(value: unknown, expected: Readonly<Record<string, string>>): boolean {
  const candidate = record(value)
  if (!candidate || !exactKeys(candidate, Object.keys(expected))) return false
  return Object.entries(expected).every(([key, expectedValue]) => candidate[key] === expectedValue)
}

function stepsOf(job: UnknownRecord | null): UnknownRecord[] {
  if (!job || !Array.isArray(job.steps)) return []
  return job.steps.map(record).filter((step): step is UnknownRecord => step !== null)
}

export function verifyPagesWorkflow(source: string): readonly string[] {
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
  if (root.name !== 'Deploy CipherBid Pages') fail('workflow-name-invalid')

  const events = record(root.on)
  const push = events ? record(events.push) : null
  if (
    !events ||
    !exactKeys(events, ['push', 'workflow_dispatch']) ||
    !push ||
    !exactKeys(push, ['branches']) ||
    !Array.isArray(push.branches) ||
    push.branches.length !== 1 ||
    push.branches[0] !== 'main'
  ) {
    fail('workflow-event-invalid')
  }

  if (!exactStringRecord(root.permissions, { contents: 'read' })) fail('workflow-root-permissions-invalid')
  const concurrency = record(root.concurrency)
  if (!concurrency || concurrency.group !== 'pages' || concurrency['cancel-in-progress'] !== false) {
    fail('workflow-concurrency-invalid')
  }

  const jobs = record(root.jobs)
  if (!jobs || !exactKeys(jobs, ['build', 'deploy'])) {
    fail('workflow-jobs-invalid')
    return Object.freeze(errors)
  }
  const build = record(jobs.build)
  const deploy = record(jobs.deploy)
  if (!build || build['runs-on'] !== 'ubuntu-latest') fail('workflow-build-job-invalid')
  if (!deploy || deploy['runs-on'] !== 'ubuntu-latest' || deploy.needs !== 'build') fail('workflow-deploy-job-invalid')

  const buildSteps = stepsOf(build)
  const deploySteps = stepsOf(deploy)
  const actions = [...buildSteps, ...deploySteps]
    .map((step) => step.uses)
    .filter((value): value is string => typeof value === 'string')
  if (
    actions.length !== APPROVED_ACTIONS.length ||
    actions.some((action, index) => action !== APPROVED_ACTIONS[index])
  ) {
    fail('workflow-actions-invalid')
  }

  const checkout = buildSteps.find((step) => step.uses === APPROVED_ACTIONS[0])
  const checkoutWith = record(checkout?.with)
  if (!checkoutWith || checkoutWith['persist-credentials'] !== false) fail('workflow-checkout-invalid')

  const setup = buildSteps.find((step) => step.uses === APPROVED_ACTIONS[1])
  const setupWith = record(setup?.with)
  if (!setupWith || !exactKeys(setupWith, ['node-version']) || setupWith['node-version'] !== '24.13.1') {
    fail('workflow-node-setup-invalid')
  }

  const runs = buildSteps.map((step) => step.run).filter((value): value is string => typeof value === 'string')
  for (const required of [
    'corepack enable',
    'pnpm install --frozen-lockfile',
    'pnpm pages:verify',
    'pnpm format:check',
    'pnpm lint',
    'pnpm typecheck',
    'pnpm test',
    'pnpm build',
  ]) {
    if (
      !runs.some((run) =>
        run
          .split(/\r?\n/)
          .map((line) => line.trim())
          .includes(required),
      )
    ) {
      fail('workflow-command-invalid')
    }
  }

  const buildStep = buildSteps.find((step) => step.name === 'Build static site')
  if (
    !buildStep ||
    buildStep['working-directory'] !== 'web' ||
    buildStep.run !== 'pnpm build' ||
    !exactStringRecord(buildStep.env, PUBLIC_BUILD_ENVIRONMENT)
  ) {
    fail('workflow-build-environment-invalid')
  }

  const upload = buildSteps.find((step) => step.uses === APPROVED_ACTIONS[3])
  const uploadWith = record(upload?.with)
  if (!uploadWith || uploadWith.path !== 'web/out') fail('workflow-artifact-invalid')

  if (!exactStringRecord(deploy?.permissions, { pages: 'write', 'id-token': 'write' })) {
    fail('workflow-deploy-permissions-invalid')
  }
  const environment = record(deploy?.environment)
  if (
    !environment ||
    environment.name !== 'github-pages' ||
    environment.url !== '${{ steps.deployment.outputs.page_url }}'
  ) {
    fail('workflow-environment-invalid')
  }
  if (deploySteps.length !== 1 || deploySteps[0].id !== 'deployment' || deploySteps[0].uses !== APPROVED_ACTIONS[4]) {
    fail('workflow-deploy-step-invalid')
  }

  return Object.freeze(errors)
}
