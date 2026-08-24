# Stack

- Node.js 24
- pnpm 10 (invoked through pinned `npx pnpm@...` on this Windows Git-Bash host)
- Next.js 16.3.2, React 19.2.8, strict TypeScript 5.9.3, Tailwind CSS 4.3.3
- starknet.js 10.4.0 and Wallet API types 0.10.3
- Cairo, Scarb 2.20.1, Starknet Foundry 0.63.0
- OpenZeppelin Contracts for Cairo 3.0.0
- Vitest, Testing Library, Playwright
- GitHub Actions and Vercel

The original starter pin (Next.js 16.0.8 / React 19.2.1) was rejected after a fresh production audit identified known RSC and later Next.js advisories. Pin dependencies and commit lockfiles. Re-verify STRK20 package, wallet, pool, and provider compatibility before every deployment.
