# Wallet Connect Panel Visual Design

**Date:** 2026-08-27
**Status:** User-approved visual direction; awaiting written-spec review before implementation.
**Scope:** Restyle `WalletConnectPanel` wherever it appears, including the auction bid card. Preserve its Starter-Kit Wallet API behavior, public-only state boundary, and existing accessibility semantics.

## Goal

Make the wallet connector feel like a compact, premium protocol module that belongs inside CipherBid’s dark auction interface, while keeping connection behavior explicit and trustworthy.

## Visual system

- Use the existing near-black layered surfaces, fine white-alpha borders, restrained Starknet-violet focus treatment, and green only for confirmed compatibility.
- Keep the component compact enough to sit above the bid amount field without displacing key auction information.
- Do not use external wallet-supplied icons. A wallet name’s first letter supplies a local visual avatar, avoiding a third-party image request or unsafe icon URL.
- Preserve reduced-motion behavior: any hover/focus transition is already disabled by `.cipherbid-auction-page` under `prefers-reduced-motion`.

## Disconnected and discovered-wallet state

- Add a small `Wallet access` eyebrow, explanatory copy, and a bordered wallet-list group.
- Each discovered wallet becomes a full-width, 44px-or-larger button with:
  - local initial avatar;
  - wallet name;
  - `Wallet API check` supporting label;
  - non-semantic chevron;
  - violet hover/focus state with a visible focus ring.
- Empty state is a compact muted panel that tells the user to install or unlock a privacy-capable wallet without implying that no wallet is supported.
- Connecting state replaces the list’s actionable affordance with a clear status panel and a visible cancel button.

## Connected state

- Show a concise success heading and green `STRK20 compatible` chip.
- Render wallet, account, chain, and Wallet API versions in a compact metadata grid.
- Display the account in a monospace, safely wrapping value block.
- Render a restrained secondary `Disconnect wallet` action with the same 44px target and focus rules.

## Error state

- Keep the controlled public error string in `role="alert"`.
- Add a warning-toned surface and border; do not render raw wallet exceptions.
- Keep discovered-wallet controls available after a connection error so users can retry or select another wallet.

## Non-goals

- No bid input, transaction preparation, balance read, wallet-private state, browser persistence, third-party icon fetch, telemetry, or new dependency.
- No animation, glassmorphism, marketing gradient, or visual data pretending to be live chain state.

## Acceptance criteria

1. The bid page and feasibility page both render the same styled connector.
2. Discovered-wallet buttons, cancel/disconnect controls, error alert, and connected metadata retain their existing accessible roles/names and keyboard behavior.
3. Button targets are at least 44px high, and account text does not cause horizontal overflow at 390px viewport width.
4. Unit tests assert the added visual-state hooks and preserve current connection safety behavior.
5. Browser checks prove the connector is visible on `/auctions/[auctionId]`, does not create overflow, and preserves the disabled bid CTA before Task 2.
