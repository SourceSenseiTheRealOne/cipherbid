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
- Bid commitment, claim public key/handle, revealed amounts, winner recipient, clearing price
- Deposits, withdrawals, open-note amounts, and app-side anonymizer activity
- Connected-wallet address for post-close direct reveal/claim activity, and its timing

For the sprint demo, the browser receives the bid amount, bid nonce, and claim secret only in memory in order to construct the commitment and an encrypted recovery bundle. It must never persist plaintext to browser storage, cookies, URLs, logs, analytics, crash reports, clipboard, Git, or a server. The wallet owns its viewing key and notes. STRK20's governance-appointed auditor escrow is protocol-level lawful disclosure, not an auction-scoped CipherBid feature. A connected wallet can be linkable through post-close direct reveal/claim activity and timing; this is not a claim of complete identity privacy.
