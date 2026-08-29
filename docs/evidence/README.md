# CipherBid evidence index

This directory contains public, secret-free specifications and verified readbacks. Files describe only what their cited source or chain readback proves. Wallet keys, viewing keys, bid nonces, claim secrets, recovery payloads, private notes, proof witnesses, sessions, and raw wallet output never belong here.

## Verified mainnet evidence

| Artifact                                                           | Status                                          | Scope                                                                                                                                                        |
| ------------------------------------------------------------------ | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [`mainnet/deployment.md`](mainnet/deployment.md)                   | Verified                                        | Mainnet declarations, deployed addresses, successful receipts, class hashes, immutable AuctionHouse config, DemoERC721 ownership, and bounded fee accounting |
| [`mainnet/deployment.json`](mainnet/deployment.json)               | Verified                                        | Machine-readable public deployment manifest consumed by frontend and auction-plan tooling                                                                    |
| [`mainnet/release-candidate.md`](mainnet/release-candidate.md)     | Superseded pre-write freeze plus current status | Approved accounts, protocol addresses, demo economics, pool-fee assumptions, and release stop conditions                                                     |
| [`submission/pages-deployment.md`](submission/pages-deployment.md) | Verified                                        | Durable GitHub Pages settings, exact deployed `main` SHA, successful hosted workflow/deployment, HTTP routes, and clean-browser runtime checks               |

The mainnet private lifecycle is **not yet verified**. Do not create `mainnet/transactions.md`, `mainnet/auction-lifecycle.md`, or add hashes to `strk20.json` until the corresponding pool-touching transactions succeed and independent receipt/state readback passes.

## Prepared recording control

| Artifact                                           | Status                      | Scope                                                                                                                                        |
| -------------------------------------------------- | --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| [`mainnet/demo-script.md`](mainnet/demo-script.md) | Prepared; recording blocked | Maximum-three-minute narration, capture rules, and hard evidence gates bound to the deployed mainnet contracts and canonical `2/3 STRK` case |

The script is not demo-video evidence. Its hard gate forbids recording or publication until the complete real lifecycle, claims, and Atomic Delivery Receipt are independently verified.

## Durable frontend publication

The durable frontend is verified at `https://sourcesenseitherealone.github.io/cipherbid/`, with live auction reads at `/auction?id=<positive-u64>`. The public deployment record binds the successful hosted workflow to the exact `main` SHA and browser readback. `strk20.json.demo_url` remains empty until the final paired lifecycle verifies the real auction route.

## Canonical lifecycle and security controls

| Artifact                                                                     | Scope                                                                                  |
| ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| [`task-0-demo-matrix.md`](task-0-demo-matrix.md)                             | Canonical seller, two-bidder, observer, settlement, and public/private evidence matrix |
| [`task-1-1-wallet-api-route.md`](task-1-1-wallet-api-route.md)               | Wallet API custody route and capability boundary                                       |
| [`task-1-2-bid-ingress-wire.md`](task-1-2-bid-ingress-wire.md)               | Equal-cap private ingress wire contract                                                |
| [`task-1-3-lifecycle-wire-matrix.md`](task-1-3-lifecycle-wire-matrix.md)     | Typed lifecycle calls, events, and readbacks                                           |
| [`task-2-1-auction-configuration.md`](task-2-1-auction-configuration.md)     | Auction configuration and bounds                                                       |
| [`task-2-2-bid-credentials.md`](task-2-2-bid-credentials.md)                 | Commitment and recovery credential model                                               |
| [`task-2-3-lifecycle-specification.md`](task-2-3-lifecycle-specification.md) | Full state-machine specification                                                       |
| [`task-2-4-security-invariants.md`](task-2-4-security-invariants.md)         | Contract, custody, conservation, and replay invariants                                 |

## Rehearsal evidence

| Artifact                                                           | Scope                                                          |
| ------------------------------------------------------------------ | -------------------------------------------------------------- |
| [`sepolia/deployment-manifest.md`](sepolia/deployment-manifest.md) | Historical Sepolia deployment identity and configuration       |
| [`sepolia/demo-runbook.md`](sepolia/demo-runbook.md)               | Historical public no-sale rehearsal and execution instructions |
| [`sepolia-feasibility.md`](sepolia-feasibility.md)                 | Earlier live feasibility findings and limitations              |

Sepolia evidence is rehearsal evidence only. It does not establish mainnet private-lifecycle completion.

## Submission controls

| Artifact                                                               | Scope                                                              |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------ |
| [`hackathon-requirements-matrix.md`](hackathon-requirements-matrix.md) | Official requirement-to-evidence mapping and truthfulness controls |
| [`winning-product-scope.md`](winning-product-scope.md)                 | Bounded product scope and non-goals                                |

## Publication gate

A mainnet lifecycle transaction may enter public evidence only when all applicable checks pass:

1. the exact transaction exists on Starknet mainnet;
2. its receipt is `SUCCEEDED` and accepted on L2 or L1;
3. expected CipherBid events come from the verified AuctionHouse;
4. operations expected to touch STRK20 include a pool event;
5. post-transaction contract/NFT state matches the intended transition;
6. the record contains no secret-bearing wallet, recovery, proof, or session data.

`strk20.json` additionally requires at least three unique qualifying mainnet hashes plus verified public demo and video URLs. Empty fields are preferable to fabricated or premature claims.
