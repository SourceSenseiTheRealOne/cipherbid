# Security

- Bind commitments to chain ID, deployment, auction ID, amount, memory-only bid nonce, claim handle, and NFT recipient.
- Require the commitment-bound claim secret for one-time claims; reject wrong, missing, replayed, or cross-auction claim credentials.
- Require the configured STRK20 pool as `privacy_invoke` caller.
- Account for incoming collateral by verified token balance delta.
- Use checks-effects-interactions and reentrancy guards around token/NFT callbacks.
- Bound bidder count and settlement work.
- Prove value conservation for every lifecycle branch.
- Parse decimal strings into integer base units; never serialize floating point.
- Wallet private keys, viewing keys, private notes, and session material stay inside the connected wallet. Bid amount, nonce, and claim secret may exist only in browser memory for the active interaction and inside a mandatory password-encrypted downloaded recovery bundle; never write plaintext to browser storage, Git, logs, analytics, URLs, clipboard, or a server.
- Require explicit target/cap/commitment confirmation, a `strk20PrepareInvoke` preflight, bounded receipt polling, and chain readback before UI success. Treat dapp-built action substitution before a wallet prompt as a disclosed residual risk.
- Use synthetic low-value assets and explicit budget approval for mainnet.
