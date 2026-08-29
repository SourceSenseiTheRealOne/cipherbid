# CipherBid mainnet demo script

**Target duration:** 2:45–2:55
**Recording status:** Not ready. Record only after the complete mainnet lifecycle and every receipt/state readback pass.

## Hard recording gate

Do not record or publish this demo unless all of the following exist as independently verified public evidence:

- one created mainnet auction bound to AuctionHouse `0x01b32af8bab712ede82117b8ff1b8866e09798f6c81edc255ffe59dd42e4843e`;
- DemoERC721 `0x05c7080c583304469e853e472d46a20448ff82bf9ee4c87a8efabc35f8177e1f`, token `99`, held by the AuctionHouse before settlement;
- two successful pool-touching private ingresses from separate Ready X accounts;
- public bid count `2` without pre-reveal bid amounts;
- successful `2 STRK` and `3 STRK` reveals from encrypted recovery;
- successful settlement with Bidder B winning at `2 STRK`;
- token `99` owned by Bidder B's chosen recipient after settlement;
- successful applicable refund/surplus/proceeds claims and value-conservation readback;
- explorer links and Atomic Delivery Receipt rendered from those real records.

If any item is missing, stop. Do not use mock hashes, edited balances, rehearsed wallet popups, or prefilled result cards.

## Capture rules

- Record a clean browser profile with Ready X already installed and unlocked.
- Never show a seed phrase, private key, viewing key, password, recovery plaintext, private balance, note list, proof witness, or browser extension settings.
- Crop wallet prompts to the public target/action/amount confirmation only when safe.
- Keep explorer and receipt links readable, but do not dwell on long hashes.
- Use the deployed mainnet product, not localhost or the Sepolia rehearsal.
- Keep cuts chronological. Never imply a later readback happened before chain acceptance.

## 0:00–0:15 — Hook and product truth

**Screen:** CipherBid home, then the verified AuctionHouse address.

**Narration:**

> CipherBid is a private-bid Vickrey auction on Starknet. Every bidder escrows the same public STRK cap, the actual bid stays sealed until reveal, and the NFT is delivered atomically onchain.

**Visible evidence:**

- “Private bids. Guaranteed onchain delivery.”
- Starknet mainnet
- verified AuctionHouse explorer link

## 0:15–0:35 — Why equal collateral

**Screen:** Auction terms and privacy boundary.

**Narration:**

> A variable amount leaving a privacy pool would reveal the bid. CipherBid instead locks the same four-STRK cap for everyone. Observers can verify every bid is funded without learning whether it is two or three STRK before reveal.

**Visible evidence:**

- reserve: `1 STRK`
- collateral cap: `4 STRK`
- bidder limit: `2`
- no private balance or viewing-key UI

## 0:35–0:55 — NFT custody and auction creation

**Screen:** Seller creation result, then `owner_of(99)` / live auction page.

**Narration:**

> The seller creates one short auction. Approval and creation are atomic, and token ninety-nine moves into CipherBid custody before bidding begins.

**Visible evidence:**

- real auction ID and deadlines
- DemoERC721 token `99`
- AuctionHouse owns the NFT
- accepted creation transaction

## 0:55–1:25 — Two private bids

**Screen:** Bidder A result, switch account, Bidder B result. Keep credential inputs and recovery plaintext out of frame.

**Narration:**

> Bidder A privately commits two STRK. Bidder B, from a separate Ready X account, privately commits three. Ready X owns note discovery, proving, signing, and submission; CipherBid never receives a viewing key.

**Visible evidence:**

- Bidder A accepted ingress receipt
- Bidder B accepted ingress receipt
- identical `4 STRK` collateral edge for both
- public bid count changes from zero to two

## 1:25–1:45 — Observer view before reveal

**Screen:** Read-only auction page and public receipt/event view.

**Narration:**

> Before close, the chain shows two funded commitments and equal collateral. It does not reveal either bid amount or private-note ownership.

**Visible evidence:**

- bid count `2`
- commitments present
- actual bid values absent from pre-reveal state

## 1:45–2:10 — Recovery-bound reveal

**Screen:** Import-verified encrypted recovery flow, then public reveal events. Do not show password or file contents.

**Narration:**

> After bidding closes, each bidder imports the encrypted recovery bound to this chain, contract, and auction. The valid reveals publish two and three STRK exactly once.

**Visible evidence:**

- network/deployment-bound import success
- Bidder A reveal: `2 STRK`
- Bidder B reveal: `3 STRK`
- accepted reveal receipts

## 2:10–2:35 — Vickrey settlement and atomic delivery

**Screen:** Settlement result and Atomic Delivery Receipt.

**Narration:**

> Bidder B wins but pays the second price: two STRK. Settlement transfers token ninety-nine to the winner's chosen recipient in the same onchain transition.

**Visible evidence:**

- winner: Bidder B
- clearing price: `2 STRK`
- NFT owner changed from AuctionHouse to winner recipient
- accepted settlement receipt

## 2:35–2:50 — Claims and conservation

**Screen:** Claim receipts and conservation summary.

**Narration:**

> The loser receives four STRK back, the winner can claim the two-STRK surplus, and the seller receives two STRK where current pool fees make the claim economical. Every applicable claim is one-time and read back from chain state.

**Visible evidence:**

- loser refund: `4 STRK`
- winner surplus: `2 STRK`
- seller proceeds: `2 STRK`, or an explicit fee-based deferral if uneconomical
- no unexpected collateral remains

## 2:50–2:58 — Close

**Screen:** Product home plus public explorer and repository links.

**Narration:**

> Private bids, funded execution, and guaranteed onchain delivery. CipherBid is open source, live on Starknet mainnet, and built on STRK20.

## Final edit checklist

- total runtime is at most `3:00`;
- every displayed hash exists in the public lifecycle evidence;
- the video URL is public and playable without login;
- no secret or private-wallet state appears in any frame, tooltip, download shelf, address bar, or browser history suggestion;
- captions use “sealed until reveal,” never “permanently hidden”;
- `strk20.json.demo_video` is populated only after public playback and duration verification.
