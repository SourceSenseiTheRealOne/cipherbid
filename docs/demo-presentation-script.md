# CipherBid live demo presentation script

**Target length:** about 2 minutes 45 seconds at a natural pace

**Live page:** https://sourcesenseitherealone.github.io/cipherbid/auction/?id=1788040057342

**Published video:** https://youtu.be/pYZk6KXko7o

## Before recording

1. Open the live auction in a clean browser window.
2. Set browser zoom to 100%.
3. Keep the page at the top before recording.
4. Do not open recovery files, wallet activity, private balances, or developer tools.
5. Scroll slowly enough that transaction links and values can be read.

## Talk track

### 0:00-0:18 - What CipherBid is

**On screen:** Keep the auction title, `MAINNET`, `SOLD`, and `2/2 bids` visible.

**Say:**

> CipherBid is a private-bid Vickrey auction for NFTs on Starknet. It proves bidders can pay without revealing their bids early, and it removes the need to trust the seller for delivery.

### 0:18-0:42 - The equal-collateral idea

**On screen:** Scroll to the reserve, collateral cap, and deadline cards.

**Say:**

> CipherBid makes every accepted bidder lock the same public collateral cap through STRK20. In this auction both bidders locked 4 STRK, so observers could see that both bids were funded without learning whether either bidder had committed 2 STRK or 4 STRK.

> The actual bid stayed sealed until the reveal window. This is the main difference from an unfunded hash commitment or variable public escrow.

### 0:42-1:08 - The verified auction result

**On screen:** Show the accepted bids and revealed amounts.

**Say:**

> This is the completed mainnet auction, not sample data. Bidder A revealed 2 STRK. Bidder B revealed 4 STRK.

> CipherBid uses a Vickrey rule: the highest valid bidder wins, but pays the greater of the reserve or the second-highest bid. Bidder B therefore won and paid 2 STRK.

### 1:08-1:36 - The atomic part

**On screen:** Show token `99`, the current owner, and the Atomic Delivery Receipt.

**Say:**

> The seller escrows token 99 when creating the auction, so delivery does not depend on a later seller action.

> Settlement is all or nothing: winner selection, the two-STRK clearing price, and NFT transfer succeed together or everything reverts.

> The page reads the final NFT owner from Starknet before showing Delivery verified.

### 1:36-2:04 - Private claims and conservation

**On screen:** Show clearing price, seller proceeds, and verified transaction receipts.

**Say:**

> STRK20 open-note claims returned 4 STRK to Bidder A, 2 STRK surplus to Bidder B, and 2 STRK to the seller.

> The seller claim is our fifth qualifying pool transaction. Final actual and accounted AuctionHouse balances are both zero.

### 2:04-2:28 - What stays private

**On screen:** Keep the receipt and wallet boundary text visible.

**Say:**

> Ready X owns the viewing keys, private notes, proof generation, signing, and submission. CipherBid never asks for a viewing key or private-note witness. Recovery credentials are password-encrypted and held by the user.

> The privacy claim is precise: bid amounts are sealed until reveal. Deposits, timing, equal collateral, and the final revealed bids are public by design.

### 2:28-2:45 - What comes next

**On screen:** Return to the auction overview and keep the completed result visible.

**Say:**

> The next direction is token-launch auctions. The same funded sealed-demand model can extend from one NFT to multi-unit token allocations with an onchain clearing price. That needs a new allocation contract, so it is roadmap work, not a feature we are claiming today.

### 2:45-2:55 - Close with the differentiator

**On screen:** Return to the auction title and `SOLD` status.

**Say:**

> CipherBid gives us funded privacy before reveal, all-or-nothing NFT delivery at settlement, private claims afterward, and public receipts anyone can verify. That is what makes it more than a basic commit/reveal auction.

## Short answers for judge questions

### Why not use a normal commit/reveal auction?

A minimal commit/reveal design can accept an unfunded hash. If it escrows each bidder's exact amount, the public transfer can reveal the bid. CipherBid locks one equal cap for every accepted bidder.

### Why use a Vickrey price?

The winner pays the second-highest valid bid or the reserve, whichever is greater. In the verified auction, Bidder B revealed 4 STRK but paid 2 STRK.

### What does atomic delivery mean?

The AuctionHouse already holds the NFT. Winner selection, clearing-price accounting, and NFT transfer happen inside one settlement transaction. If delivery fails, settlement reverts instead of leaving a recorded winner without the asset.

### How could this support token launches?

The roadmap extends equal funded commitments to multi-unit token allocations and a uniform clearing price. That requires a new allocation and settlement contract; the current verified deployment remains a one-unit ERC-721 auction.

### What does STRK20 do here?

STRK20 provides the private pool path for equal-cap bid ingress and the loser, winner, and seller claims. Ready X handles private-note discovery and proving.

### Is everything anonymous?

No. Deposits, timing, equal collateral, reveals, settlement, and open-note edges are public. CipherBid specifically protects the bid amount before reveal and keeps wallet private material out of the app.

### How do we know delivery and accounting are correct?

The public page reads the AuctionHouse state, transaction receipts, ERC-721 owner, token balance, and claim-consumed flags from Starknet. The final AuctionHouse actual and accounted STRK balances are both zero.

### Is this production audited?

No. It is a bounded, tested mainnet hackathon deployment. The repository documents its threat model and limitations instead of presenting it as a production audit.

## Public proof links

- [Live auction](https://sourcesenseitherealone.github.io/cipherbid/auction/?id=1788040057342)
- [Verified transaction ledger](evidence/mainnet/transactions.md)
- [Verified lifecycle and value conservation](evidence/mainnet/auction-lifecycle.md)
- [Seller claim transaction](https://starkscan.co/tx/0x24d92390b2f0ca629fe49e4c4355aaa2fe1fbf143bd4ba1e37b80e4575528e)
