# Product

CipherBid is an open-source Starknet auction house for atomically delivered ERC-721 assets. Bidders lock identical STRK collateral through STRK20, reveal committed amounts only after bidding closes, and settle at the second-highest valid price subject to a reserve.

## Sprint MVP

One ERC-721, one payment token (STRK), one auction type (Vickrey), one reusable auction-house deployment, a Starter-Kit-derived Wallet API connection and bid UI, shielded refund/proceeds claims, and a public 90–120 second demo.

## Canonical demo case

The submission proof uses one issuer, two separate supported privacy-wallet sessions, and one read-only observer. The sole demo scenario is `0 < R ≤ A < B ≤ C`; Bidder B wins and pays `max(R, A)`. The secret-free ledger and observer assertions live in `docs/evidence/task-0-demo-matrix.md`.

## Non-goals

No broad marketplace, first-price or multi-unit auctions, ERC-1155, off-chain delivery, user accounts, database, custom prover, custom privacy cryptography, or permanent hiding of revealed bids.
