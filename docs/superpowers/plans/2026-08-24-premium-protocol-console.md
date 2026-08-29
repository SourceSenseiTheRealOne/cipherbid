# Premium Protocol Console Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Modernize CipherBid's visual-only auction detail page into a premium dark protocol-console while keeping every product interaction disabled and truthful.

**Architecture:** Keep `AuctionBidPreview` as the route-level presentational composition. Add a small `ProtocolConsole` presentational component, update the existing chart/page surface tokens, and test semantic contracts rather than CSS implementation details. No chain, wallet, secret, or stateful client module is imported.

**Tech Stack:** Next.js App Router, React, TypeScript, Tailwind CSS, Vitest, Testing Library, Playwright.

## Global Constraints

- The page is visual-only: no RPC, wallet, STRK20 action, transaction, storage, key, or secret flow.
- Unknown onchain state remains an explicit placeholder.
- Preserve the accurate equal-public-cap privacy language.
- Respect reduced motion and retain zero-overflow mobile behavior.
- Follow RED → GREEN → REFACTOR and stage only intended files.

---

### Task 1: Protocol console and dark visual hierarchy

**Files:**
- Create: `web/src/features/auction/ui/ProtocolConsole.tsx`
- Modify: `web/src/features/auction/ui/AuctionBidPreview.tsx`
- Modify: `web/src/features/auction/ui/SecondPriceIllustration.tsx`
- Modify: `web/src/app/globals.css`
- Modify: `web/src/app/layout.tsx`
- Test: `web/tests/unit/AuctionBidPreview.test.tsx`
- Test: `web/tests/e2e/auction-bid-preview.spec.ts`

**Interfaces:**
- Produces `ProtocolConsole(): JSX.Element`, a static aria-labelled region with no props and no external dependencies.
- `AuctionBidPreview({ auctionId })` remains the route-level API.

- [ ] Write a failing unit test requiring `Protocol state`, `Uniform cap collateral`, and `Design preview` in a labelled protocol-console region.
- [ ] Run the focused unit test and confirm it fails because the console does not exist.
- [ ] Add the static presentational component and compose it into the auction layout.
- [ ] Update dark surfaces, hierarchy, focus-visible treatment, and metadata without adding motion or product behavior.
- [ ] Run focused unit tests until green.
- [ ] Add browser assertions for console visibility, desktop layout, and true-mobile ordering.
- [ ] Run focused Playwright tests and confirm green.

### Task 2: Full verification and delivery

**Files:**
- Modify: `docs/superpowers/specs/2026-08-24-premium-protocol-console-design.md`
- Modify: `docs/superpowers/plans/2026-08-24-premium-protocol-console.md`

- [ ] Run formatter, lint, strict TypeScript, unit tests, Playwright, production build, audit, and configured Cairo gates.
- [ ] Verify desktop and true 390px mobile rendering with no overflow, logical keyboard order, and reduced-motion behavior.
- [ ] Stage only the intended UI/docs/test/metadata files and run `git diff --cached --check`.
- [ ] Obtain an independent review of exactly the staged diff; fix all blockers and rerun affected gates.
- [ ] Commit the immutable reviewed slice, push its feature branch, and verify the remote SHA.
