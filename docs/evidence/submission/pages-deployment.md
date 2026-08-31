# CipherBid GitHub Pages deployment evidence

Captured at `2026-08-29T18:45:51Z`. This record contains public repository, workflow, deployment, and browser-readback data only.

## Status

The durable no-login frontend is verified at:

- [`https://sourcesenseitherealone.github.io/cipherbid/`](https://sourcesenseitherealone.github.io/cipherbid/)

This initial deployment record proves the mainnet-configured application was publicly hosted at capture time. It does **not by itself** prove a CipherBid lifecycle. The later [`transaction ledger`](../mainnet/transactions.md) and [`auction lifecycle`](../mainnet/auction-lifecycle.md) independently establish those subsequent facts.

## Source and deployment identity

| Field               | Verified value                                                                                                                                    |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Repository          | [`SourceSenseiTheRealOne/cipherbid`](https://github.com/SourceSenseiTheRealOne/cipherbid)                                                         |
| Source branch       | `main`                                                                                                                                            |
| Deployed source SHA | [`253ce4498dd42b37272208c36081cd08c813c2f5`](https://github.com/SourceSenseiTheRealOne/cipherbid/commit/253ce4498dd42b37272208c36081cd08c813c2f5) |
| Source tree         | `9d51498d6223f3dcf5eea4f07778b7dd62c89093`                                                                                                        |
| Workflow run        | [`33268928887`, attempt 2](https://github.com/SourceSenseiTheRealOne/cipherbid/actions/runs/33268928887)                                          |
| Build job           | `success`                                                                                                                                         |
| Deploy job          | `success`                                                                                                                                         |
| Pages deployment    | `6158911658`                                                                                                                                      |
| Deployment status   | `success` at `2026-08-29T18:43:55Z`                                                                                                               |
| Deployment log      | [`99144097216`](https://github.com/SourceSenseiTheRealOne/cipherbid/actions/runs/33268928887/job/99144097216)                                     |

The first workflow attempt failed before installation because setup-node requested pnpm caching before Corepack provisioned pnpm. The reviewed three-file fix removed that invalid ordering, added an adversarial policy regression, and was promoted through `development → staging → main`. Attempt 2 completed every build and deployment step successfully.

## Pages settings readback

GitHub's Pages API returned:

| Field                      | Value                                                 |
| -------------------------- | ----------------------------------------------------- |
| URL                        | `https://sourcesenseitherealone.github.io/cipherbid/` |
| Build type                 | `workflow`                                            |
| HTTPS enforced             | `true`                                                |
| Public repository homepage | same verified Pages URL                               |

## Public route verification

A clean automated browser and independent HTTP reads verified:

| Route                      |  HTTP | Required rendered state                            | JS assets | Stylesheets | Horizontal overflow |
| -------------------------- | ----: | -------------------------------------------------- | --------: | ----------: | ------------------: |
| `/cipherbid/`              | `200` | `Private bids. Guaranteed onchain delivery.`       |       `7` |         `1` |                 `0` |
| `/cipherbid/create/`       | `200` | `Create a private-bid NFT auction`                 |      `11` |         `1` |                 `0` |
| `/cipherbid/demo/setup/`   | `200` | `Shield both demo bidders before the timer starts` |       `9` |         `1` |                 `0` |
| `/cipherbid/auction/?id=1` | `200` | honest `Live auction unavailable` state            |      `11` |         `1` |                 `0` |

At a true `390 × 844` browser viewport, `window.innerWidth` was `390`, horizontal overflow was `0`, and the product heading rendered successfully.

The auction route's unavailable state is expected: auction ID `1` has not been created. The browser loaded the static route, attempted its bounded public RPC verification, and rendered no invented auction value or enabled lifecycle claim.

## Privacy and publication boundary

The Pages bundle contains public network/deployment configuration only. Ready X remains responsible for private-note discovery, viewing keys, proof generation, signing, and submission. No signer, recovery payload, bid nonce, claim secret, private note, proof witness, wallet session, or generated runtime evidence is included.

The completed lifecycle verifies five qualifying pool-touching transactions, now represented in `strk20.json`. The video field remains empty until the updated recording passes public playback and duration checks.
