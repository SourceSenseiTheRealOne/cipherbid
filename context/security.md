# Security

- Bind commitments to chain ID, deployment, auction ID, amount, bid secret, claim handle, and NFT recipient.
- Separate reveal and claim secrets.
- Require the configured STRK20 pool as `privacy_invoke` caller.
- Account for incoming collateral by verified token balance delta.
- Use checks-effects-interactions and reentrancy guards around token/NFT callbacks.
- Bound bidder count and settlement work.
- Prove value conservation for every lifecycle branch.
- Parse decimal strings into integer base units; never serialize floating point.
- Keep all keys and secrets outside Git, logs, analytics, URLs, and server storage.
- Use synthetic low-value assets and explicit budget approval for mainnet.
