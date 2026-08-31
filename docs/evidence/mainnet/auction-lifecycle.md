# CipherBid verified mainnet auction lifecycle

**Status:** Fully verified through seller proceeds claim

**Verification time:** `2026-08-31T09:00:38Z`

**Live route:** [`https://sourcesenseitherealone.github.io/cipherbid/auction/?id=1788040057342`](https://sourcesenseitherealone.github.io/cipherbid/auction/?id=1788040057342)

**Transaction ledger:** [`transactions.md`](transactions.md)

## Final auction identity

| Field                | Verified value                                                       |
| -------------------- | -------------------------------------------------------------------- |
| Network              | Starknet mainnet (`0x534e5f4d41494e`)                                |
| Auction ID           | `1788040057342`                                                      |
| AuctionHouse         | `0x01b32af8bab712ede82117b8ff1b8866e09798f6c81edc255ffe59dd42e4843e` |
| DemoERC721           | `0x05c7080c583304469e853e472d46a20448ff82bf9ee4c87a8efabc35f8177e1f` |
| Token                | `99`                                                                 |
| Reserve              | `1 STRK`                                                             |
| Equal collateral cap | `4 STRK`                                                             |
| Bidder limit         | `2`                                                                  |
| Bidding deadline     | `2026-08-29T21:57:51Z`                                               |
| Reveal deadline      | `2026-08-29T22:02:51Z`                                               |

Creation transaction [`0x79f62ae2…6d20b7`](https://starkscan.co/tx/0x79f62ae22728e4f69182df0b52de903efe863ce10f5685809a8b3df926d20b7) atomically approved and transferred token `99` into AuctionHouse custody. A lost post-write RPC response did not trigger a replay: the exact `AuctionCreated` event, NFT owner, and auction state were recovered first.

## Two private equal-cap bids

Both Ready X accounts had separately shielded `24 STRK` and exceeded the ten-block note-maturity gate before creation. Each private ingress transferred the same public `4 STRK` cap through the canonical STRK20 pool into AuctionHouse accounting.

| Accepted index | Private-ingress receipt                                                                                          | Public event before reveal                              | Revealed amount | Reveal receipt                                                                                                  |
| -------------: | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- | --------------: | --------------------------------------------------------------------------------------------------------------- |
| `0` / Bidder A | [`0x70a5ca96…9ce245`](https://starkscan.co/tx/0x70a5ca96744778f5c7f8d1b9b353deafad4dfcbacb218b28721667a759ce245) | commitment + claim handle + `4 STRK` cap; no bid amount |        `2 STRK` | [`0x4ba193bd…75c5c`](https://starkscan.co/tx/0x4ba193bde7a631a4f0b330633aded56ddabf0b457a040c0ca1303dd00675c5c) |
| `1` / Bidder B | [`0x52376bbd…677fd4`](https://starkscan.co/tx/0x52376bbde2b895e5e241b5385baf491293c7fec799d777ad332e3def0677fd4) | commitment + claim handle + `4 STRK` cap; no bid amount |        `4 STRK` | [`0x25123dc4…8659b`](https://starkscan.co/tx/0x25123dc40fe62121154204482aaa86e0a03885cd7185a50500190962858659b) |

Bidder B entered `4 STRK`, not the frozen plan's `3 STRK`. The contract accepted the value because it equals the configured cap. Evidence, product copy, and recording guidance use the actual chain value.

## Settlement and atomic delivery

Settlement transaction [`0x883f852f…02cbf`](https://starkscan.co/tx/0x883f852f91052cc25dee8e30a7ce04996db7ccaca015d4bb2d5e2826602cbf) succeeded after the reveal deadline. Independent state readback returned:

| Assertion                   | Result                                                               |
| --------------------------- | -------------------------------------------------------------------- |
| Settled / sold              | `true` / `true`                                                      |
| Winner                      | accepted index `1`, Bidder B                                         |
| Highest revealed bid        | `4 STRK`                                                             |
| Second-price clearing price | `2 STRK`                                                             |
| Seller entitlement          | `2 STRK`                                                             |
| NFT recipient               | `0x057791bafe2653e8a62509261aeba6a9d09f1fe09f039c9ff0c09c00c24b1f1a` |
| `owner_of(99)`              | same Bidder B recipient                                              |
| Delivery invariant          | verified                                                             |

The settlement event and ERC-721 owner readback prove price calculation and NFT delivery in the same accepted state transition.

## Claims and value conservation

| Allocation              |   Amount | Result                                                                                                                                     |
| ----------------------- | -------: | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Bidder A loser refund   | `4 STRK` | Claimed through STRK20 in [`0x7bbe0489…fff15e`](https://starkscan.co/tx/0x7bbe0489702cdc6466b7aa4c262d7d1f34dcabace16e47c5b02cafef7fff15e) |
| Bidder B winner surplus | `2 STRK` | Claimed through STRK20 in [`0x4a76360a…ff540d`](https://starkscan.co/tx/0x4a76360a895ce3f984ee7ab704be0e5c2c220c5584ad05704bb338f2fff540d) |
| Seller entitlement      | `2 STRK` | Claimed through STRK20 in [`0x24d92390…5528e`](https://starkscan.co/tx/0x24d92390b2f0ca629fe49e4c4355aaa2fe1fbf143bd4ba1e37b80e4575528e)   |

```text
Initial equal-cap collateral: 4 + 4 = 8 STRK
Loser refund:                       4 STRK
Winner surplus:                     2 STRK
Seller entitlement:                 2 STRK
Total allocation:                   8 STRK
```

Final readback:

```text
AuctionHouse actual STRK balance:    0 STRK
AuctionHouse accounted balance:      0 STRK
Outstanding seller entitlement:      0 STRK
Unexplained difference:               0 STRK
```

The live pool fee was `6 STRK` per private operation. The seller explicitly completed the `2 STRK` claim despite the `-4 STRK` economic result before public authorization gas. The successful claim emitted `SellerProceedsClaimed`, touched the canonical pool in the execution trace, consumed the seller claim, and reduced both actual and accounted AuctionHouse balances to zero.

## Privacy and custody boundary

- Actual bids were sealed until their reveal transactions; they are public now by design.
- Both pre-reveal ingress events exposed the same `4 STRK` collateral, commitments, count, and timing—not the bid amount.
- Ready X owned viewing keys, note discovery, proof generation, signing, and submission.
- CipherBid generated recovery credentials only in active browser memory and exported password-encrypted bundles.
- No recovery plaintext, password, nonce, claim secret, viewing key, private note, proof witness, or wallet session appears in this evidence.
- Deposit, timing, equal-cap transfer, reveals, settlement, open-note claim edges, and final ownership are public.
