# CipherBid Task 1.1 — Official Wallet API Route Verification

**Status:** Verified route baseline

**Verified:** 2026-08-27T10:30:59Z

**Decision:** Use the direct Starknet Wallet API route through `WalletAccountV6`; keep Wallet API `>= 0.10.3` as the runtime minimum.

## Decision summary

- **Route:** CipherBid remains a user-facing dapp on top of a privacy-enabled wallet. The wallet owns viewing keys, note discovery, proving, signing, and submission; CipherBid describes actions and reads public chain state.[1][2]
- **Wallets:** Current Starknet.js documentation says Ready and Xverse support the STRK20 Wallet API as of August 2026.[3] Starknet's launch documentation independently confirms Ready and Xverse wallet privacy flows, including shielding and private swaps.[4]
- **Runtime authority:** A wallet name is never treated as capability proof. CipherBid must query `walletV6.supportedWalletApi(wallet)` and require at least one stable Wallet API version `>= 0.10.3` before enabling STRK20 actions.[5][15]
- **Least privilege:** Capability detection must not call `strk20Balances`; that is a private-balance data request, not a feature query.[6]
- **Exact CipherBid package set:** `starknet@10.4.0`, `@starknet-io/get-starknet-discovery@6.0.2`, `@starknet-io/get-starknet-wallet-standard@6.0.2`, and `@starknet-io/types-js@0.10.3`.
- **Pools:** Mainnet `0x040337b1af3c663e86e333bab5a4b28da8d4652a15a69beee2b677776ffe812a`; Sepolia `0x0254a6b2997ef52e9f830ce1f543f6b29768295e8d17e2267d672c552cfe0d91`.[5][10]
- **Live fees:** On-chain `get_fee_amount()` readback returned **6 STRK on mainnet** and **2 STRK on Sepolia** during this verification. The fee is governance-controlled and must be read, never hardcoded.[8][16]
- **Maturity:** A newly created note may be discoverable immediately but is spendable only after **10 blocks**. CipherBid must expect shielded funds to mature before a later bid transaction.[9][11][12]

## 1. Ready and Xverse support

### Current source reconciliation

| Source | Statement | Freshness | Decision |
| --- | --- | --- | --- |
| Starknet.js WalletAccount guide | Ready and Xverse support the STRK20 Wallet API as of 2026-08.[3] | Current `next` documentation fetched during this task | Authoritative current dapp-facing status. |
| Starknet launch article | Ready and Xverse expose shielding, private swaps, private transfers, and unshielding; both mobile and desktop-extension support are described.[4] | Published 2026-06-09 | Confirms shipped wallet privacy flows. |
| STRK20 agent integration skill | Ready was tested; Xverse dapp-facing Wallet API was still in progress.[5][6] | Last reverified 2026-07-29; explicitly says re-check | Stale on Xverse compared with the newer Starknet.js guide. |

### Frozen wallet policy

1. Ready and Xverse are the supported candidate wallets.
2. Ready remains the primary manually tested baseline because the integration skill's executable checklist targets Ready.[5][6]
3. Xverse is no longer classified as “in progress” in this baseline because the newer Starknet.js guide explicitly marks it supported.[3]
4. Neither wallet is trusted by brand string. The exact connected wallet instance must advertise a stable API version meeting the runtime floor.
5. Other wallets remain disabled unless the same capability query proves support; no hardcoded Ready/Xverse allowlist replaces capability detection.
6. Real extension testing for both current wallet builds remains a later browser gate. This task verifies the official route and runtime contract, not a funded wallet transaction.

## 2. Exact package versions

### Approved CipherBid pins

| Package | Exact CipherBid pin | Verification basis | Decision |
| --- | --- | --- | --- |
| `starknet` | `10.4.0` | STRK20 and `WalletAccountV6` landed in 10.4.0.[1][14] The installed package resolves to 10.4.0. | Keep exact. |
| `@starknet-io/get-starknet-discovery` | `6.0.2` | Starknet.js documents get-starknet v6.0.2 as the minimum; the current official sprint starter kit pins 6.0.2.[3][7] | Keep exact. |
| `@starknet-io/get-starknet-wallet-standard` | `6.0.2` | Same v6.0.2 minimum and starter-kit tuple.[3][7] | Keep exact and aligned with discovery. |
| `@starknet-io/types-js` | `0.10.3` | Matches the stable Wallet API v0.10.3 surface and the starter kit.[7][13] | Keep exact. |
| `pnpm` | `10.18.1` | Repository package-manager pin. | Keep exact for reproducibility. |

The STRK20 integration skill tested get-starknet `6.0.3` with the same `starknet@10.4.0` and `types-js@0.10.3` tuple.[5][6]

Version `6.0.3` is therefore a supported upgrade option, but this verification does not introduce an unnecessary dependency change: the current CipherBid `6.0.2` pair is the documented minimum and exactly matches the current starter kit.[3][7]

If the get-starknet pair is upgraded later, discovery and wallet-standard must move together and the real Ready/Xverse connection suite must be repeated. Do not mix `6.0.2` and `6.0.3` or float either package independently.

### Registry status observed during verification

| Package/tag | Live registry value |
| --- | --- |
| `starknet` `latest` | `10.0.2` — lacks the STRK20 API described by the official docs.[1] |
| `starknet` `next` | `10.7.1` |
| get-starknet discovery `next` | `6.0.4` |
| get-starknet wallet-standard `next` | `6.0.5` |
| `@starknet-io/types-js` `latest` | `0.10.3` |
| `@starknet-io/types-js` `beta` | `0.10.4-beta.2` |

These moving tags are evidence for exact pins, not a reason to upgrade. The current development Wallet API specification advertises `0.10.4-rc.1`, while stable v0.10.3 and `types-js@0.10.3` remain the compatibility baseline.[13][15]

## 3. `WalletAccountV6` connection behavior

The current Starknet.js guide establishes the get-starknet v6 connection shape and states that the provider performs chain reads while the wallet signs and sends writes.[3]

The installed `starknet@10.4.0` runtime resolves `WalletAccountV6.connect(provider, wallet, cairoVersion?, paymaster?, silentMode = false)` as follows:

1. Run the Wallet Standard connection flow.
2. Read the connected account list.
3. Select the first account address.
4. Construct `WalletAccountV6` with the read provider, wallet provider, selected address, optional Cairo version, and optional paymaster.
5. Default to non-silent connection, so unlock/dapp-approval UI may be shown.

CipherBid's current adapter maps this behavior at:

- `web/src/features/wallet/browserWalletDependencies.ts:10-27` — `WalletAccountV6.connect`, `requestAccounts`, permissions, chain ID, and `supportedWalletApi` delegates;
- `web/src/features/wallet/walletConnection.ts:30-57` — explicit account/permission checks, normalized address, chain ID, capability versions, and result;
- `web/src/features/wallet/WalletConnectPanel.tsx:97-128` — network/API gates and session invalidation;
- `web/src/features/wallet/browserWalletDependencies.ts:30-35` — account, chain, or feature change subscription.

Connection acceptance contract:

- select a discovered get-starknet v6 wallet object;
- construct `WalletAccountV6` with the intended network provider;
- require a non-empty account and the `accounts` permission;
- read the wallet's current chain ID;
- query Wallet API capability separately;
- normalize the account address;
- rebuild/invalidate the connection when account, chain, or advertised features change.

`WalletAccountV6.connect` already obtains the active account through Wallet Standard. CipherBid currently performs an additional explicit `wallet_requestAccounts` read after connection. That is acceptable only if Ready and Xverse return the already-approved account without a second approval prompt; the later real-browser gate must verify one coherent connection UX. If either wallet re-prompts, remove the duplicate request and source the selected address from the connected `WalletAccountV6` instance.

## 4. `supportedWalletApi()` capability detection

The Wallet API specification defines `wallet_supportedWalletApi` as a no-parameter query that returns the latest supported Wallet API version and any compatible past versions. It must return versions while locked, unapproved, or connected, and it is distinct from `wallet_supportedSpecs`, which reports node JSON-RPC versions.[15]

The Starknet.js delegate is:

```text
walletV6.supportedWalletApi(wallet)
  -> wallet.features["starknet:walletApi"].request({
       type: "wallet_supportedWalletApi"
     })
```

CipherBid's runtime rule is:

```text
supported = returnedVersions.some(stableSemver >= 0.10.3)
```

The stable minimum remains **Wallet API `>= 0.10.3`**. The newer `0.10.4-rc.1` development specification is a release candidate, not a reason to raise the minimum or require prerelease strings.[13][15]

### Least-authority rule

Do not call `strk20Balances`, with an empty list or otherwise, to detect capability. `wallet_strk20Balances` requests the user's private pool balances and can produce user-consent UI; it is permitted only for a deliberate balance-display feature after the user asks for it.[2][6]

Current CipherBid evidence:

- `web/src/features/wallet/walletCapabilities.ts:1-22` compares stable semantic versions against `0.10.3` and fails closed on empty/malformed lists;
- `web/tests/unit/walletCapabilities.test.ts:4-15` covers equal/newer, older, empty, and malformed versions;
- `web/tests/unit/walletConnection.test.ts:18-53` proves the version query is used and no `strk20Balances` dependency exists;
- `web/tests/unit/browserWalletDependencies.test.ts:25-39` proves delegation to `WalletAccountV6` and `walletV6.supportedWalletApi`.

## 5. Official pool addresses and live readback

| Network | Official pool address | Official source | Live class hash | Live `get_fee_amount` | Block observed |
| --- | --- | --- | --- | ---: | ---: |
| Starknet mainnet | `0x040337b1af3c663e86e333bab5a4b28da8d4652a15a69beee2b677776ffe812a` | Canonical mainnet pool in the STRK20 integration links.[5] | `0x67dddd89d80fedadc06b6f160798f94800a4a70164e5a24301cd0d6076b554d` | `6000000000000000000` FRI = **6 STRK** | `13939853` |
| Starknet Sepolia | `0x0254a6b2997ef52e9f830ce1f543f6b29768295e8d17e2267d672c552cfe0d91` | Official by-example SDK page and Voyager link.[10] | `0x56ab118a8a6e38efc93ad758cefe909fee421fa931ce3cf72df624d345623b2` | `2000000000000000000` FRI = **2 STRK** | `14123649` |

Live mainnet reads were performed through Lava and the 6 STRK fee was independently reproduced through OnFinality. Sepolia was read through PublicNode. Both addresses returned a class hash, pool version, fee collector, and fee view; they are live contracts rather than documentation-only constants.

## 6. Live pool fee behavior

The pool contract defines the fee as a `u128` amount in FRI charged **once per `apply_actions` call**, not once per action in the action array. `apply_actions()` collects the fee before applying the atomic action batch; `0` disables the fee.[8][16]

When non-zero, the pool transfers STRK from the `apply_actions` caller to the configured fee collector with `transfer_from`. Governance can change both the amount and collector, and emits configuration events.[8][16]

CipherBid controls:

1. Read `get_fee_amount()` from the configured pool for the selected network; never hardcode 4, 6, 2, or another amount.
2. Treat one Wallet API private transaction/action batch as one pool-fee charge.
3. Show the current fee before preparation/submission and include it in budget/MAX calculations.
4. Refresh the fee immediately before a funded rehearsal or mainnet action manifest because governance can change it.
5. Keep pool fee separate from Starknet execution/gas sponsorship in UI language.
6. Fail closed if the fee view, pool identity, or network cannot be verified.

The June launch article's 4 STRK figure was historically correct but is now stale: current mainnet contract state returned 6 STRK.[4]

## 7. Note maturity

Official docs state that a note becomes visible to discovery once its transaction is accepted but is spendable only **10 blocks after creation**.[9] The current discovery implementation carries each note's creation block specifically so clients can enforce that 10-block rule, and the SDK changelog records the same behavior.[11][12]

Required behavior for CipherBid:

- A user who shields in one transaction cannot immediately spend that new private note in a later bid transaction.
- Treat the funds as **maturing** until the current accepted block is at least 10 blocks after the note's creation block.
- The wallet owns note discovery and selection on this route; CipherBid must not request viewing keys or inspect notes itself.[1]
- Do not repurpose `strk20Balances` as a maturity or capability probe.
- Prefer shielding ahead of the auction interaction and make the wait explicit.
- Same-transaction deposit-and-spend can avoid the maturity delay, but it correlates the public deposit with the private action and is not the default CipherBid privacy route.[6][10]
- If the wallet reports insufficient private balance immediately after shielding, surface a controlled “funds may still be maturing” state rather than blindly resubmitting.

## 8. Verification evidence

| Check | Evidence | Result |
| --- | --- | --- |
| Package availability | Live npm registry queries for exact versions and moving dist-tags | Passed |
| Installed package identity | `pnpm list --depth 0 --json` | Exact approved tuple installed |
| `WalletAccountV6.connect` behavior | Installed `starknet@10.4.0` runtime function inspection plus current Starknet.js guide | Confirmed |
| Capability query | Current Wallet API spec, installed Starknet.js delegate, local adapter tests | Confirmed |
| Minimum API | Stable release v0.10.3, current stable types, development spec comparison | Keep `>= 0.10.3` |
| No private-balance probe | Source inspection and unit test | Confirmed |
| Wallet capability tests | `pnpm test` | **12 files / 52 tests passed** |
| Pool identity | Official source addresses plus class-hash readback | Confirmed |
| Mainnet fee | Two live RPC providers | **6 STRK per `apply_actions`** |
| Sepolia fee | Live Sepolia RPC | **2 STRK per `apply_actions`** |
| Maturity | Official docs, SDK changelog, discovery source | **10 blocks** |

## Task 1.1 gate

- [x] Current Ready support verified.
- [x] Current Xverse support verified from newer official documentation; runtime and later real-wallet testing remain mandatory.
- [x] Exact CipherBid package tuple frozen.
- [x] `WalletAccountV6` connection behavior confirmed.
- [x] `supportedWalletApi()` capability semantics confirmed.
- [x] Wallet API minimum remains `>= 0.10.3`.
- [x] Balance probing prohibited for capability detection.
- [x] Mainnet and Sepolia pool addresses verified from official sources and live chain state.
- [x] Fee semantics and current live amounts verified.
- [x] Ten-block note maturity behavior verified.

**Gate result:** Task 1.1 is complete. Task 1.2 may use this route baseline, but it must still freeze CipherBid's exact bid-ingress action and calldata sequence independently.

## Sources

[1] https://strk20-by-example.org/starknet-wallet-api/overview.md
[2] https://strk20-by-example.org/starknet-wallet-api/private-defi.md
[3] https://starknet-js.com/docs/next/guides/account/walletAccount
[4] https://www.starknet.io/blog/privacy-live-on-starknet
[5] https://raw.githubusercontent.com/starkience/strk20-agent-skills/main/skills/strk20-privacy-integration/references/links.md
[6] https://raw.githubusercontent.com/starkience/strk20-agent-skills/main/skills/strk20-privacy-integration/references/wallet-api-route.md
[7] https://raw.githubusercontent.com/Akashneelesh/strk20-starter-kit/main/package.json
[8] https://raw.githubusercontent.com/starkware-libs/starknet-privacy/main/packages/privacy/README.md
[9] https://strk20-by-example.org/sdk/note-discovery.md
[10] https://strk20-by-example.org/sdk/getting-started.md
[11] https://raw.githubusercontent.com/starkware-libs/starknet-privacy/main/sdk/CHANGELOG.md
[12] https://github.com/starkware-libs/starknet-privacy/blob/main/crates/discovery-core/src/discovery/notes.rs
[13] https://github.com/starkware-libs/starknet-specs/releases/tag/v0.10.3
[14] https://github.com/starknet-io/starknet.js/releases/tag/v10.4.0
[15] https://raw.githubusercontent.com/starkware-libs/starknet-specs/master/wallet-api/wallet_rpc.json
[16] https://raw.githubusercontent.com/starkware-libs/starknet-privacy/main/packages/privacy/src/privacy.cairo
