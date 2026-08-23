# Deployment

Development begins with local contract tests and read-only/live-pool shape checks, then Sepolia lifecycle evidence. Mainnet declaration, deployment, funding, and transactions require a fresh human-approved manifest containing exact class hashes, constructor arguments, pool/token addresses, fee estimate, and maximum STRK budget.

Mainnet pool: `0x040337b1af3c663e86e333bab5a4b28da8d4652a15a69beee2b677776ffe812a`

Never record a transaction or contract in `strk20.json` until it is read back, successful, on the expected network, and tied to the expected state transition.
