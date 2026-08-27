import { describe, expect, it, vi } from 'vitest'
import { connectPrivacyWallet, type WalletConnectionDependencies } from '@/features/wallet/walletConnection'

function testDependencies(overrides: Partial<WalletConnectionDependencies> = {}): WalletConnectionDependencies {
  return {
    createAccount: vi.fn().mockResolvedValue({}),
    requestAccounts: vi.fn().mockResolvedValue(['0x123']),
    getPermissions: vi.fn().mockResolvedValue(['accounts']),
    requestChainId: vi.fn().mockResolvedValue('SN_SEPOLIA'),
    supportedWalletApi: vi.fn().mockResolvedValue(['0.10.3']),
    normalizeAddress: vi.fn((address: string) => address),
    subscribeWalletChanges: vi.fn(() => () => undefined),
    ...overrides,
  }
}

describe('connectPrivacyWallet', () => {
  it('uses the privacy-specific Wallet API capability query', async () => {
    const account = { address: '0x123' }
    const wallet = { name: 'Ready' }
    const provider = { name: 'Sepolia RPC' }
    const dependencies = testDependencies({ createAccount: vi.fn().mockResolvedValue(account) })

    const result = await connectPrivacyWallet(wallet, provider, dependencies)

    expect(dependencies.supportedWalletApi).toHaveBeenCalledWith(wallet)
    expect(result).toEqual({
      account,
      address: '0x123',
      chainId: 'SN_SEPOLIA',
      walletApiVersions: ['0.10.3'],
      supportsStrk20: true,
    })
  })

  it('fails closed when account permission is missing', async () => {
    const dependencies = testDependencies({ getPermissions: vi.fn().mockResolvedValue([]) })

    await expect(connectPrivacyWallet({}, {}, dependencies)).rejects.toThrow(
      'Wallet account permission was not granted',
    )
  })

  it('reports an unsupported wallet without reading private balances', async () => {
    const dependencies = testDependencies({
      requestChainId: vi.fn().mockResolvedValue('SN_MAIN'),
      supportedWalletApi: vi.fn().mockResolvedValue(['0.10.2']),
    })

    const result = await connectPrivacyWallet({}, {}, dependencies)
    expect(result.supportsStrk20).toBe(false)
    expect(Object.keys(dependencies)).not.toContain('strk20Balances')
  })
})
