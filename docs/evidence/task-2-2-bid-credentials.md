# CipherBid Task 2.2 — Bid Commitment and Credential Specification

**Status:** Approved v1 credential baseline

**Verified:** 2026-08-28

**Decision:** CipherBid uses one non-zero bid nonce and one non-zero claim secret per bid. The claim secret derives a one-time public handle. The bid commitment binds the chain, deployment, auction, bid, claim handle, and NFT recipient in one domain-separated Starknet Poseidon hash. No claim signing key, public key, signature, or claim nonce exists in the sprint protocol.

## 1. Canonical domains

The domains are one-felt Cairo short strings:

| Purpose        | Literal              | Encoded felt                             |
| -------------- | -------------------- | ---------------------------------------- |
| Claim handle   | `CIPHERBID_CLAIM_V1` | `0x4349504845524249445f434c41494d5f5631` |
| Bid commitment | `CIPHERBID_BID_V1`   | `0x4349504845524249445f4249445f5631`     |

TypeScript uses `hash.computePoseidonHashOnElements`, whose implementation converts every input to `BigInt` and applies Poseidon hash-many.[3] Cairo uses `poseidon_hash_span` over the same ordered felt sequence.

## 2. Claim handle

The formula is exact:

```text
claim_handle = Poseidon([
  CIPHERBID_CLAIM_V1,
  claim_secret,
])
```

Rules:

- `claim_secret` is a non-zero `felt252`.
- Valid range: `1 <= claim_secret < P`.
- `claim_handle` is stored publicly with the bid and must be non-zero.
- A monetary claim supplies the secret once; the contract recomputes the handle and consumes the corresponding claim state before external interaction.
- The claim secret is not revealed during bid ingress or reveal.
- The claim secret becomes public in the claim transaction calldata when consumed; after confirmed state readback it is terminal and must be discarded from active memory.

The Stark field range is `0 <= x < P`, where `P = 2^251 + 17 * 2^192 + 1`.[2]

Exact prime:

```text
P = 0x800000000000011000000000000000000000000000000000000000000000001
```

## 3. Bid commitment

The formula and order are exact:

```text
bid_commitment = Poseidon([
  CIPHERBID_BID_V1,
  chain_id,
  auction_house,
  auction_id,
  amount,
  bid_nonce,
  claim_handle,
  asset_recipient,
])
```

| Index | Field             | Type              | Rule                                               |
| ----: | ----------------- | ----------------- | -------------------------------------------------- |
|     0 | bid domain        | `felt252`         | Exact `CIPHERBID_BID_V1` short-string felt         |
|     1 | `chain_id`        | `felt252`         | Non-zero; binds Starknet network                   |
|     2 | `auction_house`   | `ContractAddress` | Non-zero; binds deployment                         |
|     3 | `auction_id`      | `u64`             | Non-zero; binds one auction in the deployment      |
|     4 | `amount`          | `u128`            | Non-zero; later constrained by auction reserve/cap |
|     5 | `bid_nonce`       | `felt252`         | Non-zero random bid nonce                          |
|     6 | `claim_handle`    | `felt252`         | Non-zero derived claim handle                      |
|     7 | `asset_recipient` | `ContractAddress` | Non-zero committed ERC-721 recipient               |

No prefix, byte length, array length, trailing zero, public key, signature, or additional field is added.

## 4. Exact boundaries

Cairo 2.20.0 core defines `ContractAddress` as `[0, 2^251)` and exposes checked conversion from `felt252`.[1] CipherBid additionally excludes zero for auction house and NFT recipient.

| Value              | Valid range                      | Maximum valid                             | First invalid high value                  |
| ------------------ | -------------------------------- | ----------------------------------------- | ----------------------------------------- |
| Felt inputs        | `1..P-1` where non-zero required | `P - 1`                                   | `P`                                       |
| Contract addresses | `1..2^251-1`                     | `0x7fff...fff` (63 hex `f`s)              | `0x8000...000` (`2^251`)                  |
| `auction_id`       | `1..u64::MAX`                    | `18446744073709551615`                    | `18446744073709551616`                    |
| `amount`           | `1..u128::MAX`                   | `340282366920938463463374607431768211455` | `340282366920938463463374607431768211456` |

TypeScript rejects negative values explicitly. Cairo calldata cannot deserialize out-of-range `u64`, `u128`, or `ContractAddress` values into the typed function. Cairo performs explicit non-zero checks after typed deserialization.

The address boundary must not be confused with `StorageBaseAddress`, whose narrower limit is unrelated to `ContractAddress`.

## 5. Canonical vectors

The machine-readable authority is `web/tests/fixtures/bid-credentials-v1.json`.

### 5.1 Sepolia reference

```text
claim_secret    = 123456789
claim_handle    = 0x3078725b5aaffe73f545ebca32c0b5a4af14404599edd691c752e59ffca3724
chain_id        = 0x534e5f5345504f4c4941  // SN_SEPOLIA
auction_house   = 0x222
auction_id      = 7
amount          = 3000000000000000000
bid_nonce       = 987654321
asset_recipient = 0x333
commitment      = 0x34fe5ddb49c604d4b8b63f768c4d6e4159bdd4166bdc3e1e7094217c9f6313e
```

### 5.2 Minimum valid

```text
claim_secret    = 1
claim_handle    = 0x6b7f8ff6dee712dbd900e4e0269931a6dc86de5359e13dc740ca1898d110b48
chain_id        = 1
auction_house   = 1
auction_id      = 1
amount          = 1
bid_nonce       = 1
asset_recipient = 1
commitment      = 0x5c8b0026c8ddfd09e47cba64881b66d371c620d84b0e573f811ec2334526848
```

### 5.3 Maximum valid

```text
claim_secret    = P - 1
claim_handle    = 0x51f784d5ce10bdf76e3c632882ba6e181464bd8f4493fd9e7bfc44c6deefd34
chain_id        = P - 1
auction_house   = 2^251 - 1
auction_id      = u64::MAX
amount          = u128::MAX
bid_nonce       = P - 1
asset_recipient = 2^251 - 1
commitment      = 0x1dc855fa1871e1425360884f6b03c77837f2c5d47e551f86b55af0e0f8fa1b5
```

Both TypeScript and Cairo assert all three vectors. The valid Sepolia vector remains byte-for-byte unchanged from the earlier spike; the boundary vector was corrected to use the authoritative `ContractAddress` range.

## 6. Invalid-vector matrix

The fixture freezes three invalid classes for every credential input where applicable:

| Field         |        Low invalid | Zero invalid |    High invalid |
| ------------- | -----------------: | -----------: | --------------: |
| Claim secret  | `-1` in TypeScript |          `0` |             `P` |
| Chain ID      | `-1` in TypeScript |          `0` |             `P` |
| Auction house | `-1` in TypeScript |          `0` |         `2^251` |
| Auction ID    | `-1` in TypeScript |          `0` |  `u64::MAX + 1` |
| Amount        | `-1` in TypeScript |          `0` | `u128::MAX + 1` |
| Bid nonce     | `-1` in TypeScript |          `0` |             `P` |
| Claim handle  | `-1` in TypeScript |          `0` |             `P` |
| NFT recipient | `-1` in TypeScript |          `0` |         `2^251` |

Cairo tests separately prove all reachable typed boundary and non-zero failures. TypeScript tests start each invalid mutation from a fully valid reference input so an unrelated invalid field cannot make the assertion pass accidentally.

## 7. Credential lifecycle

### Private before reveal

- bid amount;
- bid nonce;
- claim secret;
- encrypted recovery password and plaintext during the active recovery operation.

### Public at ingress

- bid commitment;
- claim handle;
- auction ID;
- identical collateral cap and transaction timing.

### Public at reveal

- amount;
- bid nonce;
- claim handle;
- NFT recipient;
- recomputed commitment relation.

### Public at claim

- one-time claim secret in invoke calldata;
- claim handle;
- output note ID and public output amount;
- claim event and consumed state.

The browser may hold app-specific credentials only in the active memory session and mandatory encrypted recovery operation. Wallet keys, viewing keys, private notes, proofs, signing, and submission remain in the wallet.

## 8. Superseded design exclusion

The active protocol contains none of:

```text
claim_signing_key
claim_private_key
claim_public_key
claim_signature
claim_nonce
CIPHERBID_CLAIM_AUTH_V1
```

The historical local-vault document is explicitly non-normative. Active TypeScript and Cairo source use `bidNonce` / `bid_nonce`, never the ambiguous `bidSecret` / `bid_secret` name.

## 9. Cross-layer authorities

| Surface                                    | Authority                                    |
| ------------------------------------------ | -------------------------------------------- |
| Machine-readable vectors and invalid cases | `web/tests/fixtures/bid-credentials-v1.json` |
| TypeScript validation/hash implementation  | `web/src/features/auction/commitment.ts`     |
| TypeScript executable checks               | `web/tests/unit/commitment.test.ts`          |
| Cairo validation/hash implementation       | `contracts/src/commitment.cairo`             |
| Cairo executable checks                    | `contracts/tests/test_commitment.cairo`      |
| Human-readable protocol                    | This document                                |

A deliberate change requires a reviewed fixture version bump and simultaneous TypeScript, Cairo, test, and documentation updates.

## Task 2.2 gate

- [x] Chain ID bound into the bid commitment.
- [x] Auction-house address bound into the bid commitment.
- [x] Auction ID bound into the bid commitment.
- [x] Bid amount bound into the bid commitment.
- [x] Non-zero bid nonce bound into the bid commitment.
- [x] Claim handle bound into the bid commitment.
- [x] Non-zero NFT recipient bound into the bid commitment.
- [x] `claim_handle = Poseidon(CIPHERBID_CLAIM_V1, claim_secret)` frozen.
- [x] Non-zero claim secret required.
- [x] Felt, `ContractAddress`, `u64`, and `u128` boundaries frozen.
- [x] TypeScript/Cairo reference, minimum, and maximum Poseidon vectors frozen.
- [x] Invalid and boundary vectors added.
- [x] Superseded claim-signing-key design excluded.

**Gate result:** one v1 bid-credential contract governs TypeScript, Cairo, fixtures, future recovery, reveal, and claim implementation.

## Sources

[1] https://raw.githubusercontent.com/starkware-libs/cairo/v2.20.0/corelib/src/starknet/contract_address.cairo — Cairo 2.20.0 ContractAddress corelib
[2] https://docs.starknet.io/build/corelib/core-felt252 — Starknet felt252 core documentation
[3] https://raw.githubusercontent.com/starknet-io/starknet.js/develop/src/utils/hash/classHash/poseidon.ts — starknet.js Poseidon hash source
