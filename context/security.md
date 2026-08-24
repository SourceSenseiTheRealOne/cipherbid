# Security

- Bind commitments to chain ID, deployment, auction ID, amount, vault-held bid nonce, claim handle, and NFT recipient.
- Authorize claims with an offline vault-held Stark-curve claim key and an onchain public key/handle; bind every claim signature to the exact chain, deployment, auction, commitment, action, recipient, and replay-protected nonce.
- Require the configured STRK20 pool as `privacy_invoke` caller.
- Account for incoming collateral by verified token balance delta.
- Use checks-effects-interactions and reentrancy guards around token/NFT callbacks.
- Bound bidder count and settlement work.
- Prove value conservation for every lifecycle branch.
- Parse decimal strings into integer base units; never serialize floating point.
- Keep all keys and secrets outside the browser, Git, logs, analytics, URLs, clipboard-by-default flows, and server storage. Keep CipherBid Vault records in OS-protected local storage with an opt-in encrypted offline recovery export.
- CipherBid Vault owns a dedicated execution-account key, viewing key, and private notes; it must have explicit lifecycle fee reserve, offline-claim-bundle backup, compromise response, and no-rotation-with-open-obligations controls.
- Use synthetic low-value assets and explicit budget approval for mainnet.
