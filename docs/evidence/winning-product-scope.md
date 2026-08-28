# CipherBid Winning Product Scope

**Status:** Sprint authority

**Decision date:** 2026-08-27

## Product identity

**CipherBid — private bids, guaranteed onchain delivery.**

CipherBid is a STRK-only Vickrey auction house for one escrowed ERC-721 per auction. A seller transfers the real NFT into the auction house before bidding. Every bidder locks the same public collateral cap through STRK20 while the bid amount remains sealed in a domain-separated Poseidon commitment until reveal. A sold settlement records the result and transfers the NFT to the winner's precommitted recipient atomically; subsequent claims distribute already-locked collateral through STRK20.

“Atomic delivery” means settlement-state changes and ERC-721 delivery revert together. It does not mean every monetary claim executes in the settlement transaction.

## Single approved architecture

- The browser connects directly to a supported privacy-capable wallet through `WalletAccountV6`.
- The wallet exclusively owns wallet keys, viewing keys, private notes, proof generation, signing, and submission.
- CipherBid may hold app-specific bidder and seller claim credentials only in active browser memory and a mandatory password-encrypted recovery bundle.
- Plaintext credentials never enter browser persistence, clipboard, telemetry, logs, URLs, Git, or any server.
- There is no CipherBid backend, database, local-vault daemon, native bridge, or second transaction path in the sprint product.
- Auction creation, reveal, and permissionless settlement are standard connected-wallet calls.
- Bid ingress and loser, winner-surplus, and seller-proceeds claims route through the configured STRK20 pool.
- A separate `cipherbid-vault` design remains historical post-sprint research only.

## Required demo lifecycle

1. Seller generates and recovery-verifies a seller claim credential.
2. Seller approves the exact ERC-721 and creates the auction.
3. Readback proves `owner_of(token_id) == auction_house`.
4. Bidder A and Bidder B use distinct privacy-wallet sessions and submit equal-cap funded commitments.
5. A public observer can inspect terms, cap, timing, count, commitments, and pool/helper interaction without seeing bid amounts before reveal.
6. Both bidders reveal amount, nonce, handle, and NFT recipient.
7. Any connected wallet settles after the reveal deadline.
8. Readback proves the correct winner, Vickrey clearing price, and final NFT owner.
9. The loser claims the full cap through STRK20.
10. The winner claims `cap - clearing_price` through STRK20 when positive.
11. The seller claims clearing-price proceeds plus any explicitly specified forfeiture through STRK20.
12. Final accounting proves zero unexpected collateral.

## Competitive proof surface

The public Atomic Delivery Receipt must derive each result from chain data and classify it as **Pass**, **Fail**, or **Unavailable**:

- reviewed contract/class identity;
- NFT custody before bidding;
- identical cap for both bid ingresses;
- absence of bid amount from decoded ingress fields;
- commitment/reveal consistency;
- winner and second-price calculation;
- final ERC-721 ownership;
- exact loser, winner-surplus, and seller claim outputs;
- live STRK20 pool interaction;
- one-time claim consumption;
- value conservation and zero unexpected collateral.

The receipt may say that a connected wallet address was not present in the inspected ingress fields. It must not claim universal anonymity or prove a negative beyond the inspected public data.

## Privacy boundary

### Hidden before reveal

- actual bid amount;
- bid nonce;
- bidder claim secret;
- STRK20 note ownership and source linkage.

### Public

- seller and NFT identity;
- reserve, cap, deadlines, and bidder limit;
- bid count and timing;
- identical cap transfer;
- commitments and claim handles;
- reveal values and recipient;
- winner and clearing price;
- open-note output amounts;
- transaction timing and helper/pool activity.

Seller identity is public because auction creation is a standard wallet call. V2 publicly links the seller to the authorized destination note and exposes the clearing-price amount; the STRK20 claim makes subsequent note spending private, not the seller-to-note receipt edge.

## Explicit exclusions

The sprint product does not include multi-unit, first-price, Dutch, multiple NFT standards, arbitrary payment tokens, cross-chain execution, AI agents, custom ZK winner proofs, a compliance product, a backend, broad marketplace discovery, or sponsored transactions.

## Authority order

When documents conflict, use this order:

1. this winning product scope;
2. Decision 0002 direct Wallet API route;
3. approved task evidence matrices, with later reviewed versions superseding earlier ones;
4. implementation fixtures and tests;
5. historical design documents, which are non-normative.
