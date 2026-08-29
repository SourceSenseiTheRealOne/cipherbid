# CipherBid Premium Protocol Console Design

**Status:** Approved by user on 2026-08-24

## Goal

Refresh the visual-only auction detail route into a premium dark protocol-console experience while preserving CipherBid's public-data-only boundary and every truthful privacy disclosure.

## Visual direction

The route uses a cool near-black, layered-surface system inspired by precise protocol tooling rather than a warm marketplace. Indigo remains reserved for CipherBid and primary mechanism emphasis; green is reserved for active-state indicators. The page has no dependency on a brand asset, remote font, or image.

## Composition

- A compact dark header identifies CipherBid, the selected auction route, and read-only preview status.
- The hero combines the sealed-NFT artwork with a compact protocol-console panel that describes only known protocol facts: auction mode, collateral rule, settlement rule, and deployment state.
- The bid panel remains disabled and visibly non-operational. It continues to say that it will not make a wallet request or transaction.
- Existing fact cards, Vickrey explanation, privacy boundary, chain evidence, and illustrative second-price chart remain present but use shared dark surfaces and tighter visual hierarchy.

## Data truthfulness

The UI must not invent a collection, token ID, reserve, cap, time, bid, account, contract, or transaction. Unknown values remain em dashes or `Awaiting chain data`; the protocol console uses qualitative facts only. It performs no RPC request, wallet action, transaction submission, secret generation, storage access, or client-side time calculation.

## Accessibility and responsive rules

- Semantic headings, landmarks, labels, focus visibility, and keyboard order remain intact.
- The protocol console is an aria-labelled region and status is text as well as color.
- Desktop retains the sticky bid card; mobile stacks the protocol console after the lot and before the bid card, with no horizontal overflow.
- No new animation is introduced. The existing reduced-motion guarantee remains comprehensive.

## Acceptance criteria

1. `/auctions/[auctionId]` renders a visible `Protocol state` console with mechanism-only data and a `Design preview` disclosure.
2. Existing disabled controls, truthful placeholders, privacy text, chain evidence, and illustrative chart remain.
3. Desktop, true 390px mobile, reduced-motion, keyboard order, and route-id inertness pass browser verification.
4. No wallet/STRK20/secret-related production code changes occur.
5. Only intended UI, UI tests, docs, and metadata paths are staged.
