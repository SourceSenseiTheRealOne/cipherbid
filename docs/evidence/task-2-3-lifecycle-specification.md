# CipherBid Task 2.3 — Lifecycle Specification

**Status:** Frozen v1

## States

- `BiddingOpen`: `now < bidding_deadline`.
- `RevealOpen`: `bidding_deadline <= now < reveal_deadline`.
- `ReadyToSettle`: `now >= reveal_deadline` and not settled.
- `SettledSold`: a valid revealed bid meets reserve.
- `SettledNoSale`: no valid revealed bid meets reserve.
- `ClaimsComplete`: every positive bidder output and any seller entitlement is consumed; zero winner surplus is auto-consumed.

Settlement is permissionless and executes once.

## Winner and price

1. Consider every successfully revealed bid with `0 < amount <= cap`.
2. Sort by amount descending, then accepted index ascending.
3. The first bid wins only if its amount meets reserve.
4. Ties go to the earliest accepted index.
5. With one valid reveal, clearing price is reserve.
6. Otherwise clearing price is `max(reserve, second_highest_revealed_amount)`.
7. If the highest reveal is below reserve, the auction is no-sale.

## NFT outcome

- Sold: transfer the ERC-721 to the winner's commitment-bound recipient.
- No sale: return the ERC-721 to the immutable seller.
- State effects precede the external transfer and the transaction reverts atomically on failure.

## Collateral outcomes

CipherBid v1 does not penalize non-reveal.

- Every non-winning accepted bid receives the full cap, including unrevealed bids and every bid in a no-sale auction.
- Winner receives `cap - clearing_price` when positive.
- A zero winner surplus creates no STRK20 transaction and is auto-consumed at settlement.
- Seller receives exactly `clearing_price` in a sold auction.
- No-sale seller entitlement is zero.

For `N` accepted bids:

```text
locked_collateral = N * cap

sold:
  locked_collateral
    = seller_entitlement
    + winner_surplus
    + sum(non_winner_refunds)

no sale:
  locked_collateral = sum(all_bidder_refunds)
```

## Claims

- Each accepted bid has one bidder claim state.
- Each claim handle and commitment is unique per auction.
- Claim secret must recompute the stored handle.
- Claim credentials cannot cross auction, chain, or deployment boundaries.
- Positive claims are consumed exactly once before approval/external interaction.
- Seller claim additionally requires the immutable seller handle and current seller-authorized open-note ID.
- Failed external calls revert claim consumption.

## Executable authority

- `web/tests/fixtures/auction-lifecycle-v1.json`
- `web/src/features/auction/auctionLifecycle.ts`
- `web/tests/unit/auctionLifecycleFixture.test.ts`
