# Organizer hub readback

Public readback on September 24, 2026, from the STRK20 Private Sprint organizer repository:

- [Project index at `4c625bec`](https://github.com/starkience/strk20-hackathon/blob/4c625becb6b366ce3c26c7f6dc9b43bd320198f3/projects.json)
- [Registration source](https://github.com/starkience/strk20-hackathon/blob/4c625becb6b366ce3c26c7f6dc9b43bd320198f3/registry.json)

The entry for `https://github.com/SourceSenseiTheRealOne/cipherbid` reports:

| Field | Observed value |
| --- | --- |
| Status | `finished` |
| Demo requirement | `true` |
| Video requirement | `true` |
| Mainnet requirement | `true` |
| Verified transactions | `5` |
| Indexed project revision | `13f25cc56ce8a45fa9646365dd923508835f3b16` |
| Demo | `https://sourcesenseitherealone.github.io/cipherbid/auction/?id=1788040057342` |
| Video | `https://youtu.be/pYZk6KXko7o` |

The transaction list contains five unique hashes, each marked `ok`, `pool` and `mine`. They match the qualifying bid and claim transactions in [`strk20.json`](../../../strk20.json) and the [mainnet ledger](../mainnet/transactions.md).

This later readback resolves the old “hub refresh pending” entries in the [requirements matrix](../hackathon-requirements-matrix.md). It records the organizer's published status; it does not establish prize placement, an audit, production readiness or new blockchain execution. The original August deployment and transaction evidence retains its original dates and identities.

The public homepage and settled auction were also opened in a clean browser during this review. Both returned HTTP 200 without page errors. The auction displayed sold state, a `2 STRK` clearing price, verified NFT custody and claimed seller proceeds. No wallet was connected and no transaction was submitted.
