# CipherBid GitHub Pages mainnet frontend design

**Status:** Approved direction; implementation awaits written-spec review
**Primary host:** GitHub Pages
**Fallback:** Vercel only after a concrete Pages build, deployment, public-RPC, or wallet-runtime blocker is verified

## Goal

Publish a durable, public, no-login CipherBid frontend from the existing repository. The deployed app must use the verified Starknet mainnet AuctionHouse and STRK20 configuration, render live auction state from public RPC reads, and continue handing proving, note discovery, signing, and submission to Ready X.

The durable public auction URL becomes:

```text
https://sourcesenseitherealone.github.io/cipherbid/auction?id=<positive-u64>
```

This replaces the server-only `/auctions/[auctionId]` route for the public application.

## Why GitHub Pages

GitHub is already authenticated, the repository is public, and Pages can provide a durable no-login URL without introducing hosting credentials. The current auction route is forced dynamic and performs its RPC read on the Next.js server, so it cannot be exported unchanged. A static auction shell with browser-side public RPC reads removes that server requirement without moving any secret into the browser.

Vercel remains a fallback, not a parallel deployment. Switch only after recording a reproducible Pages blocker. A Vercel fallback requires user authentication and must be independently deployed and read back before publication.

## Architecture

### Static deployment configuration

`web/next.config.ts` will support a Pages build through explicit environment configuration:

- `output: 'export'` for the Pages production build;
- `basePath: '/cipherbid'` for the repository-scoped URL;
- `trailingSlash: true` for static directory routing;
- no server actions, API routes, middleware, image optimizer, or runtime secret dependency.

Local development and Playwright retain an empty base path. The base path is compile-time configuration, not user input.

All internal links use Next `Link` or one shared route helper so `/cipherbid` is applied exactly once. Historical evidence containing old localhost `/auctions/<id>` URLs remains unchanged and explicitly historical.

### Static auction route

Create one exportable route:

```text
/auction?id=<auctionId>
```

The route renders a client loader inside a Suspense boundary. The loader:

1. reads exactly one `id` query value;
2. percent-decodes and validates it as a positive decimal `u64`;
3. loads a build-time public deployment manifest through direct `NEXT_PUBLIC_*` property references;
4. creates a browser `RpcProvider` for the configured public RPC URL;
5. calls the existing `readAuctionSnapshot` validation path;
6. converts the verified snapshot into the existing `AuctionLiveViewModel`;
7. renders `AuctionLivePage` only after successful class, pool, token, auction, bid, and NFT-owner readback.

Invalid IDs, duplicate query values, malformed configuration, CORS/RPC failures, class mismatches, missing auctions, and read failures render a bounded honest error state with no fabricated values. The query value is rendered only as React text and is capped before display.

The loader owns a visible loading state and a manual retry action. It does not poll private state. After a wallet transaction, users can retry the public read or reload the route; transaction success remains receipt-and-readback based inside the existing action flow.

### Route migration

The forced-dynamic `web/src/app/auctions/[auctionId]/page.tsx` cannot coexist with a generic static export and will be removed after its pure logic is extracted:

- auction-ID parsing moves to a small tested route module;
- snapshot-to-view-model conversion moves to a pure tested module;
- the home “Open auction” link changes to `/auction?id=<encoded-id>`;
- current route and hostile-input browser tests move to the static query route;
- generated mainnet auction evidence uses the new route shape where it emits a user-facing URL.

No compatibility redirect is claimed for arbitrary `/auctions/<id>` paths because GitHub Pages cannot return an application-owned HTTP 200 for unknown dynamic paths. Public documentation and new evidence use only the canonical query route.

## Public deployment manifest

The Pages workflow builds with these public values:

- network: Starknet mainnet;
- public RPC URL: the existing public mainnet endpoint;
- verified AuctionHouse address and class hash;
- canonical mainnet STRK20 pool;
- canonical STRK token;
- base path `/cipherbid`.

These values are public deployment identity, not secrets. The workflow must not receive signer material, Ready X state, recovery material, dotenv files, repository secrets, or generated runtime evidence.

The client manifest adapter must use direct references such as `process.env.NEXT_PUBLIC_CIPHERBID_NETWORK`. Passing or enumerating the whole browser `process.env` object is forbidden because Next.js only guarantees compile-time replacement for statically referenced public variables.

## GitHub Actions deployment

Add one public Pages workflow that:

- runs on pushes to `main` and explicit manual dispatch;
- sets default `GITHUB_TOKEN` permission to `contents: read`;
- grants `pages: write` and `id-token: write` only to the deploy job;
- uses a Pages concurrency group to prevent overlapping deployments;
- checks out without persisted credentials;
- installs the repository-pinned pnpm version and dependencies with a frozen lockfile;
- runs the repository-approved Web verification required for the changed static boundary;
- builds the static export with explicit public mainnet environment values;
- uploads only `web/out` as the Pages artifact;
- deploys through the GitHub Pages environment.

Every external action is pinned to a verified lowercase 40-character commit SHA with its release label in a comment. `pull_request_target`, secret expressions, mutable action tags, dotenv loading, arbitrary shell downloads, and credential-bearing build steps are forbidden.

A repository-owned workflow guard is written first and demonstrated RED against the missing workflow. It validates triggers, permissions, checkout credential persistence, exact approved action pins, public environment allowlist, build directory, artifact directory, and forbidden constructs. Negative fixtures cover mutable tags, `pull_request_target`, secret-expression variants, duplicate unapproved action references, and dotenv use.

Pages repository settings are changed only after the workflow is merged to the permitted environment branch flow. The effect is verified through the Pages API and a public no-login readback.

## Wallet and privacy boundary

The host migration does not change custody:

| Datum or operation                | Owner after migration                                                              |
| --------------------------------- | ---------------------------------------------------------------------------------- |
| Wallet signing key and session    | Ready X                                                                            |
| Viewing key and private notes     | Ready X                                                                            |
| Note discovery and selection      | Ready X                                                                            |
| Proof construction and submission | Ready X                                                                            |
| Bid nonce and claim secret        | Browser memory during the active operation plus password-encrypted recovery export |
| Public deployment configuration   | Static bundle                                                                      |
| Auction/NFT/bid/settlement reads  | Browser through public RPC                                                         |

No shielded-balance probe is introduced. The dapp detects Wallet API capability by supported-version query and requests only the existing action flows. Deposits, withdrawals, open-note amounts, direct reveal/claim activity, and timing remain publicly observable as already documented.

## Error handling

- Invalid or duplicate `id`: fail before RPC construction.
- Missing or invalid build manifest: render “deployment unavailable”; no wallet controls.
- RPC/CORS/timeout: render a public-read failure with Retry; do not infer auction state.
- Class/config/NFT mismatch: preserve the existing fail-closed reader result and suppress transaction controls.
- Wallet absent or locked: preserve the current install/unlock guidance.
- Wallet submission timeout: preserve the transaction hash and bounded receipt polling behavior; never call it failed solely because an RPC has not indexed it yet.
- Pages deployment failure: do not set `demo_url`, repository homepage, or submission evidence.

## TDD slices

1. **Static route contract:** RED tests require `/auction?id=7`, strict positive-u64 parsing, duplicate rejection, inert hostile input, and home-link generation.
2. **Client manifest adapter:** RED tests require direct public-key mapping, canonical mainnet validation, and no secret-bearing environment keys.
3. **Browser snapshot loader:** RED component tests cover loading, verified success, retry, invalid ID, deployment failure, RPC failure, and stale-request rejection.
4. **Static export:** RED configuration test requires export mode, compile-time base path, and trailing-slash routing without changing local Playwright defaults.
5. **Pages workflow policy:** RED guard fails while the workflow is missing; adversarial fixtures prove each forbidden CI class is rejected.
6. **Runtime:** build the export, serve `web/out` under `/cipherbid`, and verify root, create, setup, valid auction, invalid auction, mobile width, overflow, keyboard order, reduced motion, and no console/page errors.
7. **Public deployment:** merge through `development → staging → main`, enable Pages workflow mode, wait for hosted success, then verify the exact public routes and live mainnet read in a clean browser.

## Acceptance criteria

1. `pnpm build` produces `web/out` with no dynamic-server dependency.
2. The canonical public URL is `https://sourcesenseitherealone.github.io/cipherbid/` and opens without authentication.
3. `/cipherbid/create/`, `/cipherbid/demo/setup/`, and `/cipherbid/auction/?id=<real-id>` return the intended application through Pages.
4. The auction route validates and renders the real mainnet snapshot in the browser; it never renders invented chain values.
5. A hostile or invalid query remains inert and never triggers an RPC read or wallet control.
6. Ready X remains the only holder of wallet keys, viewing keys, private notes, proof witnesses, and submission authority.
7. The workflow policy guard and its adversarial fixtures pass; all external actions use verified immutable pins.
8. Hosted workflow status, Pages API state, public HTTP response, browser runtime, and repository homepage are independently read back before any deployment claim.
9. `strk20.json.demo_url` is populated only after the public route and real lifecycle page are verified. Transactions and video remain empty until their separate evidence gates pass.

## Out of scope

- Backend or serverless APIs;
- proxying the Starknet RPC;
- storing Ready X or recovery state;
- fabricating an auction before p9-4;
- claiming the temporary Cloudflare tunnel as durable hosting;
- recording or publishing the demo video before the complete lifecycle;
- automatic fallback to Vercel without a verified Pages blocker and user-visible authentication step.
