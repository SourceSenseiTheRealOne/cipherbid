# CipherBid Auction Bid Page — Visual Design Specification

**Date:** 2026-08-24

**Route:** `/auctions/[auctionId]`

**Scope:** Presentational design only; no auction reads, wallet actions, bid secrets, transaction preparation, or submission

## Objective

Create the first production-shaped CipherBid auction detail page for the bidding-open lifecycle. The page should communicate the NFT lot, the Vickrey mechanism, equal public collateral, and the private/public boundary clearly enough for a sprint judge to understand the product before any live protocol logic is connected.

The composition may reuse high-level lessons from Crafts—editorial hierarchy, a sticky action card, lifecycle explanation, evidence display, and mobile stacking—but must not copy Crafts source, styling values, copy, assets, branding, or Solana state models.

## Route and truthfulness

The page lives at the real App Router path `/auctions/[auctionId]`.

Because no auction query layer exists yet:

- The route may display the sanitized `auctionId` from the URL as technical context.
- Unavailable chain values render as `—` or `Awaiting chain data`.
- The page carries a visible `Design preview` badge.
- The primary action is disabled and reads `Bidding unavailable in design preview`.
- The page must not contain invented seller addresses, token IDs, deadlines, reserves, caps, bid counts, transaction hashes, or NFT metadata.
- No persistent product mock dataset, fixture, API response, or generated runtime data is introduced.

## Visual direction

CipherBid uses an original warm editorial system with technical precision:

- **Canvas:** warm stone/ivory rather than pure white.
- **Primary ink:** near-black graphite.
- **Accent:** restrained Starknet violet used only for active/private indicators and the disabled primary action treatment.
- **Privacy accent:** muted mint for truthful privacy-state cues, never as a promise of permanent secrecy.
- **Borders:** fine, low-contrast graphite lines.
- **Typography:** the inherited app/system font for prose and headings; monospace for chain identifiers, values, and evidence labels.
- **Depth:** subtle surface contrast and narrow shadows; no glassmorphism, giant gradients, glowing blobs, or excessive rounded cards.

The page should feel more like a premium auction catalogue crossed with a protocol console than a generic crypto dashboard.

## Desktop composition

Use a centered twelve-column layout with a maximum content width around 1200–1280px.

### Global header

A compact page header contains:

- `CipherBid` wordmark
- `Auctions` navigation label
- `How privacy works` anchor
- a neutral wallet-state pill reading `Wallet not connected`

The wallet pill is decorative and non-interactive in this slice.

### Auction header

The main header contains:

- breadcrumb: `Auctions / Auction {auctionId}`
- `Design preview` badge
- `Bidding open` visual status badge
- headline: `A genuinely sealed NFT auction`
- concise description of equal STRK collateral and second-price settlement
- a technical route-ID chip using monospace text

### Left content column — seven columns

1. **NFT lot panel**
   - CSS-authored abstract artwork with no external asset
   - centered `NFT lot` label
   - metadata footer with `Collection`, `Token ID`, and `Custody`, each showing `Awaiting chain data`

2. **Auction facts grid**
   - Reserve
   - Uniform collateral cap
   - Bid deadline
   - Reveal window
   - Every value displays `—` with supporting labels

3. **Illustrative second-price clearing chart**
   - original local SVG chart with ranked unnumbered sealed-bid bars
   - one violet winning bar and a dashed second-price line
   - legend: `Winning bid`, `Second price`, `Other sealed bids`
   - persistent `Illustration — not chain data` disclosure
   - no bid IDs, bidder identities, live prices, or chain-derived values

4. **Mechanism explanation**
   - three-step sequence: Lock equal collateral → Reveal committed amount → Highest bidder pays second price
   - explicit note that revealed bids and the clearing price become public

5. **Privacy truth table**
   - private before reveal: bidder link and committed bid amount
   - public: NFT, reserve, cap, deadlines, bid timing/count, collateral transfer, later reveal and settlement fields
   - explicit warning that deposits, withdrawals, timing, and app-side helper activity can remain public

5. **Chain evidence panel**
   - Network: `Starknet Sepolia`
   - Auction contract: `Awaiting deployment`
   - STRK20 pool: show the verified Sepolia pool address from project constants
   - no transaction hashes

### Right content column — five columns

A sticky bid composition card contains:

- `Place a private bid` heading
- privacy-state pill: `STRK20 route required`
- disabled amount field with `STRK` suffix and `Enter amount` placeholder
- cap meter with no numeric progress
- summary rows for `Your sealed bid`, `Public collateral`, and `Potential refund`, all `—`
- explanatory callout: actual bid stays sealed until reveal; equal collateral is public
- disabled full-width CTA: `Bidding unavailable in design preview`
- footnote explaining the page performs no wallet request or transaction

The card must remain visually useful without implying that bidding works.

## Mobile composition

At narrow widths:

1. Header becomes a compact two-row layout.
2. Auction header remains first.
3. NFT lot panel follows.
4. Bid card becomes a normal document section immediately after the NFT panel; it is not fixed or sticky.
5. Facts, lifecycle, privacy table, and evidence follow in that order.
6. Tables become stacked definition rows rather than horizontal overflow.
7. All buttons and controls maintain at least 44px touch targets.
8. The document must have no horizontal overflow at a 390px CSS viewport.

## Interaction and motion

This slice has no product logic.

Allowed:

- semantic links to `/` and `#privacy`
- CSS-only hover/focus treatment on navigation links
- subtle card border/background transitions

Disallowed:

- click handlers for bidding or wallet connection
- form state
- contract/RPC reads
- wallet hooks or Wallet API methods
- secret generation or recovery
- local/session storage
- fake loading sequences
- autoplay animation

Under `prefers-reduced-motion: reduce`, all transitions are removed.

## Component boundaries

Recommended files:

- `web/src/app/auctions/[auctionId]/page.tsx` — server-rendered route shell and route-ID sanitization
- `web/src/features/auction/ui/AuctionBidPreview.tsx` — complete presentational composition
- `web/tests/unit/AuctionBidPreview.test.tsx` — semantic and no-action contracts
- `web/tests/e2e/auction-bid-preview.spec.ts` — desktop/mobile route, console, and overflow verification
- `web/src/app/globals.css` — bounded CipherBid tokens and reduced-motion rules only where Tailwind utilities are insufficient

The preview component accepts only `auctionId: string`. It accepts no amount, wallet, callback, auction object, or transaction prop.

## Accessibility

- One page-level `h1`; section headings follow a valid hierarchy.
- Status is conveyed by text, not color alone.
- The disabled amount field has a visible label.
- The disabled CTA remains readable and uses native `disabled` semantics.
- Technical addresses wrap safely and remain selectable.
- Privacy table uses semantic headings or definition-list equivalents on mobile.
- Focus-visible outlines remain obvious.
- Contrast meets WCAG AA for text and controls.
- Decorative artwork is hidden from assistive technology.

## Testing and visual verification

### Component contracts

Tests prove:

- the route ID is rendered as text and cannot inject markup;
- all unavailable onchain values are truthful placeholders;
- the page includes the `Design preview` label;
- amount and CTA controls are disabled;
- no submit handler or wallet action is present;
- the privacy truth table contains both hidden and public limitations;
- the second-price chart is explicitly illustrative and contains no chain data;
- the verified Sepolia pool address appears exactly.

### Browser verification

Verify at desktop and true 390px mobile widths:

- route returns HTTP 200;
- no hydration, console, or page errors;
- no unintended horizontal overflow;
- sticky bid card works only on desktop;
- mobile order matches the specification;
- keyboard traversal reaches links in a sensible order;
- reduced-motion mode removes transitions;
- the desktop card remains sticky while scrolling and the mobile card is static;
- encoded route IDs remain inert text with no dialog or script element in `main`;
- screenshots show the complete above-fold composition.

## Acceptance criteria

The design slice is complete when:

1. `/auctions/design-preview` renders the real dynamic route using `design-preview` as its route ID.
2. The visual hierarchy communicates lot, bid composition, Vickrey lifecycle, privacy boundary, and chain evidence.
3. No fabricated auction record or operational control exists.
4. No wallet, RPC, secret, storage, or transaction code is introduced.
5. Desktop and mobile visual evidence are reviewed.
6. Format, lint, strict TypeScript, unit tests, Playwright, production build, dependency audit, and `git diff --check` pass.
7. An independent review reports no blocking or important findings.
8. The reviewed branch is delivered through the project’s required GitHub branch flow.
