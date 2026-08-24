'use client'

import { create } from 'zustand'

type WalletStatus = 'disconnected' | 'connecting' | 'connected' | 'error'

export type PublicWalletConnection = Readonly<{
  address: `0x${string}`
  chainId: string
  walletApiVersions: readonly string[]
  supportsStrk20: boolean
}>

type WalletState = {
  status: WalletStatus
  address: `0x${string}` | null
  chainId: string | null
  walletApiVersions: readonly string[]
  supportsStrk20: boolean
  error: string | null
  beginConnection: () => void
  completeConnection: (connection: PublicWalletConnection) => void
  failConnection: (message: string) => void
  disconnect: () => void
}

const disconnectedState = {
  status: 'disconnected' as const,
  address: null,
  chainId: null,
  walletApiVersions: [] as readonly string[],
  supportsStrk20: false,
  error: null,
}

/**
 * Public, non-persisted wallet state adapted from the MIT STRK20 starter kit.
 * Wallet/key objects and private balances are deliberately excluded.
 */
export const useWalletStore = create<WalletState>((set) => ({
  ...disconnectedState,
  beginConnection: () => set({ ...disconnectedState, status: 'connecting' }),
  completeConnection: (connection) =>
    set({
      status: 'connected',
      address: connection.address,
      chainId: connection.chainId,
      walletApiVersions: [...connection.walletApiVersions],
      supportsStrk20: connection.supportsStrk20,
      error: null,
    }),
  failConnection: (message) => set({ ...disconnectedState, status: 'error', error: message }),
  disconnect: () => set(disconnectedState),
}))
