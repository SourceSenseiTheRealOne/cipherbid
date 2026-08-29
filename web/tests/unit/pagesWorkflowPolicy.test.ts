import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { verifyPagesWorkflow } from '@/config/pagesWorkflowPolicy'

const checkout = 'actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1'
const setupNode = 'actions/setup-node@820762786026740c76f36085b0efc47a31fe5020'
const configurePages = 'actions/configure-pages@45bfe0192ca1faeb007ade9deae92b16b8254a0d'
const uploadArtifact = 'actions/upload-pages-artifact@fc324d3547104276b827a68afc52ff2a11cc49c9'
const deployPages = 'actions/deploy-pages@cd2ce8fcbc39b97be8ca5fce6e763baed58fa128'

const validWorkflow = `name: Deploy CipherBid Pages
on:
  push:
    branches: [main]
  workflow_dispatch:
permissions:
  contents: read
concurrency:
  group: pages
  cancel-in-progress: false
jobs:
  build:
    runs-on: ubuntu-latest
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
      - name: Install dependencies
        working-directory: web
        run: pnpm install --frozen-lockfile
      - name: Verify workflow policy
        working-directory: web
        run: pnpm pages:verify
      - name: Verify Web
        working-directory: web
        run: |
          pnpm format:check
          pnpm lint
          pnpm typecheck
          pnpm test
      - name: Configure Pages
        uses: ${configurePages}
      - name: Build static site
        working-directory: web
        env:
          CIPHERBID_PAGES_BUILD: "1"
          NEXT_PUBLIC_CIPHERBID_NETWORK: mainnet
          NEXT_PUBLIC_STARKNET_RPC_URL: https://api.zan.top/public/starknet-mainnet/rpc/v0_10
          NEXT_PUBLIC_AUCTION_HOUSE_ADDRESS: "0x01b32af8bab712ede82117b8ff1b8866e09798f6c81edc255ffe59dd42e4843e"
          NEXT_PUBLIC_AUCTION_HOUSE_CLASS_HASH: "0x06aa99b7ae9e10619b5a3c1713a4d71054844d3dda8e21bef98db6e653d5efc4"
          NEXT_PUBLIC_STRK20_POOL_ADDRESS: "0x040337b1af3c663e86e333bab5a4b28da8d4652a15a69beee2b677776ffe812a"
          NEXT_PUBLIC_STRK_TOKEN_ADDRESS: "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d"
        run: pnpm build
      - name: Upload Pages artifact
        uses: ${uploadArtifact}
        with:
          path: web/out
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: \${{ steps.deployment.outputs.page_url }}
    permissions:
      pages: write
      id-token: write
    steps:
      - name: Deploy Pages
        id: deployment
        uses: ${deployPages}
`

function expectRejected(source: string) {
  expect(verifyPagesWorkflow(source)).not.toEqual([])
}

describe('GitHub Pages workflow policy', () => {
  it('accepts only the reviewed least-authority workflow contract', () => {
    expect(verifyPagesWorkflow(validWorkflow)).toEqual([])
  })

  it('approves the repository workflow bytes', () => {
    const workflowPath = path.resolve(process.cwd(), '..', '.github', 'workflows', 'deploy-pages.yml')
    expect(existsSync(workflowPath)).toBe(true)
    expect(verifyPagesWorkflow(readFileSync(workflowPath, 'utf8'))).toEqual([])
  })

  it('rejects an unsafe event or any secret-expression syntax', () => {
    expectRejected(validWorkflow.replace('push:\n    branches: [main]', 'pull_request_target:'))
    for (const expression of ['secrets.API_KEY', "secrets['API_KEY']", 'secrets["API_KEY"]']) {
      expectRejected(
        validWorkflow.replace(
          'run: pnpm build',
          `env:\n          LEAK: \${{ ${expression} }}\n        run: pnpm build`,
        ),
      )
    }
  })

  it('rejects mutable, substituted, or duplicate external action references', () => {
    expectRejected(validWorkflow.replace(checkout, 'actions/checkout@v7'))
    expectRejected(validWorkflow.replace(setupNode, 'actions/setup-node@0000000000000000000000000000000000000000'))
    expectRejected(
      validWorkflow.replace(
        `uses: ${setupNode}`,
        `uses: ${setupNode}\n      - name: Duplicate checkout\n        uses: actions/checkout@0000000000000000000000000000000000000000`,
      ),
    )
  })

  it('rejects credential persistence, dotenv use, wrong artifacts, or non-main deployment triggers', () => {
    expectRejected(validWorkflow.replace('persist-credentials: false', 'persist-credentials: true'))
    expectRejected(validWorkflow.replace('pnpm build', 'pnpm build --env-file .env.production'))
    expectRejected(validWorkflow.replace('path: web/out', 'path: web/.next'))
    expectRejected(validWorkflow.replace('branches: [main]', 'branches: [development]'))
  })

  it('rejects setup-node pnpm caching before Corepack provisions pnpm', () => {
    expectRejected(
      validWorkflow.replace(
        'node-version: 24.13.1',
        'node-version: 24.13.1\n          cache: pnpm\n          cache-dependency-path: web/pnpm-lock.yaml',
      ),
    )
  })
})
