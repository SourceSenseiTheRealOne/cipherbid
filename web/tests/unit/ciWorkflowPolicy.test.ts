import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { verifyCiWorkflow } from '@/config/ciWorkflowPolicy'

const checkout = 'actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1'
const setupNode = 'actions/setup-node@820762786026740c76f36085b0efc47a31fe5020'
const setupScarb = 'software-mansion/setup-scarb@2a96b748888e3329ee44ac9ac073d930e692b3cd'
const setupUsc = 'software-mansion/setup-universal-sierra-compiler@30c139bca57cc0561cfae6f5353825bbc42c9f37'
const snfoundryUrl =
  'https://github.com/foundry-rs/starknet-foundry/releases/download/v0.63.0/starknet-foundry-v0.63.0-x86_64-unknown-linux-gnu.tar.gz'
const snfoundrySha = 'a861c13238fe0686e921820b9606065cf07b1ccc6cc22d95cd299cd78b37a869'

const validWorkflow = `name: CipherBid CI
on:
  pull_request:
    branches: [development, staging, main]
  push:
    branches: [development, staging, main]
  workflow_dispatch:
permissions:
  contents: read
concurrency:
  group: ci-\${{ github.workflow }}-\${{ github.ref }}
  cancel-in-progress: true
jobs:
  web:
    runs-on: ubuntu-latest
    timeout-minutes: 30
    env:
      NEXT_PUBLIC_CIPHERBID_NETWORK: mainnet
      NEXT_PUBLIC_STARKNET_RPC_URL: https://api.zan.top/public/starknet-mainnet/rpc/v0_10
      NEXT_PUBLIC_AUCTION_HOUSE_ADDRESS: "0x01b32af8bab712ede82117b8ff1b8866e09798f6c81edc255ffe59dd42e4843e"
      NEXT_PUBLIC_AUCTION_HOUSE_CLASS_HASH: "0x06aa99b7ae9e10619b5a3c1713a4d71054844d3dda8e21bef98db6e653d5efc4"
      NEXT_PUBLIC_STRK20_POOL_ADDRESS: "0x040337b1af3c663e86e333bab5a4b28da8d4652a15a69beee2b677776ffe812a"
      NEXT_PUBLIC_STRK_TOKEN_ADDRESS: "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d"
    steps:
      - name: Checkout
        uses: ${checkout}
        with:
          persist-credentials: false
      - name: Setup Node
        uses: ${setupNode}
        with:
          node-version: 24.13.1
      - name: Enable Corepack
        run: corepack enable
      - name: Install frontend dependencies
        working-directory: web
        run: pnpm install --frozen-lockfile
      - name: Verify workflow policies
        working-directory: web
        run: |
          pnpm ci:verify
          pnpm pages:verify
      - name: Check frontend formatting
        working-directory: web
        run: pnpm format:check
      - name: Lint frontend
        working-directory: web
        run: pnpm lint
      - name: Type-check frontend
        working-directory: web
        run: pnpm typecheck
      - name: Test frontend
        working-directory: web
        run: pnpm test
      - name: Install Chromium
        working-directory: web
        run: pnpm exec playwright install --with-deps chromium
      - name: Test frontend in Chromium
        working-directory: web
        run: pnpm test:e2e
      - name: Build frontend
        working-directory: web
        run: pnpm build
      - name: Build static Pages artifact
        working-directory: web
        env:
          CIPHERBID_PAGES_BUILD: "1"
        run: pnpm build
  cairo:
    runs-on: ubuntu-latest
    timeout-minutes: 30
    steps:
      - name: Checkout
        uses: ${checkout}
        with:
          persist-credentials: false
      - name: Setup Scarb
        uses: ${setupScarb}
        with:
          scarb-version: 2.20.1
          cache: "false"
          cache-targets: "false"
      - name: Setup Universal Sierra Compiler
        uses: ${setupUsc}
        with:
          universal-sierra-compiler-version: 2.10.0
      - name: Install Starknet Foundry
        shell: bash
        run: |
          set -euo pipefail
          archive="$RUNNER_TEMP/starknet-foundry.tar.gz"
          install_root="$RUNNER_TEMP/starknet-foundry"
          curl --fail --location --silent --show-error --proto '=https' --tlsv1.2 \\
            ${snfoundryUrl} \\
            --output "$archive"
          printf '%s  %s\\n' '${snfoundrySha}' "$archive" | sha256sum --check --strict
          mkdir -p "$install_root"
          tar -xzf "$archive" --strip-components=1 -C "$install_root"
          printf '%s\\n' "$install_root/bin" >> "$GITHUB_PATH"
      - name: Verify Cairo toolchain
        run: |
          scarb --version
          universal-sierra-compiler --version
          snforge --version
      - name: Check Cairo formatting
        working-directory: contracts
        run: scarb fmt --check
      - name: Build Cairo contracts
        working-directory: contracts
        run: scarb build
      - name: Test Cairo contracts
        working-directory: contracts
        run: snforge test
`

function expectRejected(source: string) {
  expect(verifyCiWorkflow(source)).not.toEqual([])
}

describe('CipherBid CI workflow policy', () => {
  it('accepts only the reviewed least-authority CI contract', () => {
    expect(verifyCiWorkflow(validWorkflow)).toEqual([])
  })

  it('approves the repository workflow bytes', () => {
    const workflowPath = path.resolve(process.cwd(), '..', '.github', 'workflows', 'ci.yml')
    expect(existsSync(workflowPath)).toBe(true)
    expect(verifyCiWorkflow(readFileSync(workflowPath, 'utf8'))).toEqual([])
  })

  it('rejects unsafe events, secrets, dotenv, or expanded permissions', () => {
    expectRejected(validWorkflow.replace('pull_request:', 'pull_request_target:'))
    for (const expression of ['secrets.API_KEY', "secrets['API_KEY']", 'secrets["API_KEY"]']) {
      expectRejected(
        validWorkflow.replace(
          'run: pnpm build',
          `env:\n          LEAK: \${{ ${expression} }}\n        run: pnpm build`,
        ),
      )
    }
    expectRejected(validWorkflow.replace('pnpm test', 'pnpm test --env-file .env.test'))
    expectRejected(validWorkflow.replace('contents: read', 'contents: write'))
  })

  it('rejects mutable, substituted, or duplicate external actions', () => {
    expectRejected(validWorkflow.replace(checkout, 'actions/checkout@v7'))
    expectRejected(validWorkflow.replace(setupScarb, 'software-mansion/setup-scarb@v1.6.2'))
    expectRejected(validWorkflow.replace(setupUsc, 'software-mansion/setup-universal-sierra-compiler@v1'))
    expectRejected(
      validWorkflow.replace(
        `uses: ${setupNode}`,
        `uses: ${setupNode}\n      - name: Unreviewed duplicate\n        uses: actions/checkout@0000000000000000000000000000000000000000`,
      ),
    )
  })

  it('rejects credential persistence or branch-scope expansion', () => {
    expectRejected(validWorkflow.replaceAll('persist-credentials: false', 'persist-credentials: true'))
    expectRejected(validWorkflow.replaceAll('[development, staging, main]', '[main]'))
    expectRejected(validWorkflow.replace('workflow_dispatch:', 'schedule:\n    - cron: "0 * * * *"'))
  })

  it('rejects missing frontend or Cairo gates', () => {
    for (const command of [
      'pnpm format:check',
      'pnpm lint',
      'pnpm typecheck',
      'pnpm test',
      'pnpm test:e2e',
      'pnpm build',
      'scarb fmt --check',
      'scarb build',
      'snforge test',
    ]) {
      expectRejected(validWorkflow.replace(command, `${command} --skipped`))
    }
  })

  it('rejects Foundry URL, checksum, or toolchain-version substitution', () => {
    expectRejected(validWorkflow.replace(snfoundryUrl, `${snfoundryUrl}.attacker`))
    expectRejected(validWorkflow.replace(snfoundrySha, '0'.repeat(64)))
    expectRejected(validWorkflow.replace('scarb-version: 2.20.1', 'scarb-version: latest'))
    expectRejected(
      validWorkflow.replace('universal-sierra-compiler-version: 2.10.0', 'universal-sierra-compiler-version: latest'),
    )
  })
})
