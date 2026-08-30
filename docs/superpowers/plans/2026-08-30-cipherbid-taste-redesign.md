# CipherBid Taste Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Do not dispatch subagents; CipherBid allows one writer in one canonical checkout.

**Goal:** Replace CipherBid's generic purple/glow/card visual language with a cohesive industrial black-chrome and signal-green system across every public route, without changing product behavior.

**Architecture:** Establish semantic CSS tokens and global compatibility overrides first, then apply presentation-only class changes to clean UI files. Do not edit the currently dirty `AuctionActions.tsx` or `AuctionLivePage.tsx`; shared `.cipherbid-auction-page` styles must carry the redesign into those routes. Stage an explicit design-only allowlist so unrelated local protocol, evidence, video, and recovery work remains untouched.

**Tech Stack:** Next.js, React, Tailwind CSS v4, Vitest, Testing Library, Playwright, static GitHub Pages export.

## Global Constraints

- Visual-only: no copy, transaction, wallet, chain, recovery, contract, manifest, route, field-order, label, or authority changes.
- Palette: graphite, chrome, bone, and one signal-green accent; no purple glow.
- Geometry: 4px panels, 2px controls, pills only for real state.
- Motion intensity 3: hover/focus/active only; reduced-motion disables transitions.
- Keep 44px interaction targets, visible focus, one main landmark, and zero narrow-viewport overflow.
- Preserve all unrelated dirty paths; no stash, reset, clean, worktree, or duplicate checkout.
- Feature branch targets `development`; promote through `staging` to `main` by PR.

---

### Task 1: Freeze visual contracts

**Files:**

- Create: `web/tests/unit/designTasteSystem.test.ts`
- Modify: `web/tests/unit/Home.test.tsx`

**Interfaces:**

- Consumes: existing rendered home route and source files.
- Produces: a source/render contract for shared shell tokens, signal-green accent, real auction-reader visual, and no purple literals in the design-only files.

- [ ] Add a test that reads `globals.css`, `layout.tsx`, and the intended clean UI files and expects `--cb-accent`, `.cipherbid-root`, `.cb-panel`, `.cb-control`, and zero occurrences of `#6654d9`, `#7170ff`, or `#a8b1ff` in that allowlist.
- [ ] Extend `Home.test.tsx` to require a `Live auction reader` named region and four proof facts presented as one definition list, while preserving existing route/link assertions.
- [ ] Run:

```bash
node node_modules/vitest/vitest.mjs run tests/unit/designTasteSystem.test.ts tests/unit/Home.test.tsx
```

Expected: FAIL because tokens/region are absent and purple literals remain.

### Task 2: Build the shared visual system and homepage

**Files:**

- Modify: `web/src/app/globals.css`
- Modify: `web/src/app/layout.tsx`
- Modify: `web/src/app/page.tsx`

**Interfaces:**

- Consumes: Tailwind v4 and existing route behavior.
- Produces: `.cipherbid-root`, `.cipherbid-auction-page`, `.cb-panel`, `.cb-control`, `.cb-primary`, `.cb-secondary`, `.cb-kicker`, and route-wide compatibility overrides.

- [ ] Define semantic color, type, radius, border, and focus tokens in `globals.css`.
- [ ] Set the body shell class in `layout.tsx` while preserving metadata copy exactly.
- [ ] Recompose `page.tsx` as an asymmetric 7/5 hero with the functional auction reader as the real product visual.
- [ ] Replace the four card tiles with one divider-based proof strip; preserve all fact text and links.
- [ ] Add hover/active/focus rules and complete reduced-motion fallback.
- [ ] Run the Task 1 tests and strict TypeScript.

### Task 3: Apply the system to creation and bidder setup

**Files:**

- Modify: `web/src/features/auction/ui/SellerCreatePage.tsx`
- Modify: `web/src/features/auction/ui/SellerCreateForm.tsx`
- Modify: `web/src/features/demo/ui/DemoBidderSetupPage.tsx`
- Modify: `web/src/features/wallet/WalletConnectPanel.tsx`

**Interfaces:**

- Consumes: shared `cb-*` classes from Task 2.
- Produces: consistent route intros, wallet rail, form workbench, actions, statuses, errors, and result links.

- [ ] Replace visual class strings only; do not alter handlers, state, field arrays, labels, disabled predicates, wallet dependencies, or form submission.
- [ ] Keep wallet option buttons and account facts semantically identical with the new chrome/green states.
- [ ] Use the same one-column mobile fallback and 44px controls.
- [ ] Run focused seller, bidder-setup, and wallet tests plus TypeScript.

### Task 4: Apply the system to auction evidence surfaces

**Files:**

- Modify: `web/src/features/auction/ui/AtomicDeliveryReceipt.tsx`
- Modify: `web/src/features/auction/ui/AuctionBidPreview.tsx`
- Modify: `web/src/features/auction/ui/ProtocolConsole.tsx`
- Modify: `web/src/features/auction/ui/SecondPriceIllustration.tsx`
- Do not modify: `web/src/features/auction/ui/AuctionActions.tsx`
- Do not modify: `web/src/features/auction/ui/AuctionLivePage.tsx`

**Interfaces:**

- Consumes: shared tokens and compatibility overrides.
- Produces: visually unified lot, protocol console, second-price chart, receipt list, privacy boundary, and preview states.

- [ ] Replace purple chart stops and semantic accents with signal green and steel.
- [ ] Flatten nested card hierarchy with dividers/spacing while preserving all labels and data.
- [ ] Preserve placeholder and status copy exactly while changing presentation only.
- [ ] Let global compatibility selectors restyle the dirty live-action files without editing their bytes.
- [ ] Run focused auction/receipt/page tests and strict TypeScript.

### Task 5: Verify, freeze, and deliver

**Files:**

- Modify only files listed in Tasks 1-4 plus:
  - `docs/superpowers/specs/2026-08-30-cipherbid-taste-redesign.md`
  - `docs/superpowers/plans/2026-08-30-cipherbid-taste-redesign.md`

**Interfaces:**

- Produces: an immutable, design-only commit and promoted public Pages revision.

- [ ] Run Prettier, ESLint, strict TypeScript, all Vitest tests, Playwright, normal build, Pages build, dependency audit, Cairo format/build/tests, and `git diff --check`.
- [ ] Run real Chromium desktop and true 390px checks for `/`, `/create/`, `/demo/setup/`, and `/auction/?id=1788040057342`: HTTP 200, expected heading, zero overflow, no console/page errors, keyboard focus, and reduced-motion stability.
- [ ] Verify no intended staged path contains transaction construction, wallet capability, chain configuration, recovery cryptography, manifest, evidence, or contract changes.
- [ ] Stage only the explicit design allowlist and record the staged file list/digest.
- [ ] Commit on `feat/cipherbid-taste-redesign`, push, open a PR to `development`, wait for hosted Web/Cairo CI, and merge.
- [ ] Promote the exact tree through target-based PRs to `staging` and `main` without deleting durable environment branches.
- [ ] Watch final CI and Pages deployment; read back all four public routes from final `main`.
