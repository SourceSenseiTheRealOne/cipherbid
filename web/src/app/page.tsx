'use client'

import { useState } from 'react'
import { WalletConnectPanel } from '@/features/wallet/WalletConnectPanel'

export default function Home() {
  const [walletConnected, setWalletConnected] = useState(false)

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-8 px-6 py-16">
      <header className="space-y-3">
        <p className="font-mono text-sm uppercase tracking-[0.18em] text-violet-700">Starknet Sepolia</p>
        <h1 className="text-4xl font-semibold tracking-tight">CipherBid feasibility gate</h1>
        <p className="max-w-2xl text-slate-600">
          Connect a Wallet API 0.10.3 wallet. Keys, viewing keys, shielded balances, and raw wallet errors never enter
          application state.
        </p>
      </header>
      <div className="rounded-2xl border border-slate-200 p-6 shadow-sm">
        <WalletConnectPanel
          onConnected={() => setWalletConnected(true)}
          onDisconnected={() => setWalletConnected(false)}
        />
      </div>
      {walletConnected ? (
        <p role="status" className="rounded-xl bg-amber-50 p-4 text-amber-950">
          Wallet capability verified. Bid preparation remains disabled until the live STRK20 route spike and auction
          claim paths are verified.
        </p>
      ) : null}
    </main>
  )
}
