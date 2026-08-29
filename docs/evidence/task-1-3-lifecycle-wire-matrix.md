# CipherBid Task 1.3 — Reveal and Claim Transaction Wire Matrix

**Status:** Approved v2 lifecycle wire baseline

**Verified:** 2026-08-28T08:46:58Z

**Decision:** Reveal, settlement, and seller-proceeds destination authorization are ordinary connected-wallet calls. Loser refunds, winner surplus, and seller proceeds use STRK20 `transfer("OPEN") → invoke` so every monetary exit enters a wallet-owned open note.

This v2 matrix supersedes both the former STRK20 invoke-only reveal spike and the v1 public seller payout. It preserves every Task 1.2 bid-ingress index while extending the shared `privacy_invoke` operation set with `SELLER_PROCEEDS = 3`.

## 1. Route classification

A `WalletAccountV6` can act as a standard Starknet account for ordinary writes; the wallet retains its private key and signs/sends the call.[8] STRK20 actions are reserved for flows that need the pool's private note state, relayed proof, or open-note output.[1][3]

Within a STRK20 claim, open-note creation precedes external invocation because the protocol assigns note creation to phase 5 and invoke to phase 7.[4]

| Lifecycle transaction        | Route                                            | Touches STRK20 pool? | Reason                                                                                      |
| ---------------------------- | ------------------------------------------------ | -------------------: | ------------------------------------------------------------------------------------------- |
| Reveal A/B                   | `walletAccount.execute(revealCall)`              |                   No | Revealed values are intentionally public; no token moves.                                   |
| Settlement                   | `walletAccount.execute(settlementCall)`          |                   No | Permissionless auction computation and ERC-721 delivery need no private pool state.         |
| Loser refund                 | `walletAccount.strk20InvokeTransaction(actions)` |              **Yes** | Returns the full cap to an open note controlled by the claimant's privacy wallet.           |
| Winner surplus               | `walletAccount.strk20InvokeTransaction(actions)` |              **Yes** | Returns `cap - clearing_price` to an open note.                                             |
| Seller destination authorize | `walletAccount.execute(authorizationCall)`       |                   No | The configured seller binds the exact simulated open-note ID before the bearer secret airs. |
| Seller proceeds              | `walletAccount.strk20InvokeTransaction(actions)` |              **Yes** | Returns the clearing price to the seller-authorized open note.                              |

### Why seller destination authorization is required

A plain Wallet API `invoke` reaches the helper through the pool, so the helper sees the pool as caller rather than the wallet identity.[1][2][5]

The `OpenNoteDeposit` return names a note ID, token, and amount; it does not prove that the note belongs to the configured public seller.[2][7]

A seller claim secret alone is therefore a bearer credential. Once visible in pending calldata, a copied secret could otherwise be paired with another open-note ID. V2 prevents redirection without introducing a claim-signing key: the configured seller first authorizes the exact note ID through a standard account transaction, and operation `3` accepts only that stored authorization. Copying the later secret can at most race the same payout into the already-authorized seller note; it cannot choose a different destination. Replay still fails after one-time claim consumption.

This security fix has a deliberate privacy cost: the authorization publicly links the configured seller to the open-note ID. The proceeds enter STRK20 and subsequent note spending remains private, but CipherBid must not claim that the seller-to-note receipt edge is hidden.

## 2. Standard connected-wallet calls

All integer calldata uses canonical felt hex. Each call is sent through the already-connected `WalletAccountV6` with `walletAccount.execute(call)`. The wallet signs and submits; CipherBid receives the transaction hash and then verifies receipt plus state readback.[8]

### 2.1 Reveal

TypeScript call:

```text
{
  contractAddress: auction_house,
  entrypoint: "reveal_bid",
  calldata: [
    auction_id,
    amount,
    bid_nonce,
    claim_handle,
    asset_recipient,
  ],
}
```

Cairo surface:

```text
reveal_bid(
  auction_id: u64,
  amount: u128,
  bid_nonce: felt252,
  claim_handle: felt252,
  asset_recipient: ContractAddress,
)
```

| Calldata index | Field             | Rule                                                                              |
| -------------: | ----------------- | --------------------------------------------------------------------------------- |
|            `0` | `auction_id`      | Existing auction; reveal phase only.                                              |
|            `1` | `amount`          | `1..=cap`; public after this transaction.                                         |
|            `2` | `bid_nonce`       | Non-zero commitment nonce; public after reveal.                                   |
|            `3` | `claim_handle`    | Must equal the handle committed during ingress. The claim secret is not revealed. |
|            `4` | `asset_recipient` | Non-zero ERC-721 recipient bound into the commitment.                             |

The contract recomputes the domain-separated commitment from chain ID, its own address, auction ID, amount, nonce, claim handle, and recipient. It looks up the stored commitment, requires it to be unrevealed, then emits:

```text
BidRevealed {
  auction_id,
  commitment,
  amount,
  asset_recipient,
}
```

No claim secret, wallet viewing key, note ID, or proof data appears. Reveal does not call `privacy_invoke`, create an open note, or pay a STRK20 pool fee.

### 2.2 Settlement

TypeScript call:

```text
{
  contractAddress: auction_house,
  entrypoint: "settle_auction",
  calldata: [auction_id],
}
```

Cairo surface:

```text
settle_auction(auction_id: u64)
```

Settlement is permissionless after the reveal deadline. The caller need not be seller, winner, or bidder. The contract computes the winner and clearing price from bounded on-chain state, marks settlement before external NFT delivery, transfers the ERC-721, and emits:

```text
AuctionSettled {
  auction_id,
  sold,
  winner_commitment,
  winner_recipient,
  clearing_price,
}
```

Expected public evidence is `AuctionSettled`, the ERC-721 `Transfer`, settled-state readback, and `owner_of(token_id) == winner_recipient` when sold. Settlement does not touch the STRK20 pool.

### 2.3 Seller proceeds destination authorization

TypeScript call:

```text
{
  contractAddress: auction_house,
  entrypoint: "authorize_seller_proceeds",
  calldata: [auction_id, seller_claim_handle, open_note_id],
}
```

Cairo surface:

```text
authorize_seller_proceeds(
  auction_id: u64,
  seller_claim_handle: felt252,
  open_note_id: felt252,
)
```

Rules:

- caller must equal the configured seller;
- auction must be settled and sold;
- supplied handle must equal the immutable `seller_claim_handle`;
- `open_note_id` must be non-zero;
- authorization is allowed only while seller proceeds remain unclaimed;
- the seller may replace an authorization before claim consumption to recover from an abandoned or changed wallet preparation;
- authorization never accepts a payout amount;
- the app re-runs `strk20PrepareInvoke(actions, true)` after authorization and requires the resolved note ID to remain equal before enabling submission.

Expected event:

```text
SellerProceedsAuthorized {
  auction_id,
  seller_claim_handle,
  open_note_id,
}
```

This transaction does not move money or touch the STRK20 pool. It is a public seller-to-note binding and therefore appears in the demo evidence, but it does not qualify as one of the required pool transactions.

## 3. Shared STRK20 claim envelope

Official private DeFi flows create an open note with `transfer(amount: "OPEN")` and then invoke the helper that fills it.[1][2]

The pool requires the number of created open notes to equal the number filled by the invoke.[3][5]

Each claim contains exactly one invoke because the pool permits at most one invoke-phase action per transaction.[4]

CipherBid uses one shared eight-felt `privacy_invoke` envelope for bid ingress and all three monetary claims:

```text
privacy_invoke(
  operation: u8,
  auction_id: u64,
  primary_value: felt252,
  claim_handle: felt252,
  reserved_0: felt252,
  reserved_1: felt252,
  pool_address: ContractAddress,
  open_note_id: felt252,
) -> Span<OpenNoteDeposit>
```

|  Index | Cairo parameter                 | `PLACE_BID = 0`  | `LOSER_REFUND = 1`                | `WINNER_SURPLUS = 2`              | `SELLER_PROCEEDS = 3`             |
| -----: | ------------------------------- | ---------------- | --------------------------------- | --------------------------------- | --------------------------------- |
|    `0` | `operation: u8`                 | `0x0`            | `0x1`                             | `0x2`                             | `0x3`                             |
|    `1` | `auction_id: u64`               | Auction ID       | Auction ID                        | Auction ID                        | Auction ID                        |
|    `2` | `primary_value: felt252`        | Bid commitment   | Bidder claim secret               | Bidder claim secret               | Seller claim secret               |
|    `3` | `claim_handle: felt252`         | Bid claim handle | Bid claim handle                  | Bid claim handle                  | Immutable seller claim handle     |
|    `4` | `reserved_0: felt252`           | `0x0`            | `0x0`                             | `0x0`                             | `0x0`                             |
|    `5` | `reserved_1: felt252`           | `0x0`            | `0x0`                             | `0x0`                             | `0x0`                             |
|    `6` | `pool_address: ContractAddress` | `${poolAddress}` | `${poolAddress}`                  | `${poolAddress}`                  | `${poolAddress}`                  |
|    `7` | `open_note_id: felt252`         | `0x0`            | `${openNoteIds[N]}`, with `N = 0` | `${openNoteIds[N]}`, with `N = 0` | `${openNoteIds[N]}`, with `N = 0` |
| Return | `Span<OpenNoteDeposit>`         | Empty            | Exactly one deposit               | Exactly one deposit               | Exactly one deposit               |

`${poolAddress}` and `${openNoteIds[N]}` are literal Wallet API placeholder forms; CipherBid fixes `N` to decimal zero because each claim creates exactly one open note. The wallet resolves them while assembling the STRK20 transaction; CipherBid must not compile, normalize, or interpolate them.[1][3][8]

The helper's final calldata felt is the output open-note ID, matching the current Wallet API helper convention.[8] All claim operations require `get_caller_address() == configured_pool` and the resolved index-6 pool value to equal that same deployment.

## 4. Loser refund

### Wallet actions

```text
[
  {
    type: "transfer",
    token: payment_token,
    amount: "OPEN",
    recipient: connected_wallet_address,
  },
  {
    type: "invoke",
    contract: auction_house,
    calldata: [
      0x1,
      auction_id,
      claim_secret,
      claim_handle,
      0x0,
      0x0,
      "${poolAddress}",
      "${openNoteIds[N]}", // N = 0
    ],
  },
]
```

### Contract validation and output

- auction is settled;
- handle belongs to a valid revealed non-winning bid in this auction;
- `Poseidon(CIPHERBID_CLAIM_V1, claim_secret) == claim_handle`;
- claim has not been consumed;
- reserved values are zero;
- open-note ID is non-zero;
- effects are marked consumed before token approval;
- output amount is exactly the full uniform cap.

Return:

```text
[
  OpenNoteDeposit {
    note_id: open_note_id,
    token: payment_token,
    amount: cap,
  },
]
```

`OpenNoteDeposit` is exactly `{ note_id: felt252, token: ContractAddress, amount: u128 }`.[7] The auction house approves the pool to pull exactly `cap`; the pool performs the transfer and fills the note atomically.[2][5]

Expected event order, allowing unrelated wallet-fee events around it:

1. Pool `OpenNoteCreated`.
2. Auction house `LoserRefundClaimed { auction_id, claim_handle, open_note_id, amount: cap }`.
3. Pool `ExternalContractInvoked { contract_address: auction_house, selector: privacy_invoke }`.
4. Pool `OpenNoteDeposited { depositor: auction_house, token: payment_token, note_id, amount: cap }`.

The one-time claim secret becomes public in invoke calldata when consumed. It must never be logged or persisted before submission, and after successful readback it is terminal/discardable. Publishing it at consumption does not reveal the wallet's viewing key, private notes, or the encrypted owner of the output note.

The refund amount is public because open-note amounts are plaintext by protocol design.[1][2]

## 5. Winner surplus

### Wallet actions

The sequence is identical to loser refund except operation index 0 is `0x2`:

```text
transfer(payment_token, "OPEN", connected_wallet_address)
→ invoke(auction_house, [0x2, auction_id, claim_secret, claim_handle, 0, 0, "${poolAddress}", "${openNoteIds[N]}"]) // N = 0
```

### Contract validation and output

- handle belongs to the settled winning bid;
- claim secret recomputes the stored handle;
- claim is unconsumed;
- `surplus = cap - clearing_price` is computed with checked arithmetic;
- surplus must be positive or the UI marks the claim ineligible and builds no transaction;
- effects precede approval.

Return:

```text
[
  OpenNoteDeposit {
    note_id: open_note_id,
    token: payment_token,
    amount: cap - clearing_price,
  },
]
```

Expected events mirror loser refund with `WinnerSurplusClaimed` and the exact surplus amount. The pool emits `OpenNoteCreated`, `ExternalContractInvoked`, and `OpenNoteDeposited` around the auction-house event.[5][6]

## 6. Seller proceeds

### Wallet preparation and authorization

1. Build the seller claim actions with operation `0x3` and `${openNoteIds[N]}`, with `N = 0`.
2. Run `strk20PrepareInvoke(actions, true)`; the simulated proof remains empty and is not persisted.
3. Extract the resolved open-note ID from the prepared public call.
4. Ask the configured seller wallet to submit `authorize_seller_proceeds(auction_id, seller_claim_handle, open_note_id)`.
5. Confirm the authorization receipt and read back the exact stored note ID.
6. Re-run simulated preparation and require the resolved note ID to match the authorization.
7. Only then enable `strk20InvokeTransaction(actions)`.

No other wallet-private transaction may intervene between final preparation and claim submission. A mismatch is a controlled stale-authorization state, never permission to substitute another note.

The pool derives an open-note ID from the channel key, token, and sequential note index; the preparation's random value is used only to encrypt the recipient address for the auditor.[5] The ID is therefore stable across repeated simulation only while those private inputs and the note index remain unchanged. CipherBid relies on the post-authorization re-simulation comparison rather than assuming stability.

### Claim actions

```text
transfer(payment_token, "OPEN", connected_seller_address)
→ invoke(auction_house, [0x3, auction_id, seller_claim_secret, seller_claim_handle, 0, 0, "${poolAddress}", "${openNoteIds[0]}"])
```

### Contract validation and output

- auction is settled and sold;
- supplied handle equals immutable `seller_claim_handle`;
- `Poseidon(CIPHERBID_CLAIM_V1, seller_claim_secret) == seller_claim_handle`;
- seller proceeds remain unconsumed;
- resolved `open_note_id` equals the seller-authorized note ID;
- reserved values are zero;
- exact amount comes only from stored settlement accounting;
- effects are consumed before token approval;
- a failed approval/pull reverts consumption atomically.

Return:

```text
[
  OpenNoteDeposit {
    note_id: open_note_id,
    token: payment_token,
    amount: seller_entitlement,
  },
]
```

For the current no-forfeiture demo, `seller_entitlement = clearing_price`. Task 2.3 may add explicitly specified forfeitures only by updating the accounting formula and fixture before production implementation.

Expected events are `OpenNoteCreated`, `SellerProceedsClaimed`, `ExternalContractInvoked`, and `OpenNoteDeposited`. `SellerProceedsClaimed` records auction ID, seller claim handle, authorized note ID, and exact amount, but not the secret.

## 7. Submission and readback rules

### Ordinary lifecycle calls

Reveal, settlement, and seller destination authorization use `walletAccount.execute(call)`. The browser wallet owns the signing key and sends the standard Starknet transaction.[8]

### STRK20 claims

Loser, winner, and seller claims use:

```text
walletAccount.strk20InvokeTransaction(actions)
```

The wallet owns note setup, proof generation, signature, fee action, and submission; CipherBid receives `{ transaction_hash }`.[3][8] A simulated `strk20PrepareInvoke(actions, true)` may preflight shape with empty proof fields, but non-simulated proof material must not enter CipherBid application state.[3]

For every route, a returned hash means submitted only. Success requires:

- accepted and successful receipt;
- expected event fields;
- exact auction state transition;
- token/NFT ownership or balance readback where applicable;
- consumed-claim readback for claims;
- timeout classified as unconfirmed, not success or revert.

The pool emits `ExternalContractInvoked` for the helper and `OpenNoteDeposited` for each returned deposit, which makes all three claim routes independently identifiable in receipts.[5][6]

## 8. Pool-touching and mainnet evidence plan

The sprint requires at least three successful mainnet transactions in `strk20.json`; each must exist and touch the live STRK20 pool, and project-contract transactions must run through CipherBid.[9][10]

| Demo transaction             | Pool-touching? | Eligible for required three? | Required CipherBid evidence                                          |
| ---------------------------- | -------------: | ---------------------------: | -------------------------------------------------------------------- |
| Bidder A ingress             |        **Yes** |                      **Yes** | `BidCommitted` plus cap-withdrawal/pool invoke evidence              |
| Bidder B ingress             |        **Yes** |                      **Yes** | `BidCommitted` plus cap-withdrawal/pool invoke evidence              |
| Reveal A                     |             No |                           No | `BidRevealed` and commitment readback                                |
| Reveal B                     |             No |                           No | `BidRevealed` and commitment readback                                |
| Settlement                   |             No |                           No | `AuctionSettled`, NFT transfer, owner readback                       |
| Loser refund                 |        **Yes** |    **Yes — canonical third** | `LoserRefundClaimed`, open-note events, consumed readback            |
| Winner surplus               |        **Yes** |   **Yes — preferred fourth** | `WinnerSurplusClaimed`, open-note events, consumed readback          |
| Seller destination authorize |             No |                           No | `SellerProceedsAuthorized` plus authorized-note readback             |
| Seller proceeds              |        **Yes** |    **Yes — preferred fifth** | `SellerProceedsClaimed`, open-note events, consumed/balance readback |

### Minimum accepted mainnet set

1. Bidder A ingress.
2. Bidder B ingress.
3. Loser refund.

The loser refund is the canonical third because the two-valid-bid demo deterministically has one loser entitled to the full cap.

### Preferred complete demonstration

If reviewed budget and time permit, execute and verify all three STRK20 claims after the public seller destination authorization. This produces five pool-touching CipherBid transactions, closes every value path, and provides stronger conservation evidence than the three-hash minimum. No hash enters `strk20.json` until mainnet existence, success, live-pool contact, CipherBid event, and state readback all pass.

## 9. Canonical fixtures and implementation surfaces

| File                                             | Authority                                                                                                                            |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| `web/tests/fixtures/lifecycle-routes-v2.json`    | Canonical sample calls/actions, operation values, output formulas, events, authorization, pool classification, and demo order.       |
| `web/tests/unit/lifecycleWireFixture.test.ts`    | Executes all builders, checks every action/calldata position, enforces the shared Cairo envelope, outputs, events, and evidence set. |
| `web/src/features/auction/lifecycleCalls.ts`     | Typed standard-wallet reveal, settlement, and seller-destination authorization builders.                                             |
| `web/src/features/privacy/strk20ClaimActions.ts` | Typed loser-refund, winner-surplus, and seller-proceeds STRK20 action builders.                                                      |
| `web/src/features/privacy/strk20Actions.ts`      | Bid-ingress actions only; the obsolete STRK20 reveal builder is removed.                                                             |
| `web/tests/fixtures/bid-ingress-v1.json`         | Shares the same eight Cairo argument names/types/indices.                                                                            |
| `contracts/src/lib.cairo`                        | Current shared `privacy_invoke` ABI surface.                                                                                         |
| This matrix                                      | Human-readable contract for Cairo, TypeScript, receipts, and evidence.                                                               |

The current `AuctionIngressSpike` remains local-only. It proves dispatch compatibility but does not implement production settlement, claims, output approval, event emission, or value conservation. The fixtures are binding inputs for Task 3, not evidence that those production paths already exist.

## 10. Contract review

### Normative compatibility

- No route asks CipherBid for a wallet key, viewing key, private note, or non-empty proof.
- Direct calls expose only data that the auction intentionally makes public.
- Bidder claims use the official open-note pattern and return exactly one deposit for one created note.[1][2][5]
- The shared ABI preserves Task 1.2 indices while giving slots 2 and 7 names valid for both ingress and claims.
- Seller proceeds use the same claim-secret domain and add no claim-signing-key or shadow-account dependency.
- Seller destination authorization converts bearer-secret front-running from redirectable theft into same-note replay/racing.
- The public seller-to-note authorization link is disclosed rather than described as hidden.
- Every transfer amount has one authoritative formula: loser `cap`, winner `cap - clearing_price`, seller `clearing_price`.
- Pool-touching evidence is not claimed for ordinary wallet transactions.

### Deferred implementation, not contract ambiguity

Task 3 must still implement and adversarially test authorization, phase checks, commitment recomputation, one-time effects, approvals, failed external-call rollback, events, and balance conservation. Task 4 must implement receipt/readback decoders. Those tasks may add internal structure but must not change this public wire matrix without an explicit reviewed version bump.

## Task 1.3 gate

- [x] Standard connected-wallet lifecycle calls selected.
- [x] STRK20 open-note claim calls selected.
- [x] Exact reveal target, entrypoint, and five calldata positions frozen.
- [x] Exact settlement target, entrypoint, and calldata frozen.
- [x] Loser refund action order, operation, calldata, and full-cap output frozen.
- [x] Winner surplus action order, operation, calldata, and output formula frozen.
- [x] Seller claim secret/handle and immutable configuration binding frozen.
- [x] Seller destination authorization, operation `3`, exact calldata, and clearing-price open-note output frozen.
- [x] Pool-touching classification frozen.
- [x] Three-transaction mainnet minimum frozen.
- [x] Preferred all-claims demo frozen.
- [x] One shared Cairo/TypeScript/test/evidence matrix established.

**Gate result:** One approved v2 Wallet API/contract wire matrix now governs ingress, reveal, settlement, all monetary claims, seller destination authorization, cross-layer fixtures, and mainnet evidence classification.

## Sources

[1] https://strk20-by-example.org/starknet-wallet-api/private-defi.md — STRK20 Wallet API private DeFi
[2] https://strk20-by-example.org/helpers/privacy-invoke.md — STRK20 privacy_invoke helper anatomy
[3] https://raw.githubusercontent.com/starkware-libs/starknet-specs/master/wallet-api/wallet_rpc.json — Starknet Wallet API specification
[4] https://raw.githubusercontent.com/starkware-libs/starknet-privacy/main/packages/privacy/src/actions.cairo — STRK20 action source
[5] https://raw.githubusercontent.com/starkware-libs/starknet-privacy/main/packages/privacy/src/privacy.cairo — STRK20 pool source
[6] https://raw.githubusercontent.com/starkware-libs/starknet-privacy/main/packages/privacy/src/events.cairo — STRK20 event source
[7] https://raw.githubusercontent.com/starkware-libs/starknet-privacy/main/packages/privacy/src/objects.cairo — STRK20 object source
[8] https://starknet-js.com/docs/next/guides/account/walletAccount — starknet.js WalletAccount guide
[9] https://raw.githubusercontent.com/starkience/strk20-hackathon/main/README.md — Private Sprint requirements
[10] https://raw.githubusercontent.com/starkience/strk20-hackathon/main/CONTRIBUTING.md — Private Sprint contribution rules
