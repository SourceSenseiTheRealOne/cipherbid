# Sepolia feasibility evidence

Status captured: 2026-08-24T00:04:27+01:00

## Result

The wallet connection, action-shape, canonical-cap, and contract feasibility boundaries are locally verified. A real STRK20 wallet preparation and transaction proof is **blocked**, not passed: the production auction house, recovery flow, transaction orchestrator, supported-wallet browser session, and reviewed Sepolia deployment do not yet exist together. Decision 0002 permits app-specific bidder and seller claim credentials only in active browser memory plus mandatory password-encrypted recovery; wallet keys, viewing keys, notes, proofs, and submission remain inside the wallet. No transaction hash or receipt is recorded below because no Sepolia write occurred.

## Read-only live-network evidence

RPC: `https://starknet-sepolia-rpc.publicnode.com`

- `starknet_chainId` returned `0x534e5f5345504f4c4941` (`SN_SEPOLIA`).
- `starknet_blockNumber` returned `13943785` at capture time.
- STRK20 Sepolia pool: `0x0254a6b2997ef52e9f830ce1f543f6b29768295e8d17e2267d672c552cfe0d91`.
- `starknet_getClassHashAt(latest, pool)` returned `0x56ab118a8a6e38efc93ad758cefe909fee421fa931ce3cf72df624d345623b2`.

This proves the configured network and pool contract existed at the observed block. It does not prove CipherBid bid ingress or reveal.

## Implemented client boundary

The browser client:

1. discovers Starknet wallets with get-starknet and disables EIP-1193 adapters;
2. creates `WalletAccountV6` through the selected wallet;
3. requires Wallet API `>= 0.10.3` without probing shielded balances;
4. requires `SN_SEPOLIA`;
5. narrows global application state to public connection data;
6. may hold app-specific bidder/seller credentials only inside a future bounded active-memory session and verified encrypted recovery operation;
7. has not yet mounted the reviewed `strk20PrepareInvoke` / `strk20InvokeTransaction` orchestrator into the product UI.

The canonical-cap reader and exact action builders are isolated, unit-tested primitives for the approved direct Wallet API boundary. They are not yet mounted into the product UI. The app never requests or stores a viewing key, wallet key, private note, proof, or wallet session material.

## Public/private observation matrix

| Observation                       | Bid ingress                                                                                      | Reveal                                    |
| --------------------------------- | ------------------------------------------------------------------------------------------------ | ----------------------------------------- |
| Auction helper address            | Public                                                                                           | Public                                    |
| Uniform collateral cap            | Public contract configuration returned by `get_cap`; identical for every bidder using that spike | No value movement                         |
| Actual bid amount                 | Absent from ingress actions; Poseidon-sealed                                                     | Public in reveal calldata                 |
| Bidder-controlled account address | Absent from helper calldata/storage shape                                                        | Absent from helper calldata/storage shape |
| Relayed transaction sender        | Not yet observed live                                                                            | Not yet observed live                     |
| Viewing key                       | Never requested or received by the app                                                           | Never requested or received by the app    |
| Transaction receipt/events        | Not available: no signed write                                                                   | Not available: no signed write            |

## Local executable evidence

- Wallet/action/component tests cover exact Wallet API actions, placeholder preservation, capability detection, public-only state, and controlled errors.
- Cairo tests prove only the configured pool can call the local `privacy_invoke` spike, the non-zero canonical cap is publicly readable, and bid ingress returns an empty open-note span. Cross-layer lifecycle fixtures now freeze reveal as a standard wallet call and bidder claims as STRK20 open-note flows; production claim behavior remains unimplemented.
- TypeScript and Cairo share frozen Poseidon vectors for claim handles and bid commitments.

## Remaining human/network gate

The current `AuctionIngressSpike` is local-only and must not receive funds. To convert this record from blocked to passed safely:

1. finish and independently review the commitment, configuration, lifecycle, claim, and recovery contracts/fixtures;
2. replace the local spike with the reviewed auction house implementing ERC-721 custody, exact balance-delta accounting, and bidder/seller claims;
3. implement memory-only bidder/seller credential sessions and mandatory encrypted recovery round trips;
4. implement the Wallet API prepare/submit orchestrator with receipt and state readback;
5. deploy the reviewed artifact and a synthetic ERC-721 on Sepolia after explicit test-budget approval;
6. use two distinct supported privacy-wallet sessions for equal-cap bid ingress;
7. submit direct reveals and permissionless settlement through connected wallets;
8. execute loser, winner-surplus, and seller-proceeds STRK20 claims, then confirm final NFT ownership and zero unexpected collateral;
9. record exact hashes, finality, events, observed public fields, and absence of wallet private material or persistent credential plaintext.

Until those steps are executed and read back, CipherBid must not claim live Sepolia STRK20 feasibility.
