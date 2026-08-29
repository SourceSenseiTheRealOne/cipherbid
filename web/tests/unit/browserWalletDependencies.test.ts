import { describe, expect, it, vi } from 'vitest'

const stubs = vi.hoisted(() => ({
  connect: vi.fn().mockResolvedValue({ address: '0x123' }),
  requestAccounts: vi.fn().mockResolvedValue(['0x123']),
  getPermissions: vi.fn().mockResolvedValue(['accounts']),
  requestChainId: vi.fn().mockResolvedValue('SN_SEPOLIA'),
  supportedWalletApi: vi.fn().mockResolvedValue(['0.10.3']),
  normalizeAddress: vi.fn((value: string) => value),
}))

vi.mock('starknet', () => ({
  WalletAccountV6: { connect: stubs.connect },
  walletV6: {
    requestAccounts: stubs.requestAccounts,
    getPermissions: stubs.getPermissions,
    requestChainId: stubs.requestChainId,
    supportedWalletApi: stubs.supportedWalletApi,
  },
  validateAndParseAddress: stubs.normalizeAddress,
}))

import { browserWalletDependencies } from '@/features/wallet/browserWalletDependencies'

describe('browserWalletDependencies', () => {
  it('delegates to the starter-proven WalletAccountV6 and wallet API methods', async () => {
    const provider = { rpc: 'sepolia' }
    const wallet = { name: 'Ready' }

    await expect(browserWalletDependencies.createAccount(provider, wallet)).resolves.toEqual({ address: '0x123' })
    await expect(browserWalletDependencies.requestAccounts(wallet)).resolves.toEqual(['0x123'])
    await expect(browserWalletDependencies.getPermissions(wallet)).resolves.toEqual(['accounts'])
    await expect(browserWalletDependencies.requestChainId(wallet)).resolves.toBe('SN_SEPOLIA')
    await expect(browserWalletDependencies.supportedWalletApi(wallet)).resolves.toEqual(['0.10.3'])
    expect(browserWalletDependencies.normalizeAddress('0x123')).toBe('0x123')

    expect(stubs.connect).toHaveBeenCalledWith(provider, wallet)
    expect(stubs.supportedWalletApi).toHaveBeenCalledWith(wallet)
  })

  it('uses the Wallet Standard change event to invalidate a changed wallet session', () => {
    type ChangeListener = (changes: {
      accounts?: readonly unknown[]
      chains?: readonly unknown[]
      features?: unknown
    }) => void
    const on = vi.fn<(event: 'change', listener: ChangeListener) => () => void>((_event, listener) => {
      listener({ accounts: [] })
      return () => undefined
    })
    const wallet = {
      name: 'Ready',
      features: {
        'standard:events': { on },
      },
    }
    const onChange = vi.fn()

    browserWalletDependencies.subscribeWalletChanges(wallet, onChange)

    expect(on).toHaveBeenCalledWith('change', expect.any(Function))
    expect(onChange).toHaveBeenCalledOnce()
  })
})
