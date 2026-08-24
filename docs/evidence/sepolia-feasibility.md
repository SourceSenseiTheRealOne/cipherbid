# Sepolia feasibility evidence

Status captured: 2026-08-24T00:04:27+01:00

## Result

The wallet connection, action-shape, canonical-cap, and contract feasibility boundaries are locally verified. A real STRK20 wallet preparation and transaction proof is **blocked**, not passed: Wallet API 0.10.3 does not expose an app-specific commitment-secret capability, while project policy forbids the application from receiving bid or claim secrets. The available in-app browser also has no Ready/privacy-capable Starknet wallet, and this checkout has no configured `sncast` Sepolia account or signing material. No transaction hash or receipt is recorded below because no Sepolia write occurred.

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
5. narrows application state to a public connected/not-connected signal and never exposes the WalletAccount to the page;
6. does not request, generate, store, or accept bid/claim secrets;
7. exposes neither `strk20PrepareInvoke` nor `strk20InvokeTransaction` in the product UI.

The canonical-cap reader and exact action builders are isolated, unit-tested primitives for the future approved custody boundary. They are not mounted into the product UI. The app never requests or stores a viewing key.

## Public/private observation matrix

| Observation | Bid ingress | Reveal |
| --- | --- | --- |
| Auction helper address | Public | Public |
| Uniform collateral cap | Public contract configuration returned by `get_cap`; identical for every bidder using that spike | No value movement |
| Actual bid amount | Absent from ingress actions; Poseidon-sealed | Public in reveal calldata |
| Bidder-controlled account address | Absent from helper calldata/storage shape | Absent from helper calldata/storage shape |
| Relayed transaction sender | Not yet observed live | Not yet observed live |
| Viewing key | Never requested or received by the app | Never requested or received by the app |
| Transaction receipt/events | Not available: no signed write | Not available: no signed write |

## Local executable evidence

- Wallet/action/component tests cover exact Wallet API actions, placeholder preservation, capability detection, public-only state, and controlled errors.
- Cairo tests prove only the configured pool can call `privacy_invoke`, the non-zero canonical cap is publicly readable, bid ingress returns an empty open-note span, and invoke-only reveal returns no value.
- TypeScript and Cairo share frozen Poseidon vectors for claim handles and bid commitments.

## Remaining human/network gate

The current `AuctionIngressSpike` is local-only and must not receive funds. To convert this record from blocked to passed safely:

1. obtain a reviewed wallet capability or separately approved isolated custody boundary that creates commitments without exposing bid/claim secrets to the application;
2. replace the local spike with the reviewed auction contract that implements authenticated bidder/seller claims and exact balance-delta accounting;
3. open the local app in a browser with Ready installed and unlocked;
4. connect a funded Sepolia account supporting the required capability;
5. deploy the refundable contract with the pool above and one non-zero uniform cap;
6. ensure the wallet has matured shielded Sepolia STRK covering the public cap and pool fee;
7. prepare and submit bid ingress, wait for a successful receipt, and verify helper state/token balance;
8. prepare and submit invoke-only reveal, wait for a successful receipt, and verify helper state;
9. execute and verify the authenticated refund/claim path so no collateral remains stranded;
10. record exact hashes, finality, events, observed public fields, and absence of bidder/viewing-key data.

Until those steps are executed and read back, CipherBid must not claim live Sepolia STRK20 feasibility.
