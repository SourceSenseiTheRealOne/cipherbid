# CipherBid Task 2.1 — Auction Configuration Specification

**Status:** Approved v2 configuration baseline

**Verified:** 2026-08-28T08:46:58Z

**Decision:** CipherBid uses one reusable, non-upgradeable auction-house deployment with immutable pool/token/bidder-bound configuration. Each auction stores a permanently immutable seller claim handle, seller/NFT/price/deadline/capacity record, plus separately mutable lifecycle state.

## 1. Configuration layers

### Deployment-wide `AuctionHouseConfig`

```text
AuctionHouseConfig {
  pool: ContractAddress,
  payment_token: ContractAddress,
  max_bidders: u16,
}
```

| Field           | Frozen rule                                                                                                                                                  |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `pool`          | Non-zero configured STRK20 pool address, distinct from the STRK token contract. It is the only caller accepted by `privacy_invoke`.                          |
| `payment_token` | Canonical STRK contract `0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d`. STRK uses the same address on Starknet mainnet and Sepolia.[1] |
| `max_bidders`   | Deployment ceiling in `2..=32`. It bounds every auction's bidder capacity and settlement iteration.                                                          |

The constructor surface is:

```text
constructor(pool: ContractAddress, max_bidders: u16)
```

`payment_token` is not caller-configurable: the contract assigns the canonical STRK constant. The public `get_house_config()` view returns all three values, allowing deployment readback to prove the configured pool, token, and bound.

A single deployment can hold many independent auctions. Pool and payment-token addresses are not repeated in each auction record and cannot differ between auctions in the same house.

Every field typed `ContractAddress` uses the Cairo 2.20.0 range `[0, 2^251)` and CipherBid rejects zero, so valid configured addresses are exactly `1..2^251-1`; `2^251` is the first invalid high value.[2]

### Per-auction `AuctionConfig`

```text
AuctionConfig {
  auction_id: u64,
  seller: ContractAddress,
  seller_claim_handle: felt252,
  nft_contract: ContractAddress,
  token_id: u256,
  reserve_price: u128,
  collateral_cap: u128,
  bidding_deadline: u64,
  reveal_deadline: u64,
  bidder_limit: u16,
}
```

The creation surface is:

```text
create_auction(
  auction_id: u64,
  seller_claim_handle: felt252,
  nft_contract: ContractAddress,
  token_id: u256,
  reserve_price: u128,
  collateral_cap: u128,
  bidding_deadline: u64,
  reveal_deadline: u64,
  bidder_limit: u16,
)
```

`seller` is deliberately absent from calldata. The contract derives it from `get_caller_address()` and stores it in the immutable record. This prevents a caller from creating an auction that falsely names another address as seller.

## 2. Field-by-field contract

### Seller address

- `seller = get_caller_address()` at creation.
- Seller must be non-zero.
- `seller_claim_handle` must be a non-zero felt derived before creation as `Poseidon(CIPHERBID_CLAIM_V1, seller_claim_secret)`.
- The contract stores only the handle; it never receives the seller claim secret before the final claim.
- Creation later proves seller authorization by successful ERC-721 custody transfer; approval/custody mechanics belong to Task 3.2.
- Seller never changes, even if the wallet later rotates keys or transfers other assets.
- Seller is the only caller allowed to authorize the v2 seller-proceeds destination note frozen in Task 1.3.

### ERC-721 identity

- `nft_contract` is a non-zero Starknet contract address.
- `token_id` is the full ERC-721 `u256` token identifier.
- Token ID zero is valid and must not be used as an “unset” sentinel.
- The canonical lot identity is `(nft_contract, token_id)`.
- At most one non-terminal/custodied auction may reference the same lot. The custody index and release rules are implemented in Task 3.2.
- Successful creation requires atomic transfer of that exact NFT into auction-house custody; a failed transfer rolls back the record and does not consume the ID.

### Payment token and pool

- Every auction in v1 is denominated in canonical STRK.
- All price amounts use STRK base units and are stored as `u128`; no floating point or display-unit decimal enters Cairo calldata.
- `pool` is deployment-wide and immutable.
- `pool != payment_token`; confusing the ERC-20 contract with the privacy pool is rejected during construction.
- `privacy_invoke` requires both caller equality with the stored pool and the resolved `${poolAddress}` argument to match it.
- A pool upgrade at the same address does not change configuration. A new pool address requires a new auction-house deployment.

### Reserve and uniform collateral cap

```text
0 < reserve_price <= collateral_cap <= u128::MAX
```

- `reserve_price` is the minimum acceptable clearing price.
- `collateral_cap` is the exact public amount every accepted bid locks.
- A bid amount must later satisfy `reserve_price <= amount <= collateral_cap`.
- Equality `reserve_price == collateral_cap` is valid.
- Neither value can change after creation.
- Settlement and claims use these stored values; callers never supply authoritative reserve/cap values again.

### Deadlines

Both deadlines are `u64` Starknet block timestamps in Unix seconds.

Creation requires:

```text
creation_timestamp < bidding_deadline < reveal_deadline <= u64::MAX
```

Exact boundary semantics:

| Phase           | Timestamp condition                         |
| --------------- | ------------------------------------------- |
| Bidding open    | `now < bidding_deadline`                    |
| Reveal open     | `bidding_deadline <= now < reveal_deadline` |
| Settlement open | `now >= reveal_deadline`                    |

Consequences:

- A bid at exactly `bidding_deadline` is rejected.
- A reveal at exactly `bidding_deadline` is allowed.
- A reveal at exactly `reveal_deadline` is rejected.
- Settlement at exactly `reveal_deadline` is allowed.
- Creation with a bidding deadline equal to the current timestamp is rejected.
- There is no admin deadline extension, early close, or cancellation mutation in v1.

### Bidder count

Two bounds apply:

1. `ABSOLUTE_MAX_BIDDERS = 32`, compiled into the v1 model.
2. Deployment `max_bidders`, selected once in `2..=32`.

Each auction chooses:

```text
2 <= bidder_limit <= house.max_bidders <= 32
```

`bidder_limit` is capacity, not a minimum participation requirement. Settlement still supports zero bids, one valid reveal, and any count up to the configured limit under the later lifecycle specification.

The 32-bidder absolute ceiling keeps storage iteration, winner selection, tie handling, settlement gas, property tests, and readback bounded. Raising it requires an explicit new reviewed version and measured Cairo execution evidence.

## 3. `auction_id` identity and uniqueness

`auction_id` is an explicit seller-supplied non-zero `u64`.

The globally meaningful identity is:

```text
(chain_id, auction_house_address, auction_id)
```

Rules:

- `0` is reserved as an invalid/sentinel value.
- The same numeric ID may exist in another deployment or chain because commitments bind chain and auction-house address.
- Inside one auction-house deployment, each non-zero ID may be created at most once.
- IDs are never recycled after settlement, no-sale, claims, or any terminal state.
- Uniqueness uses an explicit `auction_exists[auction_id]` marker; it must not infer existence from another field because token ID zero and other legitimate zero-valued lifecycle fields exist.
- Duplicate creation rejects before external custody interaction.
- If initial creation reverts atomically, including failed NFT transfer, the existence marker rolls back and that ID remains unused.

Explicit caller-supplied IDs preserve deterministic URLs, fixtures, commitments, and evidence manifests while making duplicate handling testable. Auto-increment counters are not part of v1.

## 4. Permanent immutability

### House configuration

After constructor success, `pool`, `payment_token`, and `max_bidders` are permanently immutable.

- No admin setter exists.
- No pool/token migration entrypoint exists.
- The sprint deployment is non-upgradeable; class replacement is not exposed.
- A configuration change requires a new deployment and therefore a new commitment domain.

### Auction configuration

After successful `create_auction`, every `AuctionConfig` field is permanently immutable.

- No seller, seller claim handle, NFT, token ID, reserve, cap, deadline, or bidder-limit update is allowed.
- No “correct typo” or emergency-admin path exists.
- The only mutable values are lifecycle state and accounting: bid/reveal records, phase-derived status, winner, clearing price, settlement flag, claim-consumed flags, custody state, and conserved balances.
- A lifecycle transition must never rewrite the stored configuration.
- Configuration readback before bidding is the user's final verification point.

This separation prevents a seller or administrator from changing economic terms after commitments are formed.

## 5. Validation and write ordering

The production create path must use this order:

1. Validate deployment configuration during constructor.
2. On creation, validate caller, ID, seller claim handle, addresses, numeric bounds, price relation, deadline relation, and bidder limit.
3. Reject if `auction_exists[auction_id]` is already true.
4. Reject conflicting active NFT custody.
5. Build/write effects using checks-effects-interactions.
6. Transfer the exact ERC-721 into custody.
7. Verify custody through the transfer result/owner readback permitted by the final Cairo interface.
8. Emit `AuctionCreated` with the complete immutable configuration.

All steps occur in one Starknet transaction. Any failed external call reverts configuration, existence, and custody-index writes atomically.

Expected creation event:

```text
AuctionCreated {
  auction_id,
  seller,
  seller_claim_handle,
  nft_contract,
  token_id,
  payment_token,
  pool,
  reserve_price,
  collateral_cap,
  bidding_deadline,
  reveal_deadline,
  bidder_limit,
}
```

The event repeats deployment-wide pool/token values so public evidence can decode one receipt without relying on unstated configuration. Storage remains normalized: pool/token live once in house configuration.

## 6. Typed preimplementation oracle

The following files implement and test the frozen model without claiming an on-chain auction exists:

| File                                               | Role                                                                                                                                                 |
| -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `web/src/features/auction/auctionConfig.ts`        | Strict bigint/address/bound validator and frozen TypeScript configuration objects.                                                                   |
| `web/tests/fixtures/auction-configuration-v2.json` | Canonical machine-readable deployment, auction, seller-claim, type, boundary, identity, and immutability fixture.                                    |
| `web/tests/unit/auctionConfig.test.ts`             | Positive, exact `ContractAddress`, seller-authority, integer-boundary, price, deadline, bidder-limit, forged-house, fixture, and immutability tests. |
| This specification                                 | Normative Cairo/storage/event contract for Tasks 3.1 and 3.2.                                                                                        |

The TypeScript helper is a spec oracle for UI/config readback and cross-layer tests. It does not replace Cairo validation. Task 3 must reproduce every check on-chain and add ABI parity fixtures.

## 7. Requirement matrix

| Task requirement | Frozen definition                                               | Verification destination                           |
| ---------------- | --------------------------------------------------------------- | -------------------------------------------------- |
| Reusable house   | One deployment, many auction IDs; immutable pool/STRK/max bound | House config fixture and constructor tests         |
| Seller           | Non-zero creation caller, stored permanently                    | Seller mismatch tests and `AuctionCreated`         |
| Seller claim     | Non-zero felt handle, secret never stored                       | Felt-boundary fixture and creation/readback tests  |
| ERC-721          | Non-zero contract plus full `u256` token ID; zero ID allowed    | Boundary fixture and custody tests                 |
| STRK token       | Canonical deployment-wide STRK constant                         | House validation and deployment readback           |
| STRK20 pool      | Non-zero deployment-wide address distinct from payment token    | Constructor and caller-binding tests               |
| Reserve          | Non-zero `u128` base units                                      | Boundary tests                                     |
| Cap              | Non-zero `u128`, exact bid collateral                           | Boundary and ingress tests                         |
| Price relation   | `0 < reserve <= cap`                                            | Equal, below, zero, overflow tests                 |
| Bidding deadline | Future `u64` Unix timestamp                                     | Boundary tests                                     |
| Reveal deadline  | `u64` strictly after bidding deadline                           | Boundary tests                                     |
| Bidder bound     | Auction `2..=house.max`, house `2..=32`                         | Limit and forged-house tests                       |
| Unique ID        | Non-zero explicit `u64`, unique forever per deployment          | Duplicate and rollback tests in Task 3.2           |
| Immutability     | House and auction config permanently immutable                  | No-setter ABI review and lifecycle invariant tests |

## Task 2.1 gate

- [x] Reusable deployment configuration defined.
- [x] Seller source, address, and immutable claim-handle semantics defined.
- [x] ERC-721 contract and `u256` token ID defined.
- [x] Canonical STRK payment token defined.
- [x] Configured STRK20 pool defined.
- [x] Reserve and uniform cap defined in base units.
- [x] `0 < reserve <= cap` frozen.
- [x] Bidding and reveal deadlines plus exact boundaries frozen.
- [x] Bidding deadline strictly precedes reveal deadline.
- [x] Deployment and per-auction bidder bounds frozen at an absolute maximum of 32.
- [x] Non-zero, caller-supplied, never-reused `u64` auction identity frozen.
- [x] House and auction configuration permanently immutable after successful creation.
- [x] Typed fixture and executable validation tests created.

**Gate result:** Task 2.1 is frozen at v2. Tasks 3.1 and 3.2 may implement storage, constructor, creation, custody, event, and rollback behavior only if they preserve this v2 configuration contract.

## Sources

[1] https://raw.githubusercontent.com/starkware-libs/starknet-privacy/main/packages/privacy/src/utils.cairo — Starknet Privacy utility source
[2] https://raw.githubusercontent.com/starkware-libs/cairo/v2.20.0/corelib/src/starknet/contract_address.cairo — Cairo 2.20.0 ContractAddress corelib
