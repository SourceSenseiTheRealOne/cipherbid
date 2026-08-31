# CipherBid evidence index

This directory contains public, secret-free specifications and verified readbacks. Files describe only what their cited source or chain readback proves. Wallet keys, viewing keys, bid nonces, claim secrets, recovery payloads, private notes, proof witnesses, sessions, and raw wallet output never belong here.

## Verified mainnet evidence

| Artifact                                                           | Status                                          | Scope                                                                                                                                                        |
| ------------------------------------------------------------------ | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [`mainnet/deployment.md`](mainnet/deployment.md)                   | Verified                                        | Mainnet declarations, deployed addresses, successful receipts, class hashes, immutable AuctionHouse config, DemoERC721 ownership, and bounded fee accounting |
| [`mainnet/deployment.json`](mainnet/deployment.json)               | Verified                                        | Machine-readable public deployment manifest consumed by frontend and auction-plan tooling                                                                    |
| [`mainnet/release-candidate.md`](mainnet/release-candidate.md)     | Superseded pre-write freeze plus current status | Approved accounts, protocol addresses, demo economics, pool-fee assumptions, and release stop conditions                                                     |
| [`mainnet/transactions.md`](mainnet/transactions.md)               | Verified                                        | Ten canonical lifecycle receipts; five qualifying pool-touching CipherBid transactions with event and trace checks                                           |
| [`mainnet/auction-lifecycle.md`](mainnet/auction-lifecycle.md)     | Verified                                        | Actual 2/4 STRK reveals, Vickrey settlement, NFT delivery, all claims, and zero residual value                                                               |
| [`submission/pages-deployment.md`](submission/pages-deployment.md) | Verified                                        | Durable GitHub Pages settings, exact deployed `main` SHA, successful hosted workflow/deployment, HTTP routes, and clean-browser runtime checks               |
| [`submission/demo-video.md`](submission/demo-video.md)             | Verified                                        | Public YouTube identity, playback, duration, transcript alignment, and privacy-boundary checks                                                               |

The mainnet lifecycle is verified through both bidder claims and the seller-proceeds claim. Final actual and accounted AuctionHouse STRK balances are zero.

## Prepared recording control

| Artifact                                                           | Status     | Scope                                                                                                          |
| ------------------------------------------------------------------ | ---------- | -------------------------------------------------------------------------------------------------------------- |
| [`mainnet/demo-script.md`](mainnet/demo-script.md)                 | Superseded | Earlier maximum-three-minute narration and capture controls for the actual `2/4 STRK` case                     |
| [`../demo-presentation-script.md`](../demo-presentation-script.md) | Published  | Plain-language live-page walkthrough for the completed seller claim, atomic delivery, and token-launch roadmap |

The final video is published at `https://youtu.be/pYZk6KXko7o`; unauthenticated playback and duration were read back before manifest publication.

## Durable frontend publication

The durable frontend is verified at `https://sourcesenseitherealone.github.io/cipherbid/`. The real settled route is `/auction/?id=1788040057342`; clean-browser readback verified HTTP `200`, sold state, both reveal values, clearing price, NFT delivery, and zero horizontal overflow. That URL is now published in `strk20.json.demo_url`.

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
