# CipherBid Agent Rules

Build a secure, evidence-backed STRK20-funded Vickrey auction house for escrowed Starknet ERC-721 assets.

## Invariants

- Use one canonical checkout and one writer. No worktrees, duplicate repositories, stashes, resets, or cleans.
- Behavioral changes follow strict RED -> GREEN -> REFACTOR.
- Use CodeGraph before investigation/edits and after source path changes. Never commit `.codegraph/`.
- Preserve the approved privacy language: equal public cap collateral; actual bid sealed until reveal; no claim that a variable note amount remains encrypted after leaving the pool.
- Wallet private keys, viewing keys, private notes, and session material never enter the app. For the approved sprint Wallet API demo, bid/claim credentials may exist only in active browser memory and a mandatory password-encrypted downloaded recovery bundle; plaintext is never persisted, exported, logged, or sent to a server.
- `privacy_invoke` accepts only the configured STRK20 pool and accounts for collateral from observed balance delta.
- Mainnet writes require fresh human approval with exact budget, addresses, and expected state.
- `strk20.json` contains only real read-back-verified successful mainnet hashes/addresses.
- Never copy Crafts source, assets, branding, or copy. Reuse only high-level UX lessons.

## Branches

Features target `development`; promotion is `development -> staging -> main` through review. Do not push directly to environment branches after bootstrap.

## Required gates

- Web: format check, lint, strict TypeScript, unit/integration tests, Playwright, production build.
- Cairo: `scarb fmt --check`, `scarb build`, `snforge test` in WSL `Ubuntu-24.04`.
- Security: dependency, secret, static analysis, value-conservation invariants, independent contract review.
