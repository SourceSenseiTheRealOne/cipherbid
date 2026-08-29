import { describe, expect, it } from 'vitest'
import { createBidderCredential, createSellerCredential } from '@/features/credentials/credentials'
import {
  createVerifiedRecoveryBundle,
  decryptRecoveryBundle,
  encryptRecoveryBundle,
} from '@/features/credentials/recoveryBundle'

const binding = {
  network: 'sepolia' as const,
  chainId: 0x534e5f5345504f4c4941n,
  auctionHouse: 0x123n,
  auctionId: 7n,
}

const credentials = [
  createSellerCredential({ ...binding, claimSecret: 0x123456789abcdefn }),
  createBidderCredential({
    ...binding,
    claimSecret: 0x223456789abcdefn,
    bidNonce: 0x323456789abcdefn,
    amount: 4n,
    assetRecipient: 0x888n,
  }),
] as const

const password = 'correct horse battery staple'

describe('encrypted recovery bundle', () => {
  it('round-trips exact credentials without plaintext fields in the exported JSON', async () => {
    const serialized = await encryptRecoveryBundle(credentials, password)
    expect(serialized).toContain('cipherbid.recovery.v1')
    expect(serialized).not.toContain('claimSecret')
    expect(serialized).not.toContain('bidNonce')
    expect(serialized).not.toContain('123456789abcdef')
    await expect(decryptRecoveryBundle(serialized, password)).resolves.toEqual(credentials)
  })

  it('creates only an import-verified bundle identifier and rejects wrong passwords or tampering generically', async () => {
    const verified = await createVerifiedRecoveryBundle(credentials, password)
    expect(verified.bundleId).toMatch(/^0x[0-9a-f]{64}$/)
    expect(verified.credentialCount).toBe(2)
    await expect(decryptRecoveryBundle(verified.serialized, 'wrong password value')).rejects.toThrow(
      'could not be decrypted or validated',
    )

    const parsed = JSON.parse(verified.serialized) as { ciphertext: string }
    parsed.ciphertext = `${parsed.ciphertext[0] === 'A' ? 'B' : 'A'}${parsed.ciphertext.slice(1)}`
    await expect(decryptRecoveryBundle(JSON.stringify(parsed), password)).rejects.toThrow(
      'could not be decrypted or validated',
    )
  })

  it('rejects malformed, oversized, or weakly protected bundles without echoing input secrets', async () => {
    await expect(encryptRecoveryBundle(credentials, 'too-short')).rejects.toThrow('at least 12')
    await expect(decryptRecoveryBundle('{"claimSecret":"SYNTHETIC_SECRET_SENTINEL"}', password)).rejects.toThrow(
      'could not be decrypted or validated',
    )
    await expect(decryptRecoveryBundle('x'.repeat(70_000), password)).rejects.toThrow(
      'could not be decrypted or validated',
    )
    try {
      await decryptRecoveryBundle('{"claimSecret":"SYNTHETIC_SECRET_SENTINEL"}', password)
    } catch (error) {
      expect(String(error)).not.toContain('SYNTHETIC_SECRET_SENTINEL')
    }
  })
})
