'use client'

import { create } from 'zustand'

type WalletStatus = 'disconnected' | 'connecting' | 'connected' | 'error'

export type PublicWalletConnection = Readonly<{
  walletName: string
  address: `0x${string}`
  chainId: string
  walletApiVersions: readonly string[]
  supportsStrk20: boolean
}>

type WalletState = {
  status: WalletStatus
  connectionAttempt: number
  walletName: string | null
  address: `0x${string}` | null
  chainId: string | null
  walletApiVersions: readonly string[]
  supportsStrk20: boolean
  error: string | null
  beginConnection: () => number
  completeConnection: (attempt: number, connection: PublicWalletConnection) => boolean
  failConnection: (attempt: number, message: string) => boolean
  invalidateConnection: (message: string) => void
  disconnect: () => void
}

function disconnectedState(connectionAttempt: number) {
  return {
    status: 'disconnected' as const,
    connectionAttempt,
    walletName: null,
    address: null,
    chainId: null,
    walletApiVersions: [] as readonly string[],
    supportsStrk20: false,
    error: null,
  }
}

/**
 * Public, non-persisted wallet state adapted from the MIT STRK20 starter kit.
 * Wallet/key objects and private balances are deliberately excluded.
 */
export const useWalletStore = create<WalletState>((set, get) => ({
  ...disconnectedState(0),
  beginConnection: () => {
    const attempt = get().connectionAttempt + 1
    set({ ...disconnectedState(attempt), status: 'connecting' })
    return attempt
  },
  completeConnection: (attempt, connection) => {
    if (get().connectionAttempt !== attempt) return false
    set({
      status: 'connected',
      connectionAttempt: attempt,
      walletName: connection.walletName,
      address: connection.address,
      chainId: connection.chainId,
      walletApiVersions: [...connection.walletApiVersions],
      supportsStrk20: connection.supportsStrk20,
      error: null,
    })
    return true
  },
  failConnection: (attempt, message) => {
    if (get().connectionAttempt !== attempt) return false
    set({ ...disconnectedState(attempt), status: 'error', error: message })
    return true
  },
  invalidateConnection: (message) => {
    const attempt = get().connectionAttempt + 1
    set({ ...disconnectedState(attempt), status: 'error', error: message })
  },
  disconnect: () => set(disconnectedState(get().connectionAttempt + 1)),
}))
