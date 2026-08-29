# Deployment

Development began with local contract tests and read-only/live-pool shape checks, then a Sepolia rehearsal. The reviewed AuctionHouse and DemoERC721 are now declared and deployed on mainnet under the human-approved `150 STRK` release ceiling. The private two-bidder lifecycle remains gated on Ready X deposits and must not be claimed complete until its pool-touching receipts and state transitions are read back.

Mainnet pool: `0x040337b1af3c663e86e333bab5a4b28da8d4652a15a69beee2b677776ffe812a`

AuctionHouse: `0x01b32af8bab712ede82117b8ff1b8866e09798f6c81edc255ffe59dd42e4843e`

DemoERC721: `0x05c7080c583304469e853e472d46a20448ff82bf9ee4c87a8efabc35f8177e1f`

Canonical public deployment evidence: `docs/evidence/mainnet/deployment.json` and `docs/evidence/mainnet/deployment.md`.

Never record a transaction or contract in `strk20.json` until it is read back, successful, on the expected network, and tied to the expected state transition.
