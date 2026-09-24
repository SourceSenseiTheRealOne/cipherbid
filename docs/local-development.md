# Local development

Run commands from the repository root unless a different directory is shown. The public demo uses Starknet mainnet; opening its read-only page does not require a wallet or a private key.

## Dependency advisory caveat

The September 24, 2026 production dependency audit reports two critical Next.js advisories and one high sharp advisory in the unchanged lockfile (`next@16.3.2`, `sharp@0.35.3`):

- [Windows-hosted Next.js server RCE](https://github.com/advisories/GHSA-p293-qw3h-jr36).
- [Next.js AVIF image-optimization RCE](https://github.com/advisories/GHSA-2xp9-vwfh-vxw4).
- [sharp/libheif image-decoding vulnerabilities](https://github.com/advisories/GHSA-rgj7-g3m4-5g8c).

The public deployment is a static GitHub Pages export, not a Next.js server or image-optimization API. That removes those server endpoints from the hosted architecture; it does not make the dependency audit clean. Do not expose a local Next.js server to the network or process untrusted images with this toolchain. Loopback binding below limits exposure but is not a vulnerability fix.

The advisories identify Next.js `16.3.3` and sharp `0.35.4` as patched minimums. Upgrade and rerun the full gates in a separate dependency-maintenance change before server deployment; this presentation refresh deliberately preserves package and lockfile identities.

## Toolchain

The web package pins pnpm `10.18.1` and expects Node.js 24. CI pins Node.js `24.13.1`. Contract CI pins Scarb `2.20.1`, Starknet Foundry `0.63.0` and Universal Sierra Compiler `2.10.0`; package locks remain committed.

On Windows, use WSL distro **Ubuntu** for Cairo. Install the pinned tools in that distro and ensure `scarb` and `snforge` are on its PATH before running contract checks. The [CI workflow](../.github/workflows/ci.yml) records the pinned setup and Foundry archive checksum. A Windows Node dependency tree should not be reused as a Linux dependency tree.

## Install and configure public reads

```bash
npx --yes pnpm@10.18.1 --dir web install --frozen-lockfile
cd web
npx --yes pnpm@10.18.1 exec tsx scripts/configure-mainnet-env.ts \
  --deployment-record ../docs/evidence/mainnet/deployment.json --write
npx --yes pnpm@10.18.1 exec next dev --webpack --hostname 127.0.0.1 -p 4110
```

The configuration helper writes public addresses, class hash, network and RPC settings. It refuses to overwrite an existing `.env.local`; do not delete an existing configuration to bypass that check. Never add wallet keys or recovery secrets to it.

Open `http://127.0.0.1:4110/auction?id=1788040057342` for the published mainnet auction. The homepage has a separate arbitrary-auction reader, while its `Open live auction` shortcut opens the canonical public mainnet URL. `/create` and `/demo/setup` contain wallet write flows; do not submit them merely to inspect the project.

## Web checks

From the repository root:

```bash
npx --yes pnpm@10.18.1 --dir web format:check
npx --yes pnpm@10.18.1 --dir web lint
npx --yes pnpm@10.18.1 --dir web typecheck
npx --yes pnpm@10.18.1 --dir web test
npx --yes pnpm@10.18.1 --dir web exec playwright install chromium
npx --yes pnpm@10.18.1 --dir web test:e2e
npx --yes pnpm@10.18.1 --dir web ci:verify
npx --yes pnpm@10.18.1 --dir web pages:verify
npx --yes pnpm@10.18.1 --dir web build
CIPHERBID_PAGES_BUILD=1 npx --yes pnpm@10.18.1 --dir web build
```

The last command uses POSIX shell environment syntax, available in Bash, Git Bash and WSL. The Pages build requires the public configuration above. It exports under `/cipherbid` and must be served with that base path. The E2E configuration owns loopback port `4173`, uses its explicit Sepolia test configuration and refuses to reuse an existing server. Stop only a server you own before running it. Browser fixtures do not establish fresh mainnet transaction success.

## Contract checks

Inside the Linux/WSL checkout, from the repository root:

```bash
cd contracts
scarb fmt --check
scarb build
snforge test
```

These are local contract gates, not deployment or mainnet execution. Do not change compiler versions to make a presentation-only update pass: source/class identity matters for the existing deployment.

## Transaction operations

The deployment and auction-creation tools are separate from public inspection. Their default plan-only mode does not authorize execution. Mainnet writes require fresh human approval of the network, addresses, spend ceiling and expected state before any `--execute` command.

Ready X was the wallet used for the published lifecycle. Check current wallet capabilities before attempting a new one; public registration or deposit history does not prove a wallet's spendable private balance. Keep signer state and encrypted recovery files outside the repository, and never paste their contents into logs or issues.

See [the deployment record](evidence/mainnet/deployment.md), [the historical lifecycle](evidence/mainnet/auction-lifecycle.md) and [the evidence index](evidence/README.md). They preserve what was exercised, not an instruction to replay it.
