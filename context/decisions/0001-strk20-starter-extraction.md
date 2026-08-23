# Decision 0001: Extract the STRK20 starter's wallet boundary

**Status:** Accepted

## Decision

Use selected code and patterns from `Akashneelesh/strk20-starter-kit` at revision `187fe789dd4f5de14ccb0953abfdb49a26643664` under MIT. Keep CipherBid's own application scaffold, contract/client tests, design system, and auction domain.

## Reuse

- get-starknet v6 wallet-standard discovery with `eip1193Adapters: []`;
- `WalletAccountV6.connect` and wallet request sequencing;
- Zustand wallet/provider state boundaries;
- bounded receipt polling and explicit submitted-versus-confirmed states;
- literal `OPEN`, `${poolAddress}`, and `${openNoteIds[N]}` placeholders.

## Rewrite or reject

- Replace demo fixed amounts, token/helper constants, and echo flow with typed CipherBid operations.
- Replace `supportedSpecs()` capability storage with `supportedWalletApi()` and require Wallet API >= 0.10.3.
- Replace console logging with allowlisted UI state; never log private payloads.
- Do not copy the starter's CSS or 599-line demo action component.
- Do not inherit Next.js 16.0.8 / React 19.2.1; fresh audits required patched versions.

## Rationale

Directly forking the entire starter would couple CipherBid to stale dependency pins, demo product behavior, and styling that do not match the auction protocol. Selected extraction preserves the proven privacy-wallet integration while keeping the protocol testable and the UI original.
