# CipherBid Official Hackathon Requirement Matrix

**Status:** Official-source and evidence-routing baseline

**Official-source snapshot verified:** 2026-08-27T10:12:47Z

**Submission deadline:** **August 31, 2026 at 23:59 UTC**.[4][5]

This document maps every official Private Sprint rule to a CipherBid implementation control and a concrete evidence destination. It is a control document, not deployment proof: a path marked **planned** must remain unpopulated until the corresponding public fact has been independently read back.

## Authority and interpretation

The sprint hub defines the public-repository application flow and the four judging weights.[1]

The official hackathon repository defines registration, eligibility, `strk20.json`, mainnet, demo, deadline, payout, and judging rules.[2][4]

The contribution guidance adds the operational checks for transaction existence, success, live-pool contact, project-contract events, public links, accurate privacy claims, secrets, and README coverage.[3][5]

Where this matrix is stricter than the official minimum, the row is labeled **CipherBid control**. In particular, CipherBid requires each applicable listed transaction to include a decoded auction-house event and an expected state-transition readback.

## Current gate snapshot

| Gate | Current evidence | Status |
| --- | --- | --- |
| Registration | [Application PR #178](https://github.com/starkience/strk20-hackathon/pull/178), applied upstream commit [`6895886`](https://github.com/starkience/strk20-hackathon/commit/6895886bd5e31e202306bcff1c2203e2f6369d08), and metadata correction [PR #218](https://github.com/starkience/strk20-hackathon/pull/218), applied as [`18259c8`](https://github.com/starkience/strk20-hackathon/commit/18259c8dfa0408e06226df51c64bc1a9dd75ff54). | Satisfied |
| Public hub entry | [Private Sprint hub](https://strk20.starknet.io/hackathon) renders `SourceSenseiTheRealOne / cipherbid`; the official project index records category `DeFi` and `inspired_by: RFP-08`. | Satisfied |
| Public repository | [SourceSenseiTheRealOne/cipherbid](https://github.com/SourceSenseiTheRealOne/cipherbid) is publicly reachable without authentication. | Satisfied |
| Open-source license | [`LICENSE`](../../LICENSE) is the MIT License and GitHub detects SPDX `MIT`. | Satisfied |
| Mainnet contracts, demo, video, and transactions | Root [`strk20.json`](../../strk20.json) intentionally contains empty values until real public evidence is verified. | Pending |

## Evidence destination catalog

| Evidence ID | Canonical destination | What may be recorded |
| --- | --- | --- |
| `E-REG` | Official registry row, PR #178, PR #218, applied upstream commits, and public hub row | Public registration facts only. |
| `E-REPO` | Public repository, [`LICENSE`](../../LICENSE), [`README.md`](../../README.md), [`THIRD_PARTY_NOTICES.md`](../../THIRD_PARTY_NOTICES.md) | Public/open-source identity, setup, architecture, privacy boundary, and attribution. |
| `E-DEPLOY` | Root [`strk20.json`](../../strk20.json) `contracts` plus planned reviewed summary `docs/evidence/mainnet/deployment.md` | Exact network, deployed address, class hash, constructor/config readback, source/artifact identity, and explorer URLs. No signer material. |
| `E-TX` | Root [`strk20.json`](../../strk20.json) `transactions` plus planned reviewed summary `docs/evidence/mainnet/transactions.md` | Hash, explorer URL, final receipt status, live pool contact, decoded CipherBid event, expected state delta, and verification time. No raw wallet/session dumps. |
| `E-LIFECYCLE` | [`docs/evidence/task-0-demo-matrix.md`](task-0-demo-matrix.md) plus planned reviewed summary `docs/evidence/mainnet/auction-lifecycle.md` | Seller creation/custody, two private ingresses, observer state, reveals, settlement, claims, NFT ownership, and value-conservation readbacks. |
| `E-DEMO` | Root [`strk20.json`](../../strk20.json) `demo_url`, GitHub Website field, and planned `docs/evidence/submission/link-checks.md` | Public URL, clean-browser result, HTTP/browser reachability, route checked, and verification time. |
| `E-VIDEO` | Root [`strk20.json`](../../strk20.json) `demo_video` and planned `docs/evidence/submission/link-checks.md` | Public three-minute video URL, duration check, clean-browser result, and verification time. |
| `E-DOCS` | [`README.md`](../../README.md), `context/`, contract/web setup instructions, threat model, limitations, and license | Judge-facing documentation that can be followed and built upon. |
| `E-GATES` | Planned reviewed summary `docs/evidence/release-gates.md` | Exact final commit, required test/lint/type/build/security gate results, secret-scan result, and `git diff --check`. No generated runtime payloads. |
| `E-PAYOUT` | Organizer communication record kept outside the public repository | One public payout address for the team. Never a seed phrase, private key, wallet export, or session. |

Planned evidence summaries are reviewed, secret-free indexes of public facts. Raw browser state, wallet state, recovery payloads, sessions, generated reports, and unredacted runtime captures are not evidence destinations and must not be committed.

## Official requirement-to-evidence matrix

| ID | Authority | Official requirement | CipherBid implementation/control | Evidence destination | Acceptance gate | Status |
| --- | --- | --- | --- | --- | --- | --- |
| `REG-01` | Official | Fork the hackathon repository, append one project object to `registry.json`, and open the application PR.[4][5] | CipherBid used the public fork and application PR #178. | `E-REG` | Upstream registry contains exactly one CipherBid row and the application check was successful. | Satisfied |
| `REG-02` | Official | The registration must provide a public GitHub `repo_url` with at least one commit.[4][5] | Registered URL is `https://github.com/SourceSenseiTheRealOne/cipherbid`. | `E-REG`, `E-REPO` | URL resolves publicly and the hub indexes the repository. | Satisfied |
| `REG-03` | Official | `telegram` must contain one bare username per team member, without `@` or `t.me`.[4][5] | Registration uses `sourcesensei`. | `E-REG` | Upstream row contains the exact bare handle. | Satisfied |
| `REG-04` | Official | The application is the only required PR; subsequent progress, stack, contracts, demo, and builders are read from the project repository on the hub refresh cycle.[1][4][5] | No progress or final-submission PR will be opened. PR #218 was a registration-metadata correction, not a progress submission. | `E-REG`, project repository history, hub row | Final evidence is published in CipherBid itself and appears after index refresh. | Control active |
| `REG-05` | Official | Registration can happen before deployment and remains open throughout the sprint.[4][5] | Registration was completed before deployment; empty mainnet fields remain truthful. | `E-REG`, root `strk20.json` | No deployment claim is needed for registration. | Satisfied |
| `ELIG-01` | Official | Individuals and teams, and both new and existing projects, are eligible.[4] | CipherBid is entered as an individual open-source project. | `E-REG`, repository contributor history | Registration identifies the builder and public project. | Satisfied |
| `ELIG-02` | Official | Ideas are non-exclusive; using or varying an RFP does not reserve it.[4] | CipherBid declares `inspired_by: RFP-08` without exclusivity claims. | `E-REG`, `README.md` | Hub metadata and product description stay accurate. | Satisfied |
| `REPO-01` | Official | The repository must be public, open-source, and licensed.[4][5] | CipherBid is public and carries the standard MIT License. | `E-REPO` | Unauthenticated repository fetch succeeds and GitHub detects SPDX `MIT`. | Satisfied |
| `REPO-02` | Official | The repository, demo, and every linked artifact must resolve for a visitor who is not logged in.[5] | All submission URLs receive clean-browser checks before closure. | `E-REPO`, `E-DEMO`, `E-VIDEO`, planned link-check summary | Each final URL opens without authentication or private-network access. | Pending final link checks |
| `SEC-01` | Official | Never commit real private keys; committed keys, addresses, and endpoints must use placeholders where they are not public evidence.[5] | `.gitignore`, local exclusions, secret scanning, wallet-memory boundaries, and human review prevent secret-bearing artifacts from entering Git. Public verified contract addresses/hashes are allowed evidence; signer material is never allowed. | `E-GATES`, repository history | Final secret scan reports no committed credential or private session material. | Control active |
| `ACCURACY-01` | Official | Product claims must accurately describe what is and is not private; overclaiming harms integration-depth scoring.[5] | Preserve equal public cap, sealed bid until reveal, public timing/count/helper/reveal/settlement/claim boundaries, and post-close linkability disclosures. | `README.md`, task-0 demo matrix, demo narration, `E-DOCS` | Security review and demo script contain no stronger privacy claim than implemented behavior. | Control active |
| `MAINNET-01` | Official | A winning product must actually run on Starknet mainnet against the live STRK20 pool for a real user.[1][4][5] | Deploy the reviewed auction house, run the browser-wallet two-bidder lifecycle, and read back every state transition against the official mainnet pool. | `E-DEPLOY`, `E-LIFECYCLE`, `E-TX`, `E-DEMO` | Exact final artifact/config identity and complete successful mainnet lifecycle are proven. | Pending |
| `SUB-01` | Official | The repository state at **August 31, 2026 at 23:59 UTC** is the submission; there is no second submission PR.[4][5] | Freeze and verify the exact final commit before the deadline, then let the hub index the repository. | `E-GATES`, repository commit URL, hub row | Final commit and all required public fields exist before the deadline. | Pending |
| `SUB-02` | Official | A live public demo that anyone can open is required to be scored.[4][5] | Publish the production demo without login and verify it in a clean browser. | `E-DEMO`, root `strk20.json` `demo_url` when explicit | Clean-browser route and public URL both succeed. | Pending |
| `SUB-03` | Official | A public three-minute demo video is required to be scored.[1][4][5] | Record the canonical seller/two-bidder/observer lifecycle and keep the published cut at no more than three minutes. | `E-VIDEO`, root `strk20.json` `demo_video` | URL is public, playable, and duration-verified. | Pending |
| `SUB-04` | Official | Root `strk20.json` must list at least three verified Starknet mainnet transaction hashes.[4][5] | Reserve the minimum slots for Bidder A ingress, Bidder B ingress, and at least one STRK20 claim; add hashes only after all transaction gates pass. | `E-TX`, root `strk20.json` | Array contains at least three unique, verified mainnet hashes. | Pending |
| `TX-01` | Official | Every listed hash must exist on Starknet mainnet.[4][5] | Query an independent RPC/explorer and bind the result to the exact hash/network. | `E-TX` | Mainnet receipt lookup returns the exact candidate hash. | Pending |
| `TX-02` | Official | Every listed transaction must have succeeded.[4][5] | Require final accepted/succeeded execution; timeout remains unconfirmed and revert is rejected. | `E-TX` | Final receipt is successful, not merely submitted or pending. | Pending |
| `TX-03` | Official | Every listed transaction must have touched the live STRK20 pool.[4][5] | Decode the trace/receipt and prove interaction with the official mainnet pool address. | `E-TX` | Exact configured live-pool address appears in the transaction execution path. | Pending |
| `TX-04` | Official | If project contracts are listed, each qualifying transaction must carry an event from one of those contracts; touching the pool only through someone else's contract is insufficient.[5] | List the deployed CipherBid auction house and decode its ABI-frozen event from every applicable candidate transaction. | `E-DEPLOY`, `E-TX` | Receipt includes a matching event whose emitter is the listed CipherBid auction-house address. | Pending |
| `TX-05` | CipherBid control | Applicable listed transactions must emit the lifecycle-specific CipherBid auction-house event and produce the expected state delta. | Both private ingresses must emit the accepted-bid event; the qualifying claim must emit its claim event. Exact event names/selectors are frozen with the final ABI rather than invented here. | `E-TX`, `E-LIFECYCLE` | Emitter, selector, decoded fields, auction ID, and post-state all agree with the expected transition. | Pending |
| `CONTRACT-01` | Official | `contracts` is optional, but listed deployed addresses are detected and shown with their network.[4][5] | Publish the verified CipherBid auction-house address after class/config/source identity readback. | `E-DEPLOY`, root `strk20.json` `contracts` | Address exists on mainnet and matches the reviewed artifact/configuration. | Pending |
| `DEMO-01` | Official | `demo_url` is optional only when the hub discovers the demo automatically; discovery preference is explicit `strk20.json`, GitHub Pages, repository Website, then latest successful deployment.[4][5] | Set the repository Website and also set `demo_url` for deterministic discovery before closure. | `E-DEMO` | Hub row links to the intended public production demo. | Pending |
| `PAYOUT-01` | Official | A winning team must provide one payout address.[4] | Designate one public payout address through organizer communication only after operator review. | `E-PAYOUT` | Exactly one address is supplied; no signing or recovery material is disclosed. | Pending organizer request |
| `DOC-01` | Official | README coverage should explain what the project does, why privacy is needed, how to run it locally, and the mainnet contract addresses.[5] | Expand the root README with architecture, exact STRK20 integration, browser-wallet flow, setup, deployment, demo, threat model, privacy boundary, and limitations. | `E-DOCS`, `E-DEPLOY` | A clean checkout can follow setup/build instructions and find verified mainnet addresses. | Pending final README |
| `LINK-01` | Official | Every public URL must be link-checked before submission.[5] | Validate repository, demo, video, explorer, contract, transaction, and documentation links from a clean unauthenticated browser/session. | `E-DEMO`, `E-VIDEO`, planned link-check summary | All required URLs return the intended public resource. | Pending |
| `INDEX-01` | Official | The hub automatically shows missing demo, video, and mainnet requirements.[4][5] | Treat hub requirements as a final independent readback, not as the source of transaction truth. | Public hub row plus `E-DEMO`, `E-VIDEO`, `E-TX` | Hub reports demo, video, and mainnet requirements satisfied after final refresh. | Pending |

## Scoring matrix

| Score ID | Weight | Official criterion | CipherBid scoring implementation | Evidence destination | Closure test |
| --- | ---: | --- | --- | --- | --- |
| `SCORE-STRK20` | **30%** | STRK20 integration depth: shielded balances, private transfers, anonymizer contracts, SDK use, and stealth-account techniques are named examples.[1][4] | Real equal-cap collateral enters through the live STRK20 pool and CipherBid `privacy_invoke`; claims return through the reviewed STRK20 route; wallet performs proof/submission while the app keeps wallet private material out of scope. | `E-TX`, `E-LIFECYCLE`, `E-DOCS`, cross-layer action/ABI tests | At least two bid ingresses and one claim prove live-pool use through the listed auction house. |
| `SCORE-MAINNET` | **30%** | Working mainnet product: it must run on mainnet for a real user.[1][4] | Public UI, supported wallets, deployed Cairo auction house, NFT custody, two bids, reveals, settlement, claims, and readback-confirmed outcomes. | `E-DEPLOY`, `E-LIFECYCLE`, `E-DEMO`, `E-TX` | Complete canonical lifecycle succeeds from clean browser sessions and on-chain state agrees. |
| `SCORE-INNOVATION` | **25%** | Innovation rewards something the ecosystem lacks or a better version of an existing idea.[1][4] | Equalized real collateral prevents pre-reveal variable-amount leakage while preserving funded Vickrey settlement and atomic ERC-721 delivery. | `README.md`, contract tests, demo narration, `E-LIFECYCLE` | Demo and implementation prove the differentiator without privacy overclaiming. |
| `SCORE-DOCS` | **15%** | Documentation/open-source quality covers a followable README, buildable code, and a license.[1][4][5] | MIT licensing, reproducible setup, architecture, STRK20 wire contract, threat model, limitations, verified addresses, and exact quality gates. | `E-REPO`, `E-DOCS`, `E-GATES` | Clean checkout builds/tests from documented commands and all links resolve. |

If another team depends on published CipherBid work, that may count in CipherBid's favour, but it is a scoring bonus rather than a submission prerequisite.[4]

## Minimum transaction acceptance matrix

| Slot | Intended transaction | Must touch live STRK20 pool | Required CipherBid event | Required readback | Destination | Status |
| --- | --- | --- | --- | --- | --- | --- |
| `TX-A` | Bidder A private equal-cap ingress | Yes | ABI-frozen accepted-bid event from the listed auction house | Receipt success, pool path, event decode, bid-count/commitment state | `E-TX`, `E-LIFECYCLE`, `strk20.json` | Pending |
| `TX-B` | Bidder B private equal-cap ingress | Yes | ABI-frozen accepted-bid event from the listed auction house | Receipt success, pool path, event decode, bid-count/commitment state | `E-TX`, `E-LIFECYCLE`, `strk20.json` | Pending |
| `TX-C` | At least one verified STRK20 claim | Yes | ABI-frozen claim event from the listed auction house | Receipt success, pool path, event decode, consumed-claim/accounting state | `E-TX`, `E-LIFECYCLE`, `strk20.json` | Pending |
| `TX-D+` | Additional refund, surplus, or seller claims | Yes when listed for STRK20 scoring | Matching ABI-frozen claim event | Receipt success and claim/value-conservation readback | `E-TX`, `E-LIFECYCLE`; optional `strk20.json` entries | Optional |

Reveal and settlement receipts remain mandatory lifecycle evidence even if they do not touch the pool and therefore are not used among the three qualifying `strk20.json` hashes.

## Evidence population rules

1. Never put a transaction hash into `strk20.json` merely because a wallet returned it.
2. For every candidate, verify exact mainnet network, hash existence, final success, live-pool contact, expected CipherBid event when applicable, and the expected state transition.
3. Treat receipt timeout as **unconfirmed**, not success and not failure.
4. Bind decoded events to the exact listed CipherBid contract address and final ABI/class identity.
5. Record public explorer/RPC facts in reviewed summaries; do not commit raw browser state, wallets, sessions, private notes, recovery payloads, credentials, or generated runtime evidence.
6. Keep `strk20.json` empty until evidence is real, public, independently read back, and safe to publish.
7. Re-run clean-browser URL checks and all closure gates against the exact final commit before the deadline.

## Final submission gate

CipherBid is submission-ready only when all rows below are true simultaneously:

- [x] Registered in the official registry and visible on the public hub.
- [x] Public repository and valid MIT open-source license.
- [ ] Public demo opens without login.
- [ ] Public demo video exists and is no more than three minutes.
- [ ] Root `strk20.json` contains at least three unique verified mainnet hashes.
- [ ] Every listed hash exists, succeeded, and touched the live STRK20 pool.
- [ ] Every applicable listed hash carries the expected event from the listed CipherBid auction house.
- [ ] Deployed contract/source/class/config identity is read back on mainnet.
- [ ] Canonical seller/two-bidder/observer lifecycle and value conservation are independently verified.
- [ ] README, setup, threat model, privacy limitations, demo, and mainnet addresses are complete.
- [ ] All public links and final quality/security gates pass on the exact final commit.
- [ ] The hub reports demo, video, and mainnet requirements satisfied after refresh.
- [ ] All required evidence is present before **August 31, 2026 at 23:59 UTC**.

## Program facts that are not implementation gates

The sprint runs from August 14 through August 31, 2026; winners are announced September 4. The published prize split is $2,500 for first, $1,500 for second, and $1,000 for third.[4]

## Sources

[1] https://strk20.starknet.io/hackathon — Private Sprint — STRK20
[2] https://github.com/starkience/strk20-hackathon — starkience/strk20-hackathon
[3] https://github.com/starkience/strk20-hackathon/blob/main/CONTRIBUTING.md — Private Sprint contribution guidance
[4] https://raw.githubusercontent.com/starkience/strk20-hackathon/main/README.md — Private Sprint README (raw)
[5] https://raw.githubusercontent.com/starkience/strk20-hackathon/main/CONTRIBUTING.md — Private Sprint contribution guidance (raw)
