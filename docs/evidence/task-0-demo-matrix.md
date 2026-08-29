# CipherBid Task 0 — Canonical Two-Bidder Demo and Evidence Matrix

**Status:** Frozen planning baseline. This file contains no deployment values, transaction hashes, wallet addresses, credentials, or product fixture data.

## Exact demo roles

| Role | Required participant | Demo responsibility |
| --- | --- | --- |
| Issuer / seller | One seller wallet | Creates the auction and escrows one low-value purpose-minted ERC-721. |
| Bidder A | Supported privacy-wallet session A | Connects through the CipherBid UI and submits one sealed bid `A`. |
| Bidder B | Separate supported privacy-wallet session B | Connects through the CipherBid UI and submits one sealed bid `B`. |
| Observer | Read-only RPC/explorer session | Inspects public state before close and verifies the final on-chain result. |

The two bidder sessions must use different wallet accounts. A wallet cannot play both bidder roles in the canonical demo.

## Deterministic auction case

For one auction, set:

```text
reserve = R
public collateral cap = C
bidder A bid = A
bidder B bid = B

0 < R ≤ A < B ≤ C
```

Expected result after valid post-close reveals:

```text
winner = Bidder B
clearing price = max(R, A)
Bidder A refund = C
Bidder B surplus claim = C - max(R, A)
seller proceeds = max(R, A) + forfeited collateral
```

The issuer chooses final small mainnet values only in the separately approved mainnet action manifest. This document intentionally does not prefill real amounts.

## Exact lifecycle to demonstrate

1. Issuer creates the auction and the auction house becomes owner of the ERC-721.
2. Bidder A connects a supported privacy wallet in the UI, completes recovery export verification, and submits one equal-cap STRK20 private bid.
3. Bidder B repeats the same UI flow from a separate wallet session with a higher sealed bid.
4. Before the bid deadline, the observer records the public auction surface.
5. After bidding closes, each bidder reveals through the UI.
6. Anyone settles after the reveal deadline.
7. The observer verifies the NFT owner, clearing price, and accounting state.
8. Bidder A, Bidder B, and the seller complete their applicable claims through the verified STRK20 open-note route.
9. One bidder optionally creates a recipient-scoped disclosure packet; an authorized verifier validates it.

## Public observer assertion before close

The observer may see:

- auction terms, NFT, reserve, cap, and deadlines;
- bid count and timing;
- identical public collateral cap;
- bid commitment and pool/helper interaction.

The observer must not be able to recover:

- Bidder A or Bidder B's actual bid amount;
- a commitment opening or bid nonce;
- a bidder-controlled normal-wallet address from auction state/events.

## Evidence ledger

Populate a row only after independent chain readback. `Pending` means no fact is claimed yet.

| Evidence item | Required readback | Evidence value | Status |
| --- | --- | --- | --- |
| Network and chain ID | RPC chain ID | Pending | Pending |
| STRK20 pool | Official pool address + chain read | Pending | Pending |
| Auction class hash | Class declaration/readback | Pending | Pending |
| Auction contract address | Deployment receipt + class/config readback | Pending | Pending |
| ERC-721 contract and token ID | Escrow receipt + `owner_of` readback | Pending | Pending |
| Auction creation | Receipt, event, and `get_auction` readback | Pending | Pending |
| Bidder A private ingress | Successful receipt, pool event, helper/auction readback, explorer URL | Pending | Pending |
| Bidder B private ingress | Successful receipt, pool event, helper/auction readback, explorer URL | Pending | Pending |
| Pre-close observer check | RPC/event query transcript and result | Pending | Pending |
| Bidder A reveal | Receipt/event and auction state readback | Pending | Pending |
| Bidder B reveal | Receipt/event and auction state readback | Pending | Pending |
| Settlement | Receipt/event, winner, price, and NFT-owner readback | Pending | Pending |
| Bidder A claim | Receipt, open-note output, and claim-state readback | Pending | Pending |
| Bidder B claim | Receipt, open-note output, and claim-state readback | Pending | Pending |
| Seller claim | Receipt, open-note output, and claim-state readback | Pending | Pending |
| Disclosure verification | Packet verifier result without secret content | Pending | Pending |
| Demo URL and video | Clean-browser/link check | Pending | Pending |

## Product-language lock

Use only these privacy claims:

- Actual bid values are sealed until the reveal phase.
- Equal collateral, bid timing/count, helper interaction, reveals, winner, clearing price, and claim outputs can be public.
- CipherBid does not claim that variable bid amounts remain encrypted after leaving the STRK20 pool.
- Connected-wallet reveal/claim activity can be linkable after close.
- STRK20 protocol-auditor disclosure is protocol-level; CipherBid does not claim auction-scoped forced or threshold reveal.

## Task 0 exit criteria

- One seller, two separate bidder wallets, and one observer are assigned.
- The `0 < R ≤ A < B ≤ C` scenario is the only canonical mainnet demo case.
- Every required proof has a defined chain readback artifact.
- No deployment value, transaction hash, wallet address, secret, or unverified claim has been added to public documentation.
