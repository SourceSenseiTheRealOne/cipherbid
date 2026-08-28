# Privacy

## Sealed bid data until reveal

- Actual committed bid amount
- Bid nonce

## Private pool data beyond reveal

- Note ownership/source linkage inside the pool

## Never exposed to the application

- Wallet private key, seed phrase, viewing key, session material, or private notes
- Recovery-bundle password or its decrypted payload outside the active import/export operation

## Public

- Seller, NFT, reserve, cap, deadlines
- Bid count and timing
- Identical cap transferred from pool to auction helper
- Bid commitment, claim handles, revealed amounts, winner recipient, clearing price
- Deposits, withdrawals, open-note amounts, and app-side anonymizer activity
- Connected-wallet address for seller creation and direct reveal activity, and its timing

For the sprint demo, the browser receives bidder and seller app-specific credentials only in memory in order to construct commitments/actions and encrypted recovery bundles. It must never persist plaintext to browser storage, cookies, URLs, logs, analytics, crash reports, clipboard, Git, or a server. The wallet owns its viewing key, notes, proof generation, signing, and submission. STRK20's governance-appointed auditor escrow is protocol-level lawful disclosure, not an auction-scoped CipherBid feature. Seller creation and direct reveal can link to the connected account; STRK20 claims still expose timing and output amounts. CipherBid does not claim complete identity privacy.
