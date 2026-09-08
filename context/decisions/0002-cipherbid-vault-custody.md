# Decision 0002: Use a direct Wallet API route for the sprint demo

**Status:** Accepted sprint authority; supersedes the local-vault MVP decision

## Decision

For the sprint demo, CipherBid uses the selected STRK20 starter-kit Wallet API integration in the browser: get-starknet v6 discovery, `WalletAccountV6.connect`, Wallet API capability detection at `>= 0.10.3`, `strk20PrepareInvoke`, `strk20InvokeTransaction`, bounded receipt polling, and readback-confirmed state transitions.

The privacy-capable wallet remains the sole owner of its wallet private key, viewing key, notes, proving, signing, and transaction submission. The CipherBid UI collects a bid amount, generates app-specific bidder and seller claim credentials in memory, builds the reviewed auction actions, and asks the connected wallet to sign/submit them. Reveal and every monetary claim use the matching in-memory credential or a user-imported encrypted recovery bundle.

The UI must require a password-protected encrypted recovery download and successful local import verification before bidder submission and before seller auction creation. It may hold bid amount, bid nonce, bidder claim secret, or seller claim secret only for the active interaction; it must never persist plaintext to browser storage, cookies, URLs, logs, analytics, crash reports, clipboard, Git, or any server.

## Rationale and accepted tradeoff

Demo-day requirements require a bidder to connect a supported wallet and place the bid from the CipherBid UI. The Wallet API keeps wallet keys, viewing keys, notes, proving, and submission in the wallet while providing the STRK20 integration route already extracted from the starter kit.

The browser must necessarily receive the user-entered bid amount and app-specific bid/claim credentials long enough to construct the commitment and recovery bundle. This is a deliberate, documented relaxation of the former hard browser boundary. A compromised browser can alter a dapp-built action before the wallet prompt; CipherBid mitigates but cannot eliminate that risk with independent UI summaries, exact target/cap/commitment checks, explicit wallet confirmation, no plaintext persistence, required recovery export, and contract-side validation.

## Consequences

- Bid creation and seller auction creation are enabled only after successful wallet/network checks and the required encrypted recovery export/import round trip.
- The auction protocol uses `claim_handle = Poseidon("CIPHERBID_CLAIM_V1", claim_secret)` and requires the matching one-time secret for bidder and seller monetary claims.
- The app never asks for, receives, persists, or exports a wallet private key, seed phrase, viewing key, private note, or wallet session material.
- No localhost daemon, browser extension bridge, native-messaging integration, cloud backup, server credential storage, telemetry of private payloads, or automatic clipboard export is allowed.
- Seller creation and direct reveal activity link to the connected wallet account and must be disclosed. Bid ingress and monetary claims rely on STRK20 relayed submission, while timing and public amounts remain observable.
- A separate local-vault route remains a post-sprint hardening option; it is not a second sensitive transaction path in this sprint.

## Required proof before mainnet

1. Supported-wallet discovery and `WalletAccountV6` connection work in a clean browser.
2. Capability detection uses `supportedWalletApi()` and never probes private balances merely to feature-detect.
3. Every STRK20 path constructs the exact reviewed action sequence, preserves literal protocol placeholders, prepares before submit, and distinguishes rejected/submitted/confirmed/reverted/timeout states.
4. Tests prove no plaintext bid/claim credential enters persistent browser storage, logs, analytics, URLs, errors, or public receipts.
5. A real Sepolia then mainnet two-bidder lifecycle—including NFT custody and all monetary claims—is read back from chain before public claims are made.
