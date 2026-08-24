# Architecture

```text
Browser
  -> Starknet RPC (read-only auction/event/receipt state)

CipherBid Vault CLI (user-operated; no browser bridge)
  -> Starknet RPC (independent auction verification)
  -> Privacy SDK / dedicated account (keys, note discovery, proving)
  -> STRK20 pool -> CipherBidAuctionHouse.privacy_invoke (private uniform-cap bid ingress only)
  -> CipherBidAuctionHouse.reveal / claim (direct public lifecycle calls)
  -> ERC-721 contract (custody and winner delivery)
  -> local OS-protected credential store
```

The Cairo auction house is authoritative for auction lifecycle and accounting. CipherBid Vault is the user-operated custodian of its dedicated execution account, STRK20 viewing key, private notes, bid nonce, and encrypted offline claim bundle. The browser owns only public read-only state and may display a public vault receipt; it never prepares or submits auction actions, or handles recovery plaintext or any credential secret. The user's normal privacy wallet remains separate and may fund the vault profile outside the CipherBid website. There is no CipherBid custodial backend or database.
