# CipherBid Sepolia demo runbook

## One-time wallet preparation

The seller is the local Sncast deployer. The active bidder candidates are Xverse Sepolia accounts being tested through the STRK20 Wallet API:

| Role | Custody | Public address |
| --- | --- | --- |
| Seller | Sncast `cipherbid-sepolia-deployer` | `0x01ff477da49d13f1b48774d0fc2313358e3f358be741b4944b54fccb34f7f424` |
| Bidder A | Xverse | `0x054499e46751979eea7fcc64475836d1a5f591c2d12a7546e42e8516fdbabc4d` |
| Bidder B | Xverse | `0x014ecc190504847edc0b29f427404b2cad833ff8837277af69f4d3bf99d82b52` |

Before activation or shielding, verify public deployment, funding, and registration state for both bidders. Never paste a private key into chat, source files, `.env`, screenshots, recordings, or issue text.

Confirm Xverse shows the exact public addresses above before activation, shielding, signing, or connecting to CipherBid.

## Create a fresh auction

From `web/`:

```bash
pnpm auction:create:sepolia -- --bidding-minutes 10 --reveal-minutes 5
```

The script:

1. creates a unique auction ID;
2. deploys a fresh one-token DemoERC721;
3. creates and import-verifies encrypted seller recovery;
4. sets reserve `2 STRK`, cap `5 STRK`, bidder limit `2`;
5. fixes bidding to 10 minutes and reveal to at most 5 minutes;
6. atomically approves NFT custody and creates the auction;
7. waits for acceptance and validates all config plus `owner_of`;
8. prints the local auction URL and public transaction hashes.

Use `--bidding-minutes 20` if wallet setup has not already been completed. The script rejects reveal windows greater than five minutes.

## Prepare private bidder funds

For each Xverse bidder account:

1. switch Xverse to Starknet Sepolia;
2. confirm its address exactly matches the table;
3. shield at least `15 STRK` through Xverse's STRK20 privacy flow;
4. wait at least 10 blocks after note creation before bidding;
5. retain enough private STRK for the pool fee and later claim.

Do not use `sncast` to fake a private bid. An ordinary account invoke cannot replace STRK20 note discovery and proof generation.

## Submit both sealed bids immediately

Open the URL printed by the script.

### Bidder A

- connect Xverse Bidder A;
- bid `3 STRK`;
- keep the NFT recipient as bidder A unless intentionally demonstrating delivery to another address;
- choose a recovery password of at least 12 characters;
- download and confirm the encrypted bidder recovery bundle;
- approve the Xverse transaction;
- wait for `1/2 bids` readback.

### Bidder B

- disconnect/switch account;
- connect Xverse Bidder B;
- bid `4 STRK`;
- download and confirm a separate encrypted recovery bundle;
- approve the Xverse transaction;
- wait for `2/2 bids` readback.

At this point the public auction should show two commitments and no bid amounts.

## Reveal and settle

1. Wait until the bidding deadline.
2. Import Bidder A's encrypted recovery bundle and reveal `3 STRK`.
3. Switch to Bidder B, import its bundle, and reveal `4 STRK`.
4. Complete both reveals within the five-minute reveal window.
5. After the reveal deadline, any connected account may settle.
6. Verify Bidder B wins, clearing price is `3 STRK`, and `owner_of(99)` is Bidder B's committed recipient.

## Claims

- Bidder A claims the full `5 STRK` loser refund through STRK20.
- Bidder B claims the `2 STRK` winner surplus through STRK20.
- Seller imports the seller recovery bundle printed by the CLI script, authorizes the resolved open-note ID, then claims `3 STRK` seller proceeds through STRK20.
- Verify all one-time claim flags and zero unexpected collateral.

## Current tested auction

The script's first successful live run created:

http://localhost:4110/auctions/1787917793344

That run verified NFT custody and all immutable fields. It is rehearsal evidence, not a replacement for the fresh demo-day run.
