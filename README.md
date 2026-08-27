# CipherBid

**Private Vickrey NFT auctions on Starknet with STRK20-funded sealed bids and shielded refunds.**

CipherBid is an open-source auction house for atomically delivered ERC-721 assets. Every bidder locks the same public collateral cap through STRK20, while the actual bid remains sealed in a domain-separated Poseidon commitment until the reveal window. The highest valid bidder wins and pays the greater of the reserve or second-highest valid bid.

## Why equal collateral?

A STRK20 `privacy_invoke` withdraws funds from the pool to the helper through a public ERC-20 transfer. Escrowing each variable bid amount would reveal it. CipherBid therefore locks the same cap for every bidder, preventing pre-reveal amount leakage while ensuring every accepted bid is fully funded.

This is **STRK20-funded sealed bidding with equalized real collateral**. It is not an unfunded hash-only auction, and it does not claim that a variable bid amount remains encrypted after leaving the pool.

## Sprint MVP

- One reusable Cairo auction-house deployment
- One escrowed ERC-721 per auction
- STRK-only Vickrey settlement
- STRK20 wallet-driven anonymous bid ingress
- Shielded refunds, winner surplus, and seller proceeds
- Original responsive Next.js interface
- Honest privacy and compliance evidence

## Canonical demo and evidence baseline

The submission demo has one issuer/seller, two separate supported privacy-wallet sessions, and one read-only observer. Its deterministic Vickrey case uses `0 < R ≤ A < B ≤ C`: Bidder B wins and pays `max(R, A)` after both valid reveals. The full public/private boundary, expected settlement, and readback-only evidence ledger are frozen in [`docs/evidence/task-0-demo-matrix.md`](docs/evidence/task-0-demo-matrix.md).

## Privacy boundary

| Public | Private before reveal |
| --- | --- |
| Auction terms, NFT, reserve, cap, deadlines | Bidder's main wallet identity |
| Bid count and timing | Actual bid amount |
| Identical collateral transfer amount | Bid and claim secrets |
| Revealed bids, winner, clearing price | STRK20 note ownership and source linkage |

Deposits, withdrawals, timing, open-note amounts, and app-side anonymizer calls can remain public. The app never receives or exports a user's STRK20 viewing key. It does not claim that a variable bid amount remains encrypted after it leaves the STRK20 pool.

## Status

Foundation work is in progress on `development`. Contract, client, deployment, and verified mainnet evidence will be added incrementally. `strk20.json` remains empty until real successful mainnet transactions and deployed addresses are read back and verified.

## Development

The pinned stack and commands will live in [`context/stack.md`](context/stack.md). Mainnet writes are separately budgeted and human-approved.

## License

MIT
