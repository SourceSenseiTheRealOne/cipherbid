# GitHub Pages Mainnet Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish CipherBid as a durable no-login GitHub Pages application configured to the verified Starknet mainnet contracts before the final paired Ready X auction lifecycle.

**Architecture:** Replace the forced-dynamic `/auctions/[auctionId]` server route with an exportable `/auction?id=<positive-u64>` client loader. The loader validates the query and build-time public deployment manifest, reads and verifies auction state through public RPC in the browser, then renders the existing wallet/action UI. A pinned, least-privilege GitHub Pages workflow builds and deploys the static export after the source is promoted through `development → staging → main`.

**Tech Stack:** Next.js 16.3.2 App Router, React 19.2.8, TypeScript 5.9.3, starknet.js 10.4.0, Vitest 3.2.6, Playwright 1.58.2, pnpm 10.18.1, `yaml` 2.9.0, GitHub Pages, GitHub Actions.

## Global Constraints

- Execute inline in the canonical checkout; do not dispatch agents or create worktrees.
- Preserve the six unrelated dirty files; never stash, reset, clean, stage, or overwrite them.
- Use strict RED → GREEN for every behavior/configuration slice.
- Use GitHub Pages as primary; use Vercel only after a concrete Pages blocker is verified.
- The public route is `/auction?id=<positive-u64>` under Pages base path `/cipherbid`.
- Ready X exclusively owns wallet keys, viewing keys, private notes, note selection, proofs, signing, and submission.
- No shielded-balance probe, secret expression, dotenv loading, runtime evidence, signer data, or recovery payload may enter the bundle or workflow.
- Defer bidder deposits, auction creation, bids, reveals, settlement, claims, transaction registration, and final video until the paired final test with the user.
- Finish and verify all independent source/deployment work, then commit and promote it through `development → staging → main` before that paired test.
- Keep `strk20.json.transactions`, `demo_url`, and `demo_video` empty until their separate public evidence gates pass.
- Pin every external GitHub Action to the following verified immutable SHA:
  - `actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1` (`v7.0.1`)
  - `actions/setup-node@820762786026740c76f36085b0efc47a31fe5020` (`v7.0.0`)
  - `actions/configure-pages@45bfe0192ca1faeb007ade9deae92b16b8254a0d` (`v6.0.0`)
  - `actions/upload-pages-artifact@fc324d3547104276b827a68afc52ff2a11cc49c9` (`v5.0.0`)
  - `actions/deploy-pages@cd2ce8fcbc39b97be8ca5fce6e763baed58fa128` (`v5.0.0`)

---

### Task 1: Static Auction Route Contract

**Files:**

- Create: `web/src/features/auction/auctionRoute.ts`
- Create: `web/tests/unit/auctionRoute.test.ts`
- Modify: `web/src/app/page.tsx`
- Modify: `web/tests/unit/Home.test.tsx`

**Interfaces:**

- Produces: `parseAuctionIdValues(values: readonly string[]): AuctionRouteResult`
- Produces: `buildAuctionHref(value: string): string`
- `AuctionRouteResult` is either `{ ok: true; auctionId: bigint; canonicalId: string }` or `{ ok: false; displayId: string; error: string }`.

- [ ] **Step 1: Write the failing route tests**

Require:

```ts
expect(parseAuctionIdValues(["7"])).toEqual({
  ok: true,
  auctionId: 7n,
  canonicalId: "7",
});
expect(parseAuctionIdValues([])).toMatchObject({ ok: false });
expect(parseAuctionIdValues(["7", "8"])).toMatchObject({ ok: false });
expect(parseAuctionIdValues(["0"])).toMatchObject({ ok: false });
expect(parseAuctionIdValues(["18446744073709551616"])).toMatchObject({
  ok: false,
});
expect(parseAuctionIdValues(["%3Cscript%3E"])).toMatchObject({ ok: false });
expect(buildAuctionHref("7")).toBe("/auction?id=7");
```

Update `Home.test.tsx` to require `/auction?id=1`.

- [ ] **Step 2: Run RED**

Run:

```bash
node node_modules/vitest/vitest.mjs run tests/unit/auctionRoute.test.ts tests/unit/Home.test.tsx
```

Expected: failure because `auctionRoute.ts` does not exist and the home link still uses `/auctions/1`.

- [ ] **Step 3: Implement the minimal pure route module**

Use one strict decimal regex, `decodeURIComponent` inside `try/catch`, a maximum display length of 80 characters, an exact one-value requirement, and a `u64` upper bound. `buildAuctionHref` must emit only the canonical query-route shape.

Update `Home` to use `buildAuctionHref(safeAuctionId)`.

- [ ] **Step 4: Run GREEN**

Run the focused Vitest command from Step 2. Expected: both files pass.

- [ ] **Step 5: Commit the route slice**

```bash
git add web/src/features/auction/auctionRoute.ts web/tests/unit/auctionRoute.test.ts web/src/app/page.tsx web/tests/unit/Home.test.tsx
git commit -m "feat(web): add static auction route contract"
```

### Task 2: Browser Public-Read Loader

**Files:**

- Create: `web/src/config/publicDeployment.ts`
- Create: `web/src/features/auction/auctionLiveViewModel.ts`
- Create: `web/src/features/auction/auctionBrowserLoader.ts`
- Create: `web/src/features/auction/ui/AuctionPageClient.tsx`
- Create: `web/src/app/auction/page.tsx`
- Create: `web/tests/unit/publicDeployment.test.ts`
- Create: `web/tests/unit/auctionLiveViewModel.test.ts`
- Create: `web/tests/unit/AuctionPageClient.test.tsx`
- Delete: `web/src/app/auctions/[auctionId]/page.tsx`
- Modify: `web/scripts/create-mainnet-auction.ts`
- Modify: `web/scripts/create-sepolia-auction.ts`

**Interfaces:**

- Produces: `loadPublicDeploymentManifest(): DeploymentManifest` using direct `process.env.NEXT_PUBLIC_*` references.
- Produces: `toAuctionLiveViewModel(manifest, snapshot): AuctionLiveViewModel`.
- Produces: `loadAuctionLiveViewModel(auctionId: bigint): Promise<AuctionLiveViewModel>`.
- Produces: `AuctionPageClient({ loadModel? })`; the injectable loader exists only for deterministic component tests.

- [ ] **Step 1: Write public-manifest and view-model RED tests**

Require direct mainnet manifest mapping and canonical validation. Freeze the existing snapshot-to-view-model fields currently embedded in the dynamic server page.

Run:

```bash
node node_modules/vitest/vitest.mjs run tests/unit/publicDeployment.test.ts tests/unit/auctionLiveViewModel.test.ts
```

Expected: module-not-found failures.

- [ ] **Step 2: Implement public manifest and pure view-model conversion**

`loadPublicDeploymentManifest` passes exactly these direct references into `loadDeploymentManifest`:

```ts
{
  NEXT_PUBLIC_CIPHERBID_NETWORK: process.env.NEXT_PUBLIC_CIPHERBID_NETWORK,
  NEXT_PUBLIC_STARKNET_RPC_URL: process.env.NEXT_PUBLIC_STARKNET_RPC_URL,
  NEXT_PUBLIC_AUCTION_HOUSE_ADDRESS: process.env.NEXT_PUBLIC_AUCTION_HOUSE_ADDRESS,
  NEXT_PUBLIC_AUCTION_HOUSE_CLASS_HASH: process.env.NEXT_PUBLIC_AUCTION_HOUSE_CLASS_HASH,
  NEXT_PUBLIC_STRK20_POOL_ADDRESS: process.env.NEXT_PUBLIC_STRK20_POOL_ADDRESS,
  NEXT_PUBLIC_STRK_TOKEN_ADDRESS: process.env.NEXT_PUBLIC_STRK_TOKEN_ADDRESS,
}
```

Move the current `hex` and `viewModel` conversion logic without semantic changes.

- [ ] **Step 3: Run the first GREEN**

Run the focused command from Step 1. Expected: both files pass.

- [ ] **Step 4: Write AuctionPageClient RED tests**

Cover:

- initial loading state;
- one valid `id=7` invoking the injected loader with `7n`;
- verified model rendering;
- invalid and duplicate IDs failing before the loader;
- loader rejection rendering an honest bounded error;
- Retry invoking a new load;
- stale first request unable to overwrite a newer retry result;
- hostile query text rendered inert and capped.

Run:

```bash
node node_modules/vitest/vitest.mjs run tests/unit/AuctionPageClient.test.tsx
```

Expected: module-not-found failure.

- [ ] **Step 5: Implement the browser loader and static page**

`auctionBrowserLoader.ts` constructs `RpcProvider`, adapts it to `ChainReader`, calls `readAuctionSnapshot`, then `toAuctionLiveViewModel`.

`AuctionPageClient` uses `useSearchParams`, an incrementing request generation, and an effect cleanup guard. Render `AuctionLivePage` only with a verified model. The route page wraps the client in `Suspense` with a visible loading fallback.

Delete the dynamic server page. Update generated local auction URLs to `http://localhost:4110/auction?id=<id>`.

- [ ] **Step 6: Run GREEN and affected tests**

```bash
node node_modules/vitest/vitest.mjs run tests/unit/AuctionPageClient.test.tsx tests/unit/AuctionLivePage.test.tsx tests/unit/auctionReader.test.ts tests/unit/publicDeployment.test.ts tests/unit/auctionLiveViewModel.test.ts
```

Expected: all pass.

- [ ] **Step 7: Commit the browser-loader slice**

Stage only the files listed in Task 2 and commit:

```bash
git commit -m "feat(web): load auctions from public RPC in browser"
```

### Task 3: Deterministic Static Export

**Files:**

- Modify: `web/next.config.ts`
- Create: `web/tests/unit/nextConfig.test.ts`
- Modify: `web/tests/unit/playwrightConfig.test.ts` only if its current assumptions need explicit local-mode coverage
- Modify: `web/tests/e2e/auction-bid-preview.spec.ts`

**Interfaces:**

- Produces: `createNextConfig(environment: NodeJS.ProcessEnv): NextConfig`.
- Pages mode is selected only by `CIPHERBID_PAGES_BUILD === '1'`.

- [ ] **Step 1: Write RED configuration tests**

Require Pages mode to return:

```ts
{
  output: 'export',
  basePath: '/cipherbid',
  trailingSlash: true,
}
```

Require local mode to omit export/basePath and preserve the current Playwright-owned Next server.

Run:

```bash
node node_modules/vitest/vitest.mjs run tests/unit/nextConfig.test.ts tests/unit/playwrightConfig.test.ts
```

Expected: `createNextConfig` is missing.

- [ ] **Step 2: Implement minimal conditional Next configuration**

Export `createNextConfig` and default-export `createNextConfig(process.env)`. Reject any non-empty Pages base path other than `/cipherbid`; do not accept a user-controlled runtime path.

- [ ] **Step 3: Move browser contracts to `/auction?id=…`**

Update Playwright assertions:

- home emits `/auction?id=7`;
- hostile input uses `/auction?id=<encoded>`;
- invalid route returns HTTP 200 with honest unavailable state;
- desktop, 390px mobile, reduced motion, focus order, overflow, and zero console/page errors remain.

- [ ] **Step 4: Run focused GREEN**

```bash
node node_modules/vitest/vitest.mjs run tests/unit/nextConfig.test.ts tests/unit/playwrightConfig.test.ts
node node_modules/@playwright/test/cli.js test tests/e2e/auction-bid-preview.spec.ts
```

Expected: focused unit and browser suites pass.

- [ ] **Step 5: Prove the mainnet static export**

Run with the verified public mainnet values already represented by `.env.local` plus:

```bash
CIPHERBID_PAGES_BUILD=1 node node_modules/next/dist/bin/next build --webpack
```

Expected: exit `0`, `web/out/index.html`, `web/out/create/index.html`, `web/out/demo/setup/index.html`, and `web/out/auction/index.html` exist; no dynamic route is reported.

- [ ] **Step 6: Commit the static-export slice**

```bash
git commit -m "feat(web): export CipherBid for GitHub Pages"
```

### Task 4: Public Pages Workflow Policy and Deployment Workflow

**Files:**

- Modify: `web/package.json`
- Modify: `web/pnpm-lock.yaml`
- Create: `web/src/config/pagesWorkflowPolicy.ts`
- Create: `web/scripts/verify-pages-workflow.ts`
- Create: `web/tests/unit/pagesWorkflowPolicy.test.ts`
- Create: `.github/workflows/deploy-pages.yml`

**Interfaces:**

- Produces: `verifyPagesWorkflow(document: unknown): readonly string[]` where an empty result is approval.
- Adds dev dependency `yaml@2.9.0`.
- Adds package script `pages:verify` invoking the policy verifier.

- [ ] **Step 1: Add `yaml@2.9.0` and write RED policy tests before the workflow**

The baseline test reads `.github/workflows/deploy-pages.yml` and must fail because it does not exist. Unit fixtures must also reject:

- `pull_request_target`;
- `secrets.NAME`, `secrets['NAME']`, and `secrets["NAME"]`;
- mutable action tags;
- duplicate action slug with an unapproved SHA;
- `actions/checkout` without `persist-credentials: false`;
- dotenv references;
- artifact path other than `web/out`;
- deployment from a branch other than `main`.

Run:

```bash
node node_modules/vitest/vitest.mjs run tests/unit/pagesWorkflowPolicy.test.ts
```

Expected: baseline fails because the workflow is missing; adversarial fixture assertions pass as they are added.

- [ ] **Step 2: Implement the closed workflow verifier**

Parse YAML with `yaml.parse`, require exact objects/arrays/scalars, enumerate every `uses:` occurrence without dictionary deduplication, compare the full ordered action list to the five approved pins, and return generic policy errors without rendering arbitrary workflow values.

- [ ] **Step 3: Add the pinned Pages workflow**

Workflow requirements:

```yaml
name: Deploy CipherBid Pages
on:
  push:
    branches: [main]
  workflow_dispatch:
permissions:
  contents: read
concurrency:
  group: pages
  cancel-in-progress: false
```

Build job:

- Ubuntu runner;
- checkout pin with `persist-credentials: false`;
- setup-node pin using Node `24.13.1`, pnpm cache, and `web/pnpm-lock.yaml`;
- `corepack enable`;
- `pnpm install --frozen-lockfile` in `web`;
- `pnpm pages:verify`, `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test`;
- build with `CIPHERBID_PAGES_BUILD=1` and the six exact public mainnet values;
- configure-pages pin;
- upload-pages-artifact pin with `path: web/out`.

Deploy job:

- depends on build;
- `pages: write` and `id-token: write`, with unspecified permissions `none`;
- GitHub Pages environment and URL output;
- deploy-pages immutable pin.

- [ ] **Step 4: Run GREEN and adversarial policy suite**

```bash
node node_modules/vitest/vitest.mjs run tests/unit/pagesWorkflowPolicy.test.ts
node node_modules/tsx/dist/cli.mjs scripts/verify-pages-workflow.ts
```

Expected: baseline and every negative fixture pass, verifier exits `0`.

- [ ] **Step 5: Commit the workflow slice**

```bash
git commit -m "ci: deploy CipherBid through pinned GitHub Pages workflow"
```

### Task 5: Documentation and Complete Pre-Lifecycle Verification

**Files:**

- Modify: `README.md`
- Modify: `docs/evidence/README.md`
- Create: `docs/evidence/submission/pages-deployment.md` only after hosted readback succeeds
- Modify: `strk20.json` only after the final real lifecycle route is public; before then leave URL and transaction fields empty

**Interfaces:**

- Documents canonical Pages URL, static query route, browser public-read boundary, local commands, and Vercel fallback rule.

- [ ] **Step 1: Update documentation truthfully**

Document the canonical route and Pages build command. Explicitly state that no real auction/lifecycle receipt is published before the paired test.

- [ ] **Step 2: Run complete local Web gates**

```bash
node node_modules/vitest/vitest.mjs run
node node_modules/@playwright/test/cli.js test
node node_modules/prettier/bin/prettier.cjs --check .
node node_modules/eslint/bin/eslint.js .
node node_modules/typescript/bin/tsc --noEmit --incremental false
CIPHERBID_PAGES_BUILD=1 node node_modules/next/dist/bin/next build --webpack
pnpm audit --audit-level high
```

Expected: all exit `0` with `151+` unit/integration tests and all configured Chromium tests passing.

- [ ] **Step 3: Run repository gates**

From repository root:

```bash
scarb fmt --check --manifest-path contracts/Scarb.toml
scarb build --manifest-path contracts/Scarb.toml
snforge test --manifest-path contracts/Scarb.toml
git diff --check
codegraph sync
```

Expected: Cairo `25/25`, whitespace clean, index current.

- [ ] **Step 4: Freeze, scan, and commit the complete implementation**

Stage only hosting/frontend/evidence files, record the staged binary SHA-256, require zero forbidden paths and zero secret candidates, then commit:

```bash
git commit -m "feat: publish durable CipherBid mainnet frontend"
```

### Task 6: Promote to Main and Verify GitHub Pages

**Files/State:**

- Git refs and GitHub PRs only; preserve working-tree dirty files.
- GitHub Pages repository setting.
- Public deployment evidence after readback.

- [ ] **Step 1: Push and merge feature branch into `development`**

Fetch first, bind the exact feature SHA, push without force, open a PR targeting `development`, verify file count/checks/mergeability, merge, and read back the exact remote merge SHA/tree.

- [ ] **Step 2: Promote `development → staging` with a target-based disposable branch if histories are noisy**

Compare two-dot tree delta first. Do not push directly to `staging`. Preserve durable branches and `delete_branch_on_merge: false`.

- [ ] **Step 3: Promote `staging → main` through review**

Use the same target-based promotion rule, merge only the intended tree delta, and verify `main` contains the exact approved source tree.

- [ ] **Step 4: Enable Pages workflow mode and verify hosted run**

Create/update Pages through the GitHub API with workflow build mode. Read back:

- Pages API status and canonical URL;
- successful workflow run and deployment environment;
- exact deployed `main` SHA;
- public HTTP 200 for root, `/create/`, `/demo/setup/`, and `/auction/?id=1`;
- correct headings and an honest unavailable state for auction `1`;
- no-login browser rendering, base-path assets, mobile width, no overflow, and no console/page errors.

- [ ] **Step 5: Publish secret-free Pages evidence**

Create `docs/evidence/submission/pages-deployment.md` with exact public URL, deployed SHA, workflow run URL, verification timestamp, and route checks. Do not add lifecycle hashes or call auction `1` real.

- [ ] **Step 6: Commit and promote the evidence-only follow-up to `main`**

Use the same branch flow and verify the Pages site redeploys from the evidence commit. Keep `strk20.json.demo_url` empty until the final paired lifecycle proves the real auction route.

## Final Paired Test Boundary

After all tasks above are complete and `main` is public, stop before any wallet-controlled write. The final session with the user performs, in order:

1. both Ready X `24 STRK` deposits and ten-block maturity;
2. short-window auction creation;
3. Bidder A `2 STRK` ingress;
4. Bidder B `3 STRK` ingress;
5. both encrypted-recovery reveals;
6. settlement and NFT owner readback;
7. loser refund, winner surplus, and economically viable seller proceeds;
8. lifecycle/value-conservation evidence;
9. public Atomic Delivery Receipt;
10. video recording/publication;
11. verified qualifying hashes, durable URL, and video URL in `strk20.json`;
12. final gates, hub readback, commit, promotion to `main`, and hackathon submission handoff.
