# CipherBid verified mainnet transactions

**Verification time:** `2026-08-29T22:18:12Z`

**Network:** Starknet mainnet (`0x534e5f4d41494e`)

**Auction:** `1788040057342`

**AuctionHouse:** [`0x01b32af8bab712ede82117b8ff1b8866e09798f6c81edc255ffe59dd42e4843e`](https://starkscan.co/contract/0x01b32af8bab712ede82117b8ff1b8866e09798f6c81edc255ffe59dd42e4843e)

**STRK20 pool:** `0x040337b1af3c663e86e333bab5a4b28da8d4652a15a69beee2b677776ffe812a`

## Verification method

Each row was independently checked against the public RPC by exact hash. Publication required all applicable gates:

1. receipt execution status `SUCCEEDED`;
2. finality `ACCEPTED_ON_L2` or stronger;
3. exactly one lifecycle-specific event emitted by the verified AuctionHouse;
4. execution trace contains the AuctionHouse;
5. private bids and bidder claims also contain the canonical STRK20 pool in the execution trace;
6. post-state agrees with the decoded transition.

The eight hashes are unique. Starkscan also resolves the four qualifying pool-touching transaction URLs without authentication. Recovery payloads, passwords, claim secrets, bid nonces, viewing keys, notes, proof witnesses, wallet sessions, and raw wallet output are excluded.

## Lifecycle ledger

| Transition                                 | Transaction                                                                                                      | Block / UTC                         | AuctionHouse event                               | STRK20 pool | Verified readback                                                                        |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------- | ----------------------------------- | ------------------------------------------------ | ----------- | ---------------------------------------------------------------------------------------- |
| Auction creation and NFT custody           | [`0x79f62ae2…6d20b7`](https://starkscan.co/tx/0x79f62ae22728e4f69182df0b52de903efe863ce10f5685809a8b3df926d20b7) | `14066134` / `2026-08-29T21:48:10Z` | `AuctionCreated`                                 | No          | Auction `1788040057342`; reserve `1`, cap `4`, two bidders; AuctionHouse owns token `99` |
| Bidder A equal-cap private ingress         | [`0x70a5ca96…9ce245`](https://starkscan.co/tx/0x70a5ca96744778f5c7f8d1b9b353deafad4dfcbacb218b28721667a759ce245) | `14066346` / `2026-08-29T21:54:03Z` | `BidCommitted`, accepted index `0`, cap `4 STRK` | **Yes**     | First commitment accepted before bidding deadline                                        |
| Bidder B equal-cap private ingress         | [`0x52376bbd…677fd4`](https://starkscan.co/tx/0x52376bbde2b895e5e241b5385baf491293c7fec799d777ad332e3def0677fd4) | `14066470` / `2026-08-29T21:57:28Z` | `BidCommitted`, accepted index `1`, cap `4 STRK` | **Yes**     | Second commitment accepted before bidding deadline                                       |
| Bidder A reveal                            | [`0x4ba193bd…75c5c`](https://starkscan.co/tx/0x4ba193bde7a631a4f0b330633aded56ddabf0b457a040c0ca1303dd00675c5c)  | `14066530` / `2026-08-29T21:59:07Z` | `BidRevealed`, index `0`                         | No          | Amount `2 STRK`; recipient Bidder A                                                      |
| Bidder B reveal                            | [`0x25123dc4…8659b`](https://starkscan.co/tx/0x25123dc40fe62121154204482aaa86e0a03885cd7185a50500190962858659b)  | `14066581` / `2026-08-29T22:00:31Z` | `BidRevealed`, index `1`                         | No          | Amount `4 STRK`; recipient Bidder B                                                      |
| Vickrey settlement and atomic NFT delivery | [`0x883f852f…02cbf`](https://starkscan.co/tx/0x883f852f91052cc25dee8e30a7ce04996db7ccaca015d4bb2d5e2826602cbf)   | `14066773` / `2026-08-29T22:05:57Z` | `AuctionSettled`                                 | No          | Sold; winner index `1`; clearing price `2 STRK`; token `99` owner is Bidder B            |
| Winner-surplus private claim               | [`0x4a76360a…ff540d`](https://starkscan.co/tx/0x4a76360a895ce3f984ee7ab704be0e5c2c220c5584ad05704bb338f2fff540d) | `14066957` / `2026-08-29T22:11:01Z` | `WinnerSurplusClaimed`                           | **Yes**     | `2 STRK` credited through the open-note claim route                                      |
| Loser-refund private claim                 | [`0x7bbe0489…fff15e`](https://starkscan.co/tx/0x7bbe0489702cdc6466b7aa4c262d7d1f34dcabace16e47c5b02cafef7fff15e) | `14067030` / `2026-08-29T22:13:01Z` | `LoserRefundClaimed`                             | **Yes**     | `4 STRK` credited through the open-note claim route                                      |

## Qualifying `strk20.json` transactions

The two bid ingresses and two bidder claims satisfy the strict publication gate: each succeeded on mainnet, touched the canonical live STRK20 pool, emitted its expected event from the listed CipherBid AuctionHouse, and produced the expected readback. Creation, reveals, and settlement support the lifecycle but are not listed as STRK20 transactions because their traces do not touch the pool.

## Truthful deviation from the frozen plan

The frozen rehearsal expected Bidder B to reveal `3 STRK`. The irreversible mainnet reveal was **`4 STRK`**, exactly the configured cap. This record uses the chain value and does not normalize it to the plan. The winner and second-price outcome are unchanged: Bidder B wins and pays Bidder A's `2 STRK` bid.
