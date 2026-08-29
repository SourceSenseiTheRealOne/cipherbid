import { afterEach, describe, expect, it } from 'vitest'
import { useWalletStore } from '@/features/wallet/walletStore'

afterEach(() => {
  useWalletStore.getState().disconnect()
})

describe('walletStore', () => {
  it('stores only public connection state and clears it on disconnect', () => {
    const state = useWalletStore.getState()
    const attempt = state.beginConnection()
    expect(useWalletStore.getState().status).toBe('connecting')

    state.completeConnection(attempt, {
      walletName: 'Ready',
      address: '0x123',
      chainId: 'SN_SEPOLIA',
      walletApiVersions: ['0.10.3'],
      supportsStrk20: true,
    })

    expect(useWalletStore.getState()).toMatchObject({
      status: 'connected',
      address: '0x123',
      chainId: 'SN_SEPOLIA',
      walletApiVersions: ['0.10.3'],
      supportsStrk20: true,
      error: null,
    })

    useWalletStore.getState().disconnect()
    expect(useWalletStore.getState()).toMatchObject({
      status: 'disconnected',
      address: null,
      chainId: null,
      walletApiVersions: [],
      supportsStrk20: false,
      error: null,
    })
  })

  it('preserves a controlled public error without storing an exception object', () => {
    const attempt = useWalletStore.getState().beginConnection()
    useWalletStore.getState().failConnection(attempt, 'Wallet API 0.10.3 is required')
    expect(useWalletStore.getState()).toMatchObject({
      status: 'error',
      error: 'Wallet API 0.10.3 is required',
    })
  })

  it('ignores a stale connection completion after the user disconnects', () => {
    const attempt = useWalletStore.getState().beginConnection()
    useWalletStore.getState().disconnect()

    expect(
      useWalletStore.getState().completeConnection(attempt, {
        walletName: 'Ready',
        address: '0x123',
        chainId: 'SN_SEPOLIA',
        walletApiVersions: ['0.10.3'],
        supportsStrk20: true,
      }),
    ).toBe(false)
    expect(useWalletStore.getState().status).toBe('disconnected')
  })
})
