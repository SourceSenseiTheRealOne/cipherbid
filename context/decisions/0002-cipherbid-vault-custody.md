# Decision 0002: Keep auction credentials in a user-operated local vault

**Status:** Accepted

## Decision

CipherBid adopts `cipherbid-vault`, a user-operated local CLI, as the sole owner of the vault-profile execution-account key, vault viewing key, vault-private notes, auction bid nonce, encrypted credential record, and offline claim private key.

The web app remains a public-data-only reader. It may display public descriptors and read-back receipts, but it never submits auction actions. It must not receive the sealed bid amount, bid nonce, claim private key, vault master key, execution-account key, viewing key, private notes, or recovery plaintext.

The vault uses the maintained Privacy SDK for its own dedicated account to submit STRK20 equal-cap ingress, and that account also sends direct public reveal/claim calls. It never imports the user's normal wallet key or viewing key. Users fund the vault profile independently of the CipherBid website.

## Rationale

The installed Wallet API 0.10.3 supports STRK20 action preparation and invocation, but no reviewed capability owns a dapp-specific bid/recovery credential end to end. Browser-side generation or encrypted storage would violate CipherBid's hard browser boundary, and browser-built actions can be modified before a wallet prompt. The Privacy SDK route would place a viewing key and a signing key into a browser runtime, which is unsuitable; it is acceptable only in the separately distributed, user-operated vault.

A user-operated companion makes the new trust assumption explicit, local, and auditable without introducing a CipherBid cloud custodian or backend.

## Consequences

- Bid creation remains disabled until the vault and an authenticated onchain claim path exist.
- The auction protocol will replace `claimSecret` with an offline claim key and onchain public-key claim authorization.
- The vault is Windows-first in the MVP and must use maintained OS-protection and encrypted-backup libraries rather than custom cryptography.
- No localhost daemon, native browser bridge, cloud backup, telemetry, or automatic clipboard export is allowed.
- Public reveal/claim submissions from the dedicated execution account may be linkable to each other. Product copy must disclose this limitation.
- The vault profile is local user custody with account-key compromise, offline-claim-bundle recovery, funding, and rotation responsibilities; it is not a lightweight browser helper.

## Reference

The detailed protocol, storage boundary, user flows, contract revision, threats, and acceptance criteria are in:

`docs/superpowers/specs/2026-08-24-cipherbid-vault-custody-design.md`
