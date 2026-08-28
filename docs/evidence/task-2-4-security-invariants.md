# CipherBid Task 2.4 — Security Invariants

**Status:** Frozen v1

## Trust boundaries

- Only the immutable configured STRK20 pool may call `privacy_invoke`.
- The resolved `${poolAddress}` argument must equal that configured pool.
- Wallet keys, viewing keys, private notes, witnesses, proof material, signing, and submission remain in the wallet.
- CipherBid stores only public commitments/handles and lifecycle/accounting state.

## Custody and ingress

- Auction creation atomically transfers the exact ERC-721 into auction-house custody.
- Bidding cannot begin without custody.
- Bid collateral is accepted only during `BiddingOpen`.
- Incoming collateral is measured by ERC-20 balance delta.
- Every accepted bid increases contract balance by exactly the immutable cap.
- Commitments and claim handles are non-zero and unique within the auction.
- Bidder count never exceeds the immutable bounded limit.
- Malformed calldata or failed token movement advances no state.

## Reveal and settlement

- Reveal recomputes the complete domain-separated commitment.
- Chain ID, contract address, auction ID, amount, nonce, claim handle, and NFT recipient are all bound.
- Reveal occurs once and only during `RevealOpen`.
- Settlement occurs once and only at/after reveal deadline.
- Tie-breaking is deterministic by accepted index.
- Settlement iteration is bounded by at most 32 bids.
- Settlement state is written before ERC-721 interaction.
- Reentrancy protection covers every external-call path.

## Claims and authorization

- Bidder and seller secrets must recompute stored handles.
- Seller proceeds require the currently seller-authorized open-note ID.
- Seller authorization accepts no amount and can be replaced only before consumption.
- A copied seller secret cannot redirect value to another note.
- Every positive claim is consumed exactly once before ERC-20 approval.
- Pool approval equals the exact returned `OpenNoteDeposit.amount`.
- Zero-value open-note deposits are forbidden.
- Failed approval, pull, or pool processing reverts consumption atomically.

## Conservation

After every state transition:

```text
contract_payment_balance
  = locked_collateral
  - successfully_claimed_value
```

At `ClaimsComplete`:

```text
contract_payment_balance = 0
locked_collateral = seller_claims + bidder_claims
```

No terminal state may strand unexpected collateral.

## Implementation rules

- Checks → effects → interactions.
- Explicit typed errors and complete public events.
- No admin mutation of auction economics or custody.
- No caller-supplied authoritative reserve, cap, clearing price, payout amount, seller, or winner.
- Normalize addresses before comparison in TypeScript.
- Parse monetary values as `bigint`/Cairo integers only.
- Timeout is unconfirmed, never success.
- UI success requires receipt plus state/ownership readback.
