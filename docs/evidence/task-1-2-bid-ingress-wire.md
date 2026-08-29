# CipherBid Task 1.2 — Bid-Ingress Wire Contract

**Status:** Frozen v1 wire baseline

**Verified:** 2026-08-27T10:52:48Z

**Decision:** A bid enters CipherBid through one wallet-submitted STRK20 transaction with exactly two application actions: **`withdraw` then `invoke`**. Bid ingress creates no open note.

## 1. Normative route decision

The Wallet API supports ordered `withdraw`, `transfer`, and `invoke` actions. The pool protocol assigns withdrawal phase 6 and invoke phase 7, so `withdraw → invoke` is the protocol-valid order; reversing it is rejected as out of phase.[3][4]

The official open-note DeFi pattern uses `transfer(amount: "OPEN") → invoke` when the helper produces output that must be credited to an amount-unknown note.[1][2] CipherBid bid ingress is different: the equal collateral cap leaves the pool for the auction house and remains locked there. The helper returns no value to the pool, so its exact return is an empty `Span<OpenNoteDeposit>`.[2][5]

Therefore:

- **Selected:** `withdraw(cap, auctionHouse) → invoke(auctionHouse, calldata)`.
- **Rejected:** open-note `transfer("OPEN") → invoke`, because bid ingress has no output note to fill.
- **Rejected:** `invoke → withdraw`, because it violates the pool action-phase order and would call the auction house before collateral arrives.[4]
- **Rejected:** public ERC-20 transfer initiated by the dapp, because the pool must be the public source of the equal cap.
- **Rejected:** direct auction-house call for ingress, because it would not prove live STRK20-funded collateral.

The pool's private token balance sheet consumes the bidder's selected mature notes and applies the public withdrawal atomically with the invoke. Any failure in the auction house reverts the whole pool transaction.[4][5]

## 2. Frozen Wallet API action sequence

The canonical machine-readable sample is:

`web/tests/fixtures/bid-ingress-v1.json`

### Action 0 — withdraw the uniform cap

| Field       | Exact value/source                          | Rule                                                    |
| ----------- | ------------------------------------------- | ------------------------------------------------------- |
| `type`      | `"withdraw"`                                | Literal.                                                |
| `token`     | configured auction payment token            | Must equal the verified auction payment token.          |
| `amount`    | public uniform collateral cap in base units | Must be the chain-read cap, not the private bid amount. |
| `recipient` | deployed CipherBid auction-house address    | The pool publicly transfers the cap here.               |

The Wallet API defines withdrawal as a public transfer to the named recipient, and the pool emits its token, recipient, and amount.[3][6] CipherBid deliberately uses the same public cap for every accepted bidder; it never serializes the private bid amount.

### Action 1 — invoke CipherBid

| Field      | Exact value/source                               | Rule                                                                      |
| ---------- | ------------------------------------------------ | ------------------------------------------------------------------------- |
| `type`     | `"invoke"`                                       | Literal.                                                                  |
| `contract` | same auction-house address as action 0 recipient | Any mismatch fails the fixture and preflight.                             |
| `calldata` | eight entries frozen below                       | No insertion, deletion, reordering, normalization, or alternate encoding. |

No third application action is permitted. The wallet may add its own relayer/paymaster fee withdrawal as specified by the Wallet API; that wallet-owned fee action is not part of CipherBid's supplied action array.[3]

## 3. Frozen `privacy_invoke` calldata

The pool calls the target's `privacy_invoke` selector.[5][8]

The supplied calldata is deserialized directly into the helper's Cairo parameters, so position is part of the wire contract.[2][4]

| Index | Cairo parameter | Cairo type        | Bid-ingress value                                  | Constraint                                                                                                  |
| ----: | --------------- | ----------------- | -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
|   `0` | `operation`     | `u8`              | `0` / `0x0`                                        | Literal `PLACE_BID`.                                                                                        |
|   `1` | `auction_id`    | `u64`             | selected auction ID                                | Canonical unsigned 64-bit value.                                                                            |
|   `2` | `primary_value` | `felt252`         | domain-separated bid commitment                    | Non-zero and unique under the auction protocol; lifecycle claims reuse this slot for their claim secret.    |
|   `3` | `claim_handle`  | `felt252`         | `Poseidon(CIPHERBID_CLAIM_V1, claim_secret)`       | Non-zero and unique where required.                                                                         |
|   `4` | `reserved_0`    | `felt252`         | `0` / `0x0`                                        | Must remain zero for `PLACE_BID`.                                                                           |
|   `5` | `reserved_1`    | `felt252`         | `0` / `0x0`                                        | Must remain zero for `PLACE_BID`.                                                                           |
|   `6` | `pool_address`  | `ContractAddress` | literal string `${poolAddress}` in the dapp action | Wallet resolves it to the active privacy-pool address. Contract requires equality with its configured pool. |
|   `7` | `open_note_id`  | `felt252`         | `0` / `0x0`                                        | Must remain zero because ingress creates no open note; claims use the open-note placeholder here.           |

The TypeScript builder serializes integer values as canonical felt hex strings. The literal placeholder is not converted to a felt, normalized as an address, or interpolated by CipherBid.

### Why keep index 6 when the caller is already the pool?

The Cairo contract separately requires `get_caller_address() == configured_pool`. Index 6 is a redundant cross-layer binding: the wallet-resolved `${poolAddress}` must also equal that configured pool. Neither check replaces deployment-identity verification.

The reserved slots retain the already-proven eight-felt envelope while this task freezes bid ingress only. They are not permission to add hidden semantics later: any non-zero bid-ingress value is wire drift and must fail before submission.

## 4. Placeholder contract

The Wallet API defines exactly these relevant substitutions:[3]

| Placeholder         | Protocol meaning                                                                                             | Bid-ingress use                                              |
| ------------------- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------ |
| `${poolAddress}`    | Active STRK20 privacy-pool contract address                                                                  | **Used once**, exactly at `actions[1].calldata[6]`.          |
| `${openNoteIds[N]}` | ID of the zero-based Nth open note created by a same-transaction `transfer` whose amount is literal `"OPEN"` | **Not used**. Bid ingress creates and fills zero open notes. |

The literal spellings, braces, dollar sign, capitalization, brackets, and zero-based indexing are protocol data.[3] Application code must not “helpfully” rewrite them.

The Wallet API rejects a transaction when the number of open notes created and filled does not match.[3] CipherBid's bid-ingress count is exactly zero created and zero returned, so the empty-span route is balanced.

## 5. Frozen `privacy_invoke` return

Cairo signature:

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

`OpenNoteDeposit` is the protocol struct `{ note_id: felt252, token: ContractAddress, amount: u128 }`.[7]

For `PLACE_BID`, the semantic return is an empty span with length `0`; its raw Cairo serialization is the single length felt `[0x0]`. No trailing return data is allowed. The pool deserializes the span and rejects malformed or trailing data.[2][5][8]

Consequences:

- the auction house does not approve an output token for the pool;
- no `OpenNoteDeposit` is applied;
- no `${openNoteIds[N]}` exists;
- the cap remains in auction-house custody/accounting;
- a failed bid acceptance reverts the withdrawal and invoke atomically.

## 6. Wallet proof, signing, and submission boundary

The actual bid uses:

```text
strk20InvokeTransaction(actions)
```

Under the current Wallet API, the wallet supplies private state, generates the zero-knowledge proof, displays approval, signs, adds its fee action, and submits the transaction. CipherBid receives only `{ transaction_hash }` on success.[3]

CipherBid may run only this non-submittable shape preflight first:

```text
strk20PrepareInvoke(actions, true)
```

With `simulate: true`, the wallet explicitly skips proof generation and returns empty proof fields. CipherBid must never call non-simulated `strk20PrepareInvoke` for bid submission, because that would return proof material to the dapp and make the dapp responsible for broadcast.[3]

### Application data boundary

CipherBid receives or constructs only:

- public action data;
- the in-memory bid commitment inputs already allowed by the custody decision;
- simulated call shape with empty proof fields;
- submitted transaction hash;
- public receipt, events, and state readback.

CipherBid never receives:

- wallet private keys or seed material;
- viewing keys;
- private notes, channels, nullifiers, or note-selection state;
- non-empty proof data, proof output, or proof facts;
- wallet session secrets.

## 7. Frozen receipt and event expectations

A transaction is not a successful bid merely because the wallet returned a hash. Acceptance requires an on-chain receipt with successful execution/finality plus public readback showing the bid exists.

### Required pool-side evidence

| Evidence                       | Required fields/meaning                                                                                                                       |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| ERC-20 `Transfer`              | Payment token, sender = configured pool, recipient = auction house, amount = uniform cap.                                                     |
| Pool `Withdrawal`              | `to_addr = auction_house`, `token = payment_token`, `amount = cap`; encrypted user address is opaque and must not be decoded by CipherBid.[6] |
| Pool `ExternalContractInvoked` | `contract_address = auction_house`, `selector = selector!("privacy_invoke")`.[5][6][8]                                                        |
| Pool `NoteUsed`                | Zero or more may appear depending on wallet-selected inputs; CipherBid does not decode ownership.[6]                                          |
| Fee evidence                   | A wallet-added fee withdrawal/STRK transfer may also appear and must not be confused with the cap withdrawal.[3]                              |

### Required CipherBid event

Production auction-house implementation must emit:

```text
BidCommitted {
  auction_id,
  commitment,
  claim_handle,
  collateral
}
```

`collateral` must equal the observed incoming payment-token balance delta and the configured cap. The event must not contain bidder address, bid amount, bid nonce/secret, claim secret, viewing-key material, note IDs, or proof material.

### Forbidden ingress events

Because the route creates no open note and returns no deposit:

- no pool `OpenNoteCreated` event;
- no pool `OpenNoteDeposited` event.

Other protocol events may exist because of registration, note use, or wallet fee handling.[3][6] Receipt verification must match required event identity and fields rather than require an unrealistically exact total event count.

### Required readback

After successful receipt confirmation, read the auction house and require:

- bid count advanced exactly once;
- the commitment and claim handle are registered for the selected auction;
- locked collateral/accounted balance advanced by exactly the cap;
- the bid remains unrevealed;
- no duplicate submission was accepted.

Timeout means **submitted/unconfirmed**, not success or failure.

## 8. Cross-layer drift fixture

The following files freeze the v1 wire contract:

| File                                           | Role                                                                                                                                                                                            |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `web/tests/fixtures/bid-ingress-v1.json`       | Canonical action sample, every calldata index, placeholders, return contract, submission boundary, event set, and private-data boundary.                                                        |
| `web/tests/unit/bidIngressWireFixture.test.ts` | Executes the real TypeScript builder, compares both actions and every calldata index, parses the Cairo interface argument names/types/order, and checks placeholder/event/privacy expectations. |
| `web/src/features/privacy/strk20Actions.ts`    | Production Wallet API action builder.                                                                                                                                                           |
| `contracts/src/lib.cairo`                      | Current Cairo `privacy_invoke` ABI surface; the shared `primary_value` and `open_note_id` slots serve ingress and Task 1.3 claims without changing any index.                                   |
| `contracts/tests/test_contract.cairo`          | Cairo proof that the configured pool can route the sample and receives an empty span.                                                                                                           |

The fixture fails if any of these drift:

- action count or `withdraw → invoke` order;
- token, amount, recipient, or invoke target;
- calldata length;
- any calldata value or index;
- Cairo argument name, type, count, or order;
- literal placeholder location or spelling;
- accidental `${openNoteIds[N]}` introduction;
- return type/expected length declaration;
- proof/submission ownership;
- required or forbidden event names;
- private material allowed into the app.

The current `AuctionIngressSpike` remains local-only and must not receive funds. It proves caller binding, calldata dispatch, and empty-return compatibility, but it does **not** yet implement production balance-delta accounting or emit `BidCommitted`; those are Task 3 implementation gates, not evidence of a deployed auction house.

## 9. Requirement-to-evidence matrix

| Task requirement                        | Frozen answer                                                                 | Evidence                                              |
| --------------------------------------- | ----------------------------------------------------------------------------- | ----------------------------------------------------- |
| Derive official sequence                | `withdraw → invoke` in one STRK20 transaction                                 | Official Wallet API, pool action phases, fixture      |
| Resolve open-note alternative           | No open note for ingress; zero created and returned                           | Official helper/open-note docs, empty-span Cairo test |
| Verify placeholders                     | `${poolAddress}` at index 6; no `${openNoteIds[N]}`                           | Wallet API schema, fixture test                       |
| Freeze order                            | Action 0 withdraw; action 1 invoke                                            | Fixture deep equality                                 |
| Freeze calldata                         | Eight indexed entries in §3                                                   | Fixture plus Cairo ABI parity test                    |
| Freeze arguments/return                 | Typed eight-argument `privacy_invoke`; empty `Span<OpenNoteDeposit>`          | Cairo interface/test, protocol return parser          |
| Freeze receipt/events                   | Cap withdrawal + pool invoke + production `BidCommitted`; no open-note events | §7 and fixture                                        |
| Wallet proves/submits                   | `strk20InvokeTransaction(actions)`                                            | Wallet API spec                                       |
| App excludes private wallet/proof state | Simulated empty-proof preflight only; hash result on submit                   | Wallet API spec and fixture                           |
| Cross-layer drift gates                 | JSON fixture + TS builder/Cairo-interface parity test                         | Fresh test execution                                  |

## Task 1.2 gate

- [x] Official action model and phase ordering verified.
- [x] Bid ingress resolved to `withdraw → invoke`.
- [x] Open-note route rejected for ingress with explicit rationale.
- [x] `${poolAddress}` frozen literally at calldata index 6.
- [x] `${openNoteIds[N]}` explicitly absent.
- [x] Every action and calldata position frozen.
- [x] `privacy_invoke` arguments and empty return frozen.
- [x] Receipt, required events, forbidden events, and readback frozen.
- [x] Wallet proof/sign/submission responsibility frozen.
- [x] App private-data/proof boundary frozen.
- [x] Cross-layer fixtures created.

**Gate result:** The bid-ingress wire contract is frozen. Production acceptance, balance-delta accounting, and `BidCommitted` emission remain intentionally deferred to the Task 3 auction-house implementation.

## Sources

[1] https://strk20-by-example.org/starknet-wallet-api/private-defi.md
[2] https://strk20-by-example.org/helpers/privacy-invoke.md
[3] https://raw.githubusercontent.com/starkware-libs/starknet-specs/master/wallet-api/wallet_rpc.json
[4] https://raw.githubusercontent.com/starkware-libs/starknet-privacy/main/packages/privacy/src/actions.cairo
[5] https://raw.githubusercontent.com/starkware-libs/starknet-privacy/main/packages/privacy/src/privacy.cairo
[6] https://raw.githubusercontent.com/starkware-libs/starknet-privacy/main/packages/privacy/src/events.cairo
[7] https://raw.githubusercontent.com/starkware-libs/starknet-privacy/main/packages/privacy/src/objects.cairo
[8] https://raw.githubusercontent.com/starkware-libs/starknet-privacy/main/packages/privacy/src/utils.cairo
