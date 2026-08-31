# CipherBid final demo video evidence

**Verification time:** `2026-08-31T14:49:19Z`

**Public URL:** https://youtu.be/pYZk6KXko7o

## Public identity

| Field       | Verified value                                     |
| ----------- | -------------------------------------------------- |
| Video ID    | `pYZk6KXko7o`                                      |
| Provider    | YouTube                                            |
| Title       | `cipherBid auction strk20`                         |
| Channel     | `Source Sensei`                                    |
| Channel URL | `https://www.youtube.com/@sourcesensei`            |
| Thumbnail   | `https://i.ytimg.com/vi/pYZk6KXko7o/hqdefault.jpg` |

YouTube's unauthenticated oEmbed endpoint returned the video identity and embed markup successfully.

## Playback and duration

A clean Chromium session opened the normal public watch page without signing in. The HTML media element reached `readyState = 4`, reported no player error, and returned a duration of `144.861` seconds (`2:24.861`). The public captions contain 50 segments and report approximately `2:26`. Both measurements are below the official three-minute maximum.

| Gate                                | Result              |
| ----------------------------------- | ------------------- |
| Public watch page opens             | Passed              |
| Media metadata available            | Passed              |
| Player error                        | None                |
| Browser duration                    | `144.861` seconds   |
| Duration no more than `180` seconds | Passed              |
| Captions available                  | Passed, 50 segments |

YouTube transcodes hosted videos and does not expose one stable public byte artifact, so this evidence does not claim a remote MP4 checksum.

## Content alignment

The transcript covers the same facts published by the verified mainnet evidence:

- CipherBid is a private-bid Vickrey NFT auction on Starknet;
- bidders lock one equal public collateral cap through STRK20;
- Bidder A revealed `2 STRK` and received the loser refund;
- Bidder B revealed `4 STRK`, won, paid the `2 STRK` clearing price, and received the surplus;
- the seller received `2 STRK`;
- token `99` was escrowed before bidding;
- winner selection, clearing-price accounting, and NFT transfer settle atomically or revert together;
- the public page exposes the transaction history and recovery input flow.

The captions contain no recovery password value, claim secret, bid nonce, viewing key, private note, proof witness, signer material, or wallet session data. They mention the recovery-password feature only at a product level.

## Submission binding

The final public URL is published in root `strk20.json.demo_video`. Earlier candidate YouTube links and the superseded local MP4 target are not submission URLs.
