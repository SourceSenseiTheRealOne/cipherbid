# Sepolia deployment manifest

## Status

The CipherBid release candidate and one synthetic ERC-721 are declared, deployed, and read back on Starknet Sepolia. This document contains public chain evidence only. It contains no signer key, wallet private state, recovery bundle, bid nonce, or claim secret.

The auction lifecycle itself is not complete yet. No auction, bid, reveal, settlement, or claim success is asserted here.

## Network and immutable identities

| Field | Verified value |
| --- | --- |
| Network | Starknet Sepolia |
| Chain ID | `0x534e5f5345504f4c4941` |
| RPC used for readback | `https://api.zan.top/public/starknet-sepolia/rpc/v0_10` |
| RPC spec observed | `0.10.3-rc.0` |
| Deployer | `0x01ff477da49d13f1b48774d0fc2313358e3f358be741b4944b54fccb34f7f424` |
| STRK20 pool | `0x0254a6b2997ef52e9f830ce1f543f6b29768295e8d17e2267d672c552cfe0d91` |
| STRK token | `0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d` |
| AuctionHouse | `0x0705b1080174f2b10c02fd8b2e00b918e4dc91f9021ee6a208f53d5909fcc87d` |
| DemoERC721 | `0x011beadd9e02a7a633da6436bf342b407231c4fa4b77f2544e9866ba94f4d129` |
| Synthetic token ID | `99` |
| Synthetic token initial owner | deployer address above |

## Release artifacts

| Contract | Class hash | Release artifact SHA-256 | Canonical ABI SHA-256 |
| --- | --- | --- | --- |
| AuctionHouse | `0x06aa99b7ae9e10619b5a3c1713a4d71054844d3dda8e21bef98db6e653d5efc4` | `aa713e69c211528f9fd891ba6bb13eb59728caf57425ce04c88191e7fd88942d` | `0170ddfbc3c10168010648c94b3f55a62dc9cd4726cc5ba3cab906e21ee38432` |
| DemoERC721 | `0x06c7cba5680595203f9327f5784130907bad1b808891122ad358c10b93136a41` | `3e593d7a555750156b41982ca3241c0fe5d080e22c9fcf6b90a31bcc45166313` | `3a5a341710e16420ce7862837fcb8e6cedc36ba3c197c150bf503b7b5e15d93f` |

Artifacts were built from `contracts/` with Scarb `2.20.1` and Cairo compiler `2.20.0`.

## Constructor manifests

### AuctionHouse

Ordered calldata:

1. pool: `0x0254a6b2997ef52e9f830ce1f543f6b29768295e8d17e2267d672c552cfe0d91`
2. payment token: `0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d`
3. maximum bidders: `32`

Deterministic salt:

`0x4349504845524249445f41485f5345504f4c49415f5631` (`CIPHERBID_AH_SEPOLIA_V1`)

### DemoERC721

Ordered calldata:

1. owner: `0x01ff477da49d13f1b48774d0fc2313358e3f358be741b4944b54fccb34f7f424`
2. token ID low limb: `99`
3. token ID high limb: `0`

Deterministic salt:

`0x4349504845524249445f4e46545f5345504f4c49415f5631` (`CIPHERBID_NFT_SEPOLIA_V1`)

## Accepted setup transactions

| Action | Block | Actual fee | Transaction |
| --- | ---: | ---: | --- |
| Fund deployer | 14,176,454 | `0.052968564618065984 STRK` | [`0x35713067…a3a232`](https://sepolia.voyager.online/tx/0x035713067b8a560c1ec10c71856bf2d17da0c00f2ff853913d743caf27a3a232) |
| Deploy account | 14,176,491 | `0.078454504696804384 STRK` | [`0x074f2e1a…66c526`](https://sepolia.voyager.online/tx/0x074f2e1aee39d5ce58fc811545726b64d32939b4d8fc1d27357cfee45866c526) |
| Declare AuctionHouse | 14,176,557 | `31.513946606579319232 STRK` | [`0x02996c0e…92374`](https://sepolia.voyager.online/tx/0x02996c0ebba0768a92e2dfd53fd2dc72aebb632ef93f678294aad63f8af92374) |
| Deploy AuctionHouse | 14,177,403 | `0.093947231954548848 STRK` | [`0x03c34fde…bec01`](https://sepolia.voyager.online/tx/0x03c34fde6e99d1d0c69b3681676d78a75c665fd9441ff5df51b114ab2a2bec01) |
| Declare DemoERC721 | 14,177,683 | `7.186112307979671552 STRK` | [`0x014430dd…e5ea0`](https://sepolia.voyager.online/tx/0x014430dd2981171a9197ae4b5ebc44a8b6b948b0d31eed82f7eb55a3657e5ea0) |
| Deploy DemoERC721 | 14,177,725 | `0.083351808057320352 STRK` | [`0x04e7c93f…a218`](https://sepolia.voyager.online/tx/0x04e7c93f49afad7857e1c6313f383530ba8d1fb96a86d640d8ebe4d10c08a218) |

The deployment setup budget excluded faucet funding. Its approved maximum was `53.10384 STRK`; accepted account/class/contract setup spent `38.955812459267664368 STRK`.

## Independent readback

After acceptance:

- `starknet_getClassHashAt(AuctionHouse)` returned the exact reviewed AuctionHouse class hash.
- `get_house_config()` returned the canonical Sepolia STRK20 pool, canonical STRK token, and maximum bidder bound `32`.
- `starknet_getClassHashAt(DemoERC721)` returned the exact reviewed demo class hash.
- `owner_of(99)` returned the deployer.
- `balance_of(deployer)` returned `1`.
- Every listed transaction returned `ACCEPTED_ON_L2` and `SUCCEEDED`.

## Excluded attempts

Several DemoERC721 declaration submissions were returned by public RPCs but later disappeared without consuming nonce or declaring the class. They are not evidence and are intentionally excluded from the accepted transaction table. The successful declaration used explicit buffered resource bounds; estimate-tight `--max-fee` submissions were susceptible to silent mempool eviction while gas prices moved.

## Abort conditions for lifecycle writes

Stop before accepting or moving value if any condition holds:

- chain ID, AuctionHouse class hash, pool, token, or maximum bidder bound differs;
- DemoERC721 class, token ID, or owner differs;
- wallet account/network changes after preparation;
- bid cap, reserve, recipient, deadlines, or commitment differs from displayed terms;
- a private transaction lacks the expected STRK20 pool and CipherBid events;
- a submitted hash is absent or timed out; timeout remains unconfirmed, never success;
- NFT custody, reveal, settlement, claim status, or accounting readback disagrees with the expected transition;
- any credential or wallet-private material would leave browser memory or the encrypted recovery bundle.
