# Auction Bid Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and ship a responsive, accessible, visual-only bidding-open auction detail page at `/auctions/[auctionId]` without adding auction logic or invented chain data.

**Architecture:** A dynamic App Router server page sanitizes and forwards only the route ID to one presentational `AuctionBidPreview` component. The component owns static authored explanatory copy and truthful unavailable-value placeholders; it accepts no auction object, wallet, callbacks, secrets, or transaction methods. Existing Tailwind utilities provide layout, while narrowly scoped global tokens cover the CSS-authored NFT artwork, reduced motion, and responsive evidence table.

**Tech Stack:** Next.js 16 App Router, React 19, strict TypeScript, Tailwind CSS 4, Vitest, Testing Library, Playwright Chromium.

## Global Constraints

- Route is exactly `/auctions/[auctionId]`; visual verification uses `/auctions/design-preview`.
- Design-only: no RPC/contract reads, Wallet API methods, hooks, callbacks, bid secrets, storage, transaction preparation, or submission.
- No invented seller, token, deadline, reserve, cap, bid-count, transaction, or NFT metadata values.
- Unavailable chain values render as `—`, `Awaiting chain data`, or `Awaiting deployment`.
- Reuse only high-level Crafts hierarchy; do not copy Crafts source, CSS values, copy, assets, branding, or Solana models.
- Preserve the warm editorial/graphite/Starknet-violet design direction from the approved spec.
- No new runtime dependency.
- All interactive-looking bid controls are natively disabled.
- Respect `prefers-reduced-motion: reduce`; no autoplay or JavaScript animation.
- Preserve unrelated dirty and line-ending-only workspace state; stage only intended paths.

---

### Task 1: Create the truthful dynamic route and semantic preview component

**Files:**
- Create: `web/src/app/auctions/[auctionId]/page.tsx`
- Create: `web/src/features/auction/ui/AuctionBidPreview.tsx`
- Create: `web/tests/unit/AuctionBidPreview.test.tsx`

**Interfaces:**
- Consumes: App Router `params: Promise<{ auctionId: string }>`.
- Produces: `AuctionBidPreview({ auctionId }: Readonly<{ auctionId: string }>): React.JSX.Element`.
- Invariant: `AuctionBidPreview` has exactly one prop and no client directive.

- [ ] **Step 1: Write the failing component contract**

Add tests that render `AuctionBidPreview` with an injection-shaped route string and assert:

```tsx
render(<AuctionBidPreview auctionId={'design-preview<script>alert(1)</script>'} />)

expect(screen.getByRole('heading', { level: 1, name: 'A genuinely sealed NFT auction' })).toBeInTheDocument()
expect(screen.getByText('Design preview')).toBeInTheDocument()
expect(screen.getByText('design-preview<script>alert(1)</script>')).toBeInTheDocument()
expect(document.querySelector('script')).toBeNull()
expect(screen.getByLabelText('Bid amount')).toBeDisabled()
expect(screen.getByRole('button', { name: 'Bidding unavailable in design preview' })).toBeDisabled()
```

Assert the page includes the labels `Reserve`, `Uniform collateral cap`, `Bid deadline`, and `Reveal window`, and that each corresponding value is `—` or `Awaiting chain data`.

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
npx --yes pnpm@10.18.1 --dir web exec vitest run tests/unit/AuctionBidPreview.test.tsx
```

Expected: import resolution fails because `AuctionBidPreview.tsx` does not exist.

- [ ] **Step 3: Implement the minimum semantic component**

Create a server-safe component with this boundary:

```tsx
export type AuctionBidPreviewProps = Readonly<{ auctionId: string }>

export function AuctionBidPreview({ auctionId }: AuctionBidPreviewProps) {
  return (
    <main>
      <p>Design preview</p>
      <h1>A genuinely sealed NFT auction</h1>
      <code>{auctionId}</code>
      <label htmlFor="bid-amount">Bid amount</label>
      <input id="bid-amount" disabled placeholder="Enter amount" />
      <button type="button" disabled>
        Bidding unavailable in design preview
      </button>
    </main>
  )
}
```

Expand the semantic structure to include header navigation, auction facts, lifecycle, privacy truth table, and chain evidence using only authored explanatory copy and unavailable placeholders.

- [ ] **Step 4: Implement route-ID sanitization and dynamic page**

Use a bounded display helper in the route file:

```tsx
function displayAuctionId(value: string): string {
  const normalized = value.trim().slice(0, 80)
  return normalized.length > 0 ? normalized : 'unknown'
}

export default async function AuctionPage({ params }: { params: Promise<{ auctionId: string }> }) {
  const { auctionId } = await params
  return <AuctionBidPreview auctionId={displayAuctionId(auctionId)} />
}
```

React text escaping remains the XSS boundary; do not use `dangerouslySetInnerHTML`.

- [ ] **Step 5: Run focused tests and typecheck**

Run:

```bash
npx --yes pnpm@10.18.1 --dir web exec vitest run tests/unit/AuctionBidPreview.test.tsx
npx --yes pnpm@10.18.1 --dir web typecheck
```

Expected: all focused tests pass and TypeScript exits 0.

- [ ] **Step 6: Commit the semantic slice**

```bash
git add web/src/app/auctions/[auctionId]/page.tsx web/src/features/auction/ui/AuctionBidPreview.tsx web/tests/unit/AuctionBidPreview.test.tsx
git commit -m "feat(web): scaffold truthful auction bid preview"
```

---

### Task 2: Apply the approved responsive visual system

**Files:**
- Modify: `web/src/features/auction/ui/AuctionBidPreview.tsx`
- Modify: `web/src/app/globals.css`
- Modify: `web/tests/unit/AuctionBidPreview.test.tsx`

**Interfaces:**
- Consumes: semantic component from Task 1.
- Produces: stable selectors `data-testid="auction-layout"`, `data-testid="bid-preview-card"`, `id="privacy"`, and class `cipherbid-auction-art` for browser verification.

- [ ] **Step 1: Add RED structural layout assertions**

Assert the component includes:

```tsx
expect(screen.getByTestId('auction-layout')).toHaveClass('lg:grid-cols-12')
expect(screen.getByTestId('bid-preview-card')).toHaveClass('lg:sticky')
expect(screen.getByRole('region', { name: 'Private and public auction data' })).toHaveAttribute('id', 'privacy')
expect(screen.getByText('NFT lot')).toBeInTheDocument()
expect(screen.getByText('Lock equal collateral')).toBeInTheDocument()
expect(screen.getByText('Highest bidder pays second price')).toBeInTheDocument()
expect(screen.getByText('Wallet not connected')).toBeInTheDocument()
```

Assert the exact verified Sepolia pool address is visible:

```text
0x0254a6b2997ef52e9f830ce1f543f6b29768295e8d17e2267d672c552cfe0d91
```

- [ ] **Step 2: Run focused test and verify RED**

Run the Task 1 focused Vitest command.

Expected: failures for missing layout selectors and visual content.

- [ ] **Step 3: Implement desktop hierarchy**

Use a `lg:grid-cols-12` layout:

- left wrapper: `lg:col-span-7`
- right wrapper: `lg:col-span-5`
- bid card: `lg:sticky lg:top-8`

Use warm stone page background, graphite text, violet status/accent, fine borders, tabular/monospace value rows, and conservative radii. Keep all placeholders truthful.

- [ ] **Step 4: Implement mobile order and accessible controls**

Keep document order:

1. header
2. auction title
3. NFT lot
4. bid card
5. facts
6. mechanism
7. privacy
8. evidence

Use native disabled input/button semantics, at least 44px control height, wrapping addresses, one `h1`, and valid section-heading hierarchy.

- [ ] **Step 5: Add bounded CSS artwork and reduced-motion rules**

Add namespaced rules only:

```css
.cipherbid-auction-art {
  background:
    radial-gradient(circle at 72% 28%, rgb(125 92 255 / 0.42), transparent 32%),
    linear-gradient(145deg, #17151f, #2b2441 52%, #7564d8);
}

@media (prefers-reduced-motion: reduce) {
  .cipherbid-auction-page *,
  .cipherbid-auction-page *::before,
  .cipherbid-auction-page *::after {
    scroll-behavior: auto !important;
    transition: none !important;
    animation: none !important;
  }
}
```

Do not modify unrelated global selectors.

- [ ] **Step 6: Verify focused tests, format, lint, and typecheck**

Run:

```bash
npx --yes pnpm@10.18.1 --dir web exec prettier --write src/features/auction/ui/AuctionBidPreview.tsx src/app/globals.css tests/unit/AuctionBidPreview.test.tsx
npx --yes pnpm@10.18.1 --dir web exec vitest run tests/unit/AuctionBidPreview.test.tsx
npx --yes pnpm@10.18.1 --dir web lint
npx --yes pnpm@10.18.1 --dir web typecheck
```

Expected: all exit 0.

- [ ] **Step 7: Commit the visual system**

```bash
git add web/src/features/auction/ui/AuctionBidPreview.tsx web/src/app/globals.css web/tests/unit/AuctionBidPreview.test.tsx
git commit -m "feat(web): design private auction bid page"
```

---

### Task 3: Add real desktop/mobile browser verification

**Files:**
- Create: `web/tests/e2e/auction-bid-preview.spec.ts`
- Modify: `web/playwright.config.ts` only if a mobile project is needed; prefer per-test viewport to avoid unrelated changes.

**Interfaces:**
- Consumes: `/auctions/design-preview`.
- Produces: browser evidence for route health, console safety, responsive order, overflow, disabled controls, and reduced motion.

- [ ] **Step 1: Write the failing Playwright test**

Create one test with desktop and mobile sections:

```ts
test('renders the visual-only auction bid page safely', async ({ page }) => {
  const errors: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text())
  })
  page.on('pageerror', (error) => errors.push(error.message))

  const response = await page.goto('/auctions/design-preview')
  expect(response?.status()).toBe(200)
  await expect(page.getByRole('heading', { level: 1, name: 'A genuinely sealed NFT auction' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Bidding unavailable in design preview' })).toBeDisabled()
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0)
  expect(errors).toEqual([])
})
```

Add a mobile pass with `page.setViewportSize({ width: 390, height: 844 })`, assert `window.innerWidth === 390`, zero overflow, and compare bounding boxes to prove the NFT panel precedes the bid card and the bid card precedes facts.

Add a reduced-motion pass using `page.emulateMedia({ reducedMotion: 'reduce' })` and assert the computed transition duration on the bid card is `0s`.

- [ ] **Step 2: Run E2E and verify RED**

```bash
npx --yes pnpm@10.18.1 --dir web test:e2e
```

Expected: new test fails until route/layout selectors are complete, or passes only after Task 2 implementation is present; if it passes immediately, confirm each assertion exercises the requested route and selectors.

- [ ] **Step 3: Fix only browser-observed layout defects**

Adjust only component-local utilities or `.cipherbid-auction-*` CSS. Do not add product logic.

- [ ] **Step 4: Capture visual evidence**

Use Playwright screenshots from the test or browser automation to save temporary desktop and 390px mobile captures under the OS temp directory. Inspect hierarchy, clipping, disabled-state clarity, and address wrapping. Do not commit screenshots.

- [ ] **Step 5: Run focused and full frontend gates**

```bash
npx --yes pnpm@10.18.1 --dir web format:check
npx --yes pnpm@10.18.1 --dir web lint
npx --yes pnpm@10.18.1 --dir web typecheck
npx --yes pnpm@10.18.1 --dir web test
npx --yes pnpm@10.18.1 --dir web test:e2e
npx --yes pnpm@10.18.1 --dir web build
npx --yes pnpm@10.18.1 --dir web audit --audit-level=low
git diff --check
```

Expected: all exit 0; dependency audit reports no known vulnerabilities.

- [ ] **Step 6: Commit browser verification**

```bash
git add web/tests/e2e/auction-bid-preview.spec.ts
git commit -m "test(web): verify auction bid preview responsively"
```

---

### Task 4: Review, deliver, and verify hackathon visibility

**Files:**
- No planned source changes; only fixes demanded by review.

**Interfaces:**
- Consumes: exact staged feature diff and all gate output.
- Produces: reviewed feature branch, merged environment branches, and verified registry/repository visibility.

- [ ] **Step 1: Confirm exact scope and sensitive boundaries**

Run:

```bash
git diff development...HEAD --name-only
git diff development...HEAD --check
```

Verify no `.env`, `.codegraph`, wallet/session material, transaction hashes, product mock dataset, Crafts source, or unrelated paths are included.

- [ ] **Step 2: Run CodeGraph affected selection**

```bash
codegraph sync
codegraph affected web/src/app/auctions/[auctionId]/page.tsx web/src/features/auction/ui/AuctionBidPreview.tsx web/src/app/globals.css
```

Run every selected test plus the full frontend closure gates once more if review requires a mutation.

- [ ] **Step 3: Request independent staged-diff review**

Reviewer criteria:

- no product logic or fabricated chain data
- valid Next.js 16 App Router params handling
- semantic/accessibility correctness
- responsive and reduced-motion correctness
- no secret/wallet/RPC/transaction surface
- no Crafts source/copy leakage
- tests genuinely exercise SSR route and mobile layout

No Blocker or Important finding may remain.

- [ ] **Step 4: Push the feature branch and open PR to `development`**

```bash
git push -u origin feat/auction-bid-page-design
gh pr create --base development --head feat/auction-bid-page-design --title "feat: design CipherBid auction bidding page" --body $'## Summary\n- add the visual-only dynamic auction bid route\n- document privacy and Vickrey mechanics without fake chain data\n- verify desktop, mobile, reduced-motion, and no-action boundaries\n\n## Verification\n- format, lint, typecheck, Vitest, Playwright, build, and dependency audit pass\n- independent review reports no blocking or important findings'
```

- [ ] **Step 5: Merge prerequisite wallet branch first if still open**

If `feat/wallet-connect-spike` is not already in `development`, open/merge its reviewed PR first. Then update the auction-page PR comparison and require only the design commits to remain.

- [ ] **Step 6: Merge reviewed feature PR and promote environments**

Use GitHub PRs only:

1. `feat/auction-bid-page-design → development`
2. `development → staging`
3. `staging → main`

Never push directly to `development`, `staging`, or `main`.

- [ ] **Step 7: Verify immutable remote state**

Read back:

- merged PR URLs and states
- exact `main` SHA
- default branch is `main`
- `/auctions/design-preview` exists in the `main` tree
- `strk20.json` remains schema-valid and contains no fabricated evidence
- official registry still contains exactly the CipherBid repository and Telegram entry

- [ ] **Step 8: Verify hackathon tracking path**

Confirm upstream registry entry:

```json
{
  "repo_url": "https://github.com/SourceSenseiTheRealOne/cipherbid",
  "telegram": ["sourcesensei"]
}
```

Confirm the public CipherBid repository has new commits on its default `main` branch. Do not open a second registration PR; the sprint tracker reads repository updates automatically.
