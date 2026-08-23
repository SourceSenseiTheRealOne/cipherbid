import { describe, expect, it } from 'vitest'
import { supportsWalletApiVersion } from '@/features/wallet/walletCapabilities'

describe('supportsWalletApiVersion', () => {
  it('accepts Wallet API 0.10.3 and later compatible versions', () => {
    expect(supportsWalletApiVersion(['0.10.3'])).toBe(true)
    expect(supportsWalletApiVersion(['0.10', '0.11'])).toBe(true)
    expect(supportsWalletApiVersion(['1.0.0'])).toBe(true)
  })

  it('rejects older, empty, and malformed capability lists', () => {
    expect(supportsWalletApiVersion(['0.10.2', '0.9.9'])).toBe(false)
    expect(supportsWalletApiVersion([])).toBe(false)
    expect(supportsWalletApiVersion(['not-a-version'])).toBe(false)
  })
})
