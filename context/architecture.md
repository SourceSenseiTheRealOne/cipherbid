# Architecture

```text
Browser
  -> privacy-capable Starknet wallet (keys, note discovery, proving)
  -> STRK20 pool (private note spend / relayed submission)
  -> CipherBidAuctionHouse.privacy_invoke (uniform collateral, reveal, claims)
  -> ERC-721 contract (custody and winner delivery)

Browser
  -> Starknet RPC (read-only auction/event/receipt state)
```

The Cairo auction house is authoritative for auction lifecycle and accounting. The wallet is authoritative for the user's private STRK20 state. The browser owns only typed transaction preparation and ephemeral encrypted recovery handling. There is no custodial backend or database.
