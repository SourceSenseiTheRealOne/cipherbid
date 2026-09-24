# CipherBid engineering notes

CipherBid implements a one-unit Vickrey auction for ERC-721 assets. Cairo contracts own custody and accounting; the browser reads public state and requests wallet actions. The implemented payment asset is STRK, with a maximum of 32 bidders per auction.

## Funding without exposing the bid

A commitment hides a value but does not prove that its author can pay. Escrowing the exact bid funds it, but the token transfer from STRK20 into the helper contract is a public boundary.

CipherBid accepts the same public cap from every bidder. In the recorded mainnet auction, both participants locked `4 STRK`, then revealed `2 STRK` and `4 STRK`. The bid amount was concealed until reveal without pretending the helper's collateral balance was encrypted. This trades capital efficiency for a simple, enforceable funding rule.

The [`privacy_invoke` entrypoint](../contracts/src/lib.cairo) accepts only the configured pool. It validates the operation, deadline, bidder bound and uniqueness, then requires the observed STRK balance to equal the previous accounted balance plus the cap before recording ingress. Claims likewise reject balance drift. Unexpected direct token transfers can therefore stop these paths rather than being silently treated as auction collateral.

## Auction state and atomic delivery

Creation transfers the NFT into contract custody. During bidding, the contract records commitments and claim handles, not bid amounts. Reveal checks the commitment and recipient during the configured reveal window. After that window, settlement scans the bounded bid set.

The highest revealed bid wins if it meets the reserve. The clearing price is the greater of the reserve and second-highest revealed bid; an equal highest bid does not replace an earlier accepted winner. If no bid meets the reserve, settlement returns the NFT to the seller.

Settlement writes the outcome, transfers the NFT and checks the resulting owner in one Starknet transaction. A failed transfer or owner assertion reverts the transaction. This is the precise meaning of atomic delivery, not a guarantee of service availability or audited security.

The [lifecycle specification](evidence/task-2-3-lifecycle-specification.md) records the phase and deadline rules. The [Cairo implementation](../contracts/src/lib.cairo) is authoritative; the [TypeScript settlement model](../web/src/features/auction/auctionLifecycle.ts) supports client reasoning and tests.

## Claims and conservation

Each accepted bidder funds the full cap. A losing bidder can recover that cap; a winner can recover the cap minus the clearing price. The seller's entitlement is the clearing price. The contract binds claims to their handles, checks the claim secret and prevents repeated consumption. Seller proceeds additionally require authorization of the exact open note by the auction's seller.

Payments return through STRK20 open-note claims. Open-note edges and their amounts are not secret. The economic result also depends on the live pool fee, which the UI reads rather than assuming a fixed rate.

The [mainnet lifecycle](evidence/mainnet/auction-lifecycle.md) records all three completed claims and zero final actual/accounted house balances. The seller deliberately completed a `2 STRK` claim while the pool charged `6 STRK`; this demonstrated the lifecycle but was economically unfavorable. The historical amount is not a promise about future fees.

## Credentials and wallet authority

The [bid commitment](../contracts/src/commitment.cairo) binds chain ID, auction-house address, auction ID, amount, nonce, claim handle and NFT recipient under a domain tag. Recovery credentials also identify the network, deployment, auction and role so that importing a file does not authorize a different auction.

The wallet keeps signing keys, viewing keys, private notes and proof witnesses. It owns note discovery, proving, signing and submission. The app holds its active bid/claim credentials in browser memory, encrypts a user-downloaded recovery bundle and verifies that it can be imported before submission. It does not put plaintext credentials in browser storage, URLs, logs or a backend. See [recovery bundle validation](../web/src/features/credentials/recoveryBundle.ts).

That division limits custody exposure but does not remove frontend risk. A compromised page can substitute an action descriptor before the wallet prompt. Users still need to verify the target and value shown by their wallet; strong recovery passwords and possession of the encrypted file also matter.

## Public reads and confirmation

The [auction reader](../web/src/features/auction/auctionReader.ts) checks the deployed class hash, configured pool, token and bidder bound. It then reads auction configuration, state, bids and NFT ownership, rejecting a custody mismatch instead of rendering an assumed result.

The [receipt verifier](../web/src/features/transactions/receiptVerifier.ts) requires successful accepted execution, the expected AuctionHouse event, a pool event where required, and a matching state readback. A timeout is an unconfirmed result, not proof that the transaction failed. The recorded creation flow recovered its public event and NFT custody after a lost RPC response rather than replaying the write.

Published receipt links are scoped to the known mainnet auction. Current state still comes from RPC. Neither fixture tests nor a static screenshot substitute for the [transaction ledger](evidence/mainnet/transactions.md).

## Deployment and verification

Next.js exports the public frontend to GitHub Pages under `/cipherbid`. The deployment workflow publishes only public network configuration. There is no application server or database; the browser talks to public RPC and a supported wallet. The repository name and live URL remain stable because the sprint registry and demo video already reference them.

The web gates cover formatting, lint, strict types, unit/integration tests, Chromium journeys, a normal production build and the static Pages build. Cairo gates cover formatting, compilation and contract tests. The [security invariants](evidence/task-2-4-security-invariants.md) describe the intended negative cases; [local development](local-development.md) lists commands.

The [current dependency advisory caveat](local-development.md#dependency-advisory-caveat) records unresolved server-side Next.js/sharp findings separately from the static Pages deployment. Passing tests are not a clean dependency audit.

Source checks, a browser read and the historical mainnet lifecycle are different evidence. This repository does not claim a third-party audit or production readiness. Multi-unit token launches would need new allocation and settlement contracts and are outside the current deployment.

## Privacy limits

Bids are public after reveal. Deposits, withdrawals, timing, bid count, equal collateral, settlement, direct account calls and open-note edges remain observable. Channel setup and distinctive activity can create links between otherwise private actions. STRK20 also has its own screening and selective-disclosure policy.

Wallet, prover, relayer, screening and RPC availability are external dependencies. No custom prover or privacy cryptography is implemented here. See the [project security context](../context/security.md) and [privacy context](../context/privacy.md) for the complete boundary.
