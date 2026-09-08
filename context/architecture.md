# Architecture

```text
Browser UI
  -> get-starknet v6 discovery -> privacy-capable wallet -> WalletAccountV6
  -> Starknet RPC (auction/event/receipt reads and readback)
  -> CipherBidAuctionHouse.create_auction / reveal_bid / settle_auction (standard wallet calls)
  -> STRK20 pool -> CipherBidAuctionHouse.privacy_invoke (uniform-cap bid ingress and all monetary claims)
  -> ERC-721 contract (custody and winner delivery)
  -> user-downloaded password-encrypted recovery bundle
  -> Atomic Delivery Receipt (public RPC-derived verification)
```

The Cairo auction house is authoritative for ERC-721 custody, auction lifecycle, Vickrey settlement, and value accounting. A supported user wallet owns its private key, viewing key, private notes, proof generation, signing, and transaction submission. The CipherBid UI connects through the Wallet API boundary, displays the exact transaction target/cap/commitment, holds bidder and seller claim credentials in memory only, requires password-encrypted recovery export/import verification, and reads back every receipt and expected state transition before showing confirmation. There is no CipherBid custodial backend, database, local-vault daemon, or alternate sprint transaction path. The authoritative product boundary is `docs/evidence/winning-product-scope.md`.
