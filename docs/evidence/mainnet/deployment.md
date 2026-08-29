# CipherBid mainnet deployment evidence

Captured at `2026-08-29T09:28:12Z` from Starknet mainnet public RPC readback. This page contains public contract and transaction data only.

## Deployments

| Contract     | Address                                                                                                                                                                    | Class hash                                                           | Deployment transaction                                                                                                                                               | Accepted block |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------: |
| AuctionHouse | [`0x01b32af8bab712ede82117b8ff1b8866e09798f6c81edc255ffe59dd42e4843e`](https://voyager.online/contract/0x01b32af8bab712ede82117b8ff1b8866e09798f6c81edc255ffe59dd42e4843e) | `0x06aa99b7ae9e10619b5a3c1713a4d71054844d3dda8e21bef98db6e653d5efc4` | [`0x03732f01800aa06e569e88a78232c3e7396546e314850a1b54dfae05a68a64b4`](https://voyager.online/tx/0x03732f01800aa06e569e88a78232c3e7396546e314850a1b54dfae05a68a64b4) |     14,039,088 |
| DemoERC721   | [`0x05c7080c583304469e853e472d46a20448ff82bf9ee4c87a8efabc35f8177e1f`](https://voyager.online/contract/0x05c7080c583304469e853e472d46a20448ff82bf9ee4c87a8efabc35f8177e1f) | `0x06c7cba5680595203f9327f5784130907bad1b808891122ad358c10b93136a41` | [`0x029ce413d931197cd911b33cdf21f00d4c599bde29d7822e563ea89c55330a4c`](https://voyager.online/tx/0x029ce413d931197cd911b33cdf21f00d4c599bde29d7822e563ea89c55330a4c) |     14,039,156 |

Both deployment receipts read back as `ACCEPTED_ON_L2` and `SUCCEEDED`.

## Declarations

| Contract     | Declaration transaction                                                                                                                                            | Accepted block |                   Actual fee |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------: | ---------------------------: |
| AuctionHouse | [`0x552781e5ecb2ab9826474c8395ca5fd2f534ce6155367ab67ae195f5e2c9dc6`](https://voyager.online/tx/0x552781e5ecb2ab9826474c8395ca5fd2f534ce6155367ab67ae195f5e2c9dc6) |     14,038,906 | `33.144823441614033664 STRK` |
| DemoERC721   | [`0x01efc7df78014f252d346af3b88a5035b002cf005079604f6e3bf9df0f1fa9b`](https://voyager.online/tx/0x01efc7df78014f252d346af3b88a5035b002cf005079604f6e3bf9df0f1fa9b) |     14,039,038 |  `7.370040394951547648 STRK` |

Both declaration receipts read back as `ACCEPTED_ON_L2` and `SUCCEEDED`, and both class hashes are retrievable at `latest`.

## Immutable readback

AuctionHouse `get_house_config` returned:

| Field           | Value                                                                |
| --------------- | -------------------------------------------------------------------- |
| STRK20 pool     | `0x040337b1af3c663e86e333bab5a4b28da8d4652a15a69beee2b677776ffe812a` |
| Payment token   | `0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d` |
| Maximum bidders | `32`                                                                 |

DemoERC721 readback returned:

| Field         | Value                                                                |
| ------------- | -------------------------------------------------------------------- |
| Token ID      | `99`                                                                 |
| Owner         | `0x01017404a72b0d5312d7f41e81e0a87b89387db78361bb4ce60b0e0a390d72aa` |
| Owner balance | `1`                                                                  |

## Bounded execution accounting

| Field                                   |                         Value |
| --------------------------------------- | ----------------------------: |
| Frozen release ceiling                  |                    `150 STRK` |
| Total explicit authorized ceilings used |  `79.374368698599459765 STRK` |
| Total actual fees paid                  |  `40.704804389474492096 STRK` |
| Remaining authorized ceiling            |  `70.625631301400540235 STRK` |
| Deployer public balance at readback     | `159.428234034473002848 STRK` |

The first execution process lost its RPC connection after the AuctionHouse declaration was accepted. The declaration transaction was recovered by scanning recent public blocks for the exact sender and class hash, then its successful receipt, class availability, resource bounds, and fee were independently read back before later writes resumed. It was not replayed.

## Privacy boundary

No signer, viewing key, bid nonce, claim secret, recovery password, recovery payload, private note, proof witness, or wallet session is included in this evidence. The deployment transactions do not touch the STRK20 pool and therefore are not qualifying `strk20.json` lifecycle entries.
