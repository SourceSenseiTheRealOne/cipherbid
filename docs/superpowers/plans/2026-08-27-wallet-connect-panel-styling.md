# Wallet Connect Panel Styling Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle CipherBid’s reusable wallet connector into a compact, modern protocol card without changing Starter-Kit Wallet API behavior or the public-only state boundary.

**Architecture:** Keep all wallet discovery, connection, state transitions, and event invalidation in `WalletConnectPanel`. Add a local `walletInitial()` display helper and Tailwind-only presentation classes for disconnected, connecting, error, and connected states. The existing bid-preview composition continues to render the same component, so it inherits the style without an adapter or a second connector.

**Tech Stack:** Next.js 16, React 19, Tailwind CSS 4, Zustand, Vitest, Testing Library, Playwright.

## Global Constraints

- Do not request balances or add a private-wallet API call.
- Do not store wallet objects, keys, notes, credentials, or raw wallet errors in Zustand/browser persistence.
- Do not render wallet-provided icon URLs; generate a local initial avatar from the wallet name.
- All interactive controls remain at least 44px tall with visible keyboard focus.
- Existing reduced-motion CSS must continue to disable connector transitions.

---

### Task 1: Add failing visual-state contracts

**Files:**
- Modify: `web/tests/unit/WalletConnectPanel.test.tsx`
- Modify: `web/tests/unit/AuctionBidPreview.test.tsx`
- Modify: `web/tests/e2e/auction-bid-preview.spec.ts`

**Interfaces:**
- Consumes: `WalletConnectPanel` existing discovered, connecting, connected, error, and disconnect states.
- Produces: assertions for stable test IDs/classes and bid-page runtime visibility.

- [ ] **Step 1: Write failing tests**

Assert a discovered wallet row exposes `data-testid="wallet-option-ready"`, has a local `R` avatar, has the `min-h-11` target class, and remains a semantic button. Assert connected metadata is inside `data-testid="wallet-connected-state"`. Assert the auction route renders `data-testid="wallet-connect-module"` without horizontal overflow.

- [ ] **Step 2: Run tests to verify RED**

Run:

```bash
npx --yes pnpm@10.18.1 --dir web test -- tests/unit/WalletConnectPanel.test.tsx tests/unit/AuctionBidPreview.test.tsx
```

Expected: FAIL because the visual-state hooks and local avatar do not exist.

### Task 2: Implement the compact protocol card

**Files:**
- Modify: `web/src/features/wallet/WalletConnectPanel.tsx`

**Interfaces:**
- Consumes: `walletName(wallet): string`, Zustand public state, existing callbacks.
- Produces: `walletInitial(name: string): string` and stable `data-testid` values for disconnected, connected, and wallet-option states.

- [ ] **Step 1: Add `walletInitial`**

Return the first uppercase printable character from the wallet name, with `W` as the fallback. Do not read or render `wallet.icon`.

- [ ] **Step 2: Style each state**

Apply Tailwind classes to create:

- dark, fine-border protocol module;
- violet focus/hover wallet rows with local initial avatar and chevron;
- muted empty state;
- connecting status and cancel action;
- warning-toned public error panel;
- compact connected metadata grid with green compatibility chip and wrapped monospace account;
- secondary disconnect action.

- [ ] **Step 3: Run focused tests to GREEN**

Run:

```bash
npx --yes pnpm@10.18.1 --dir web test -- tests/unit/WalletConnectPanel.test.tsx tests/unit/AuctionBidPreview.test.tsx
npx --yes pnpm@10.18.1 --dir web typecheck
```

Expected: all focused tests and strict TypeScript pass.

### Task 3: Prove responsive browser behavior

**Files:**
- Modify: `web/tests/e2e/auction-bid-preview.spec.ts`

**Interfaces:**
- Consumes: `/auctions/design-preview` and `data-testid="wallet-connect-module"`.
- Produces: desktop and 390px mobile no-overflow evidence.

- [ ] **Step 1: Add browser assertions**

At desktop and 390px viewport widths, assert the connector is visible, the disabled bid CTA remains present, and `document.documentElement.scrollWidth - document.documentElement.clientWidth === 0`.

- [ ] **Step 2: Run the browser spec**

Run:

```bash
npx --yes pnpm@10.18.1 --dir web test:e2e
```

Expected: Playwright passes against a runner-owned server.

### Task 4: Closure

**Files:** No production changes beyond Tasks 1–2.

- [ ] **Step 1: Run full web gates**

```bash
npx --yes pnpm@10.18.1 --dir web format:check
npx --yes pnpm@10.18.1 --dir web lint
npx --yes pnpm@10.18.1 --dir web typecheck
npx --yes pnpm@10.18.1 --dir web test
npx --yes pnpm@10.18.1 --dir web test:e2e
npx --yes pnpm@10.18.1 --dir web build
```

- [ ] **Step 2: Verify staged scope**

```bash
git diff --check
git diff --cached --name-only
```

Expected: only wallet-panel styling, its tests, and the approved design/plan documents are staged.
