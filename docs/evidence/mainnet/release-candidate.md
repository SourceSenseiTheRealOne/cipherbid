# CipherBid mainnet release candidate

Frozen at `2026-08-28T23:25:14Z` before any CipherBid mainnet contract write.

## Public identities

| Role | Address | Live state |
| --- | --- | --- |
| Deployer / seller | `0x01017404a72b0d5312d7f41e81e0a87b89387db78361bb4ce60b0e0a390d72aa` | Ready v0.4.0 account; registered with STRK20; `200.133038423947494944 STRK` public balance |
| Bidder A | `0x00289637e6debed46ce1a64ea30a9f1fa492458bac580c908f940f225fd11a8e` | Ready v0.4.0 account; registered with STRK20; `11.950996656593615344 STRK` public balance |
| Bidder B | `0x057791bafe2653e8a62509261aeba6a9d09f1fe09f039c9ff0c09c00c24b1f1a` | Ready v0.4.0 account; registered with STRK20; `11.950870436658591056 STRK` public balance |

No signing key, viewing key, recovery payload, wallet session, private note, or proof material belongs in this repository or its evidence.

## Network and protocol

| Field | Frozen value |
| --- | --- |
| Network | Starknet mainnet |
| Chain ID | `0x534e5f4d41494e` |
| RPC | `https://api.zan.top/public/starknet-mainnet/rpc/v0_10` |
| STRK token | `0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d` |
| STRK20 pool | `0x040337b1af3c663e86e333bab5a4b28da8d4652a15a69beee2b677776ffe812a` |
| Live pool fee at freeze | `6 STRK` per private operation |
| Note maturity | At least 10 accepted blocks |

The pool fee is governance-controlled. Runtime preflight must read it again; `6 STRK` is evidence for this freeze, not a permanent protocol constant.

## Auction lifecycle

| Field | Value |
| --- | ---: |
| Reserve | `1 STRK` |
| Equal collateral cap | `4 STRK` |
| Bidder limit | `2` |
| Bidder A bid | `2 STRK` |
| Bidder B bid | `3 STRK` |
| Expected winner | Bidder B |
| Expected clearing price | `2 STRK` |
| Expected loser refund | `4 STRK` |
| Expected winner surplus | `2 STRK` |
| Expected seller proceeds | `2 STRK` |
| Bidding window | `10 minutes` |
| Reveal window | `5 minutes` maximum |

Both public ingresses transfer the same `4 STRK` collateral cap. The actual bid is sealed only until reveal; reveal data, settlement, deposits, withdrawals, timing, and open-note edges are public as described in the root documentation.

## Funding and write ceiling

At the observed `6 STRK` pool fee:

- minimum bidder shield for deposit, bid, and one claim: `22 STRK`;
- bidder shield target with buffer: `24 STRK` each;
- seller shield target for deposit plus proceeds claim: `12 STRK`;
- total mainnet deployer spend ceiling for declarations, deployments, public top-ups, setup, and lifecycle fees: **`150 STRK`**.

Every transaction is estimated before submission and must fail closed if its cumulative authorized ceiling would exceed `150 STRK`. Bidder public balances require top-up before a `24 STRK` shield. The seller/deployer already has enough public balance for the frozen ceiling, but no write occurs until local signer custody is configured without logging secret material.

## Contract artifacts

| Contract | Frozen reviewed class hash | Mainnet status at freeze |
| --- | --- | --- |
| AuctionHouse | `0x06aa99b7ae9e10619b5a3c1713a4d71054844d3dda8e21bef98db6e653d5efc4` | Not declared |
| DemoERC721 | `0x06c7cba5680595203f9327f5784130907bad1b808891122ad358c10b93136a41` | Not declared |

Mainnet deployment must read back the declared class hashes, constructor configuration, maximum bidder count, payment token, STRK20 pool, NFT custody, and transaction receipts before publishing any address or hash.

## Approval and stop conditions

The user explicitly authorized mainnet deployment and use of mainnet funds on `2026-08-28`, after asking that implementation and tests finish first. Mainnet writes remain ordered after the local release-candidate implementation and test suite.

Stop before any write if:

- the connected or local deployer differs from the frozen deployer;
- chain ID, pool, token, class hash, or account class differs;
- the live pool fee changes without recomputing shield targets;
- estimated cumulative spend exceeds `150 STRK`;
- either bidder is not registered or lacks mature private funds;
- a credential would enter source, logs, command history, or public evidence.
