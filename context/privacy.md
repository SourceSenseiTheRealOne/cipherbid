# Privacy

## Sealed bid data until reveal

- Actual committed bid amount
- Bid nonce

## Private pool data beyond reveal

- Note ownership/source linkage inside the pool

## Never exposed to the browser

- Offline claim private key
- Encrypted CipherBid Vault credential records and recovery plaintext

## Public

- Seller, NFT, reserve, cap, deadlines
- Bid count and timing
- Identical cap transferred from pool to auction helper
- Bid commitment, claim public key/handle, revealed amounts, winner recipient, clearing price
- Deposits, withdrawals, open-note amounts, and app-side anonymizer activity
- Dedicated vault execution-account address for private-pool ingress transaction submission, and timing for direct public reveal/claim activity

The browser application never handles a viewing key, sealed bid amount, bid nonce, offline claim private key, or claim-bundle plaintext. STRK20's governance-appointed auditor escrow is protocol-level lawful disclosure, not an auction-scoped application feature. A dedicated vault execution account may expose a stable public address through Privacy SDK ingress submission and direct public reveal/claim calls, and can correlate its own activity; public initial funding and timing can also link a main wallet to that profile. This is not a claim of complete identity privacy.
