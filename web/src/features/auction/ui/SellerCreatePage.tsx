'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { RpcProvider } from 'starknet'
import type { PrivacyWalletConnection } from '@/features/wallet/walletConnection'
import { WalletConnectPanel } from '@/features/wallet/WalletConnectPanel'
import { SellerCreateForm, type SellerCreateDeployment } from '@/features/auction/ui/SellerCreateForm'

export function SellerCreatePage({
  deployment,
  error,
}: Readonly<{ deployment?: SellerCreateDeployment; error?: string }>) {
  const [connection, setConnection] = useState<PrivacyWalletConnection | null>(null)
  const provider = useMemo(
    () => (deployment ? new RpcProvider({ nodeUrl: deployment.rpcUrl }) : undefined),
    [deployment],
  )

  return (
    <main className="cipherbid-auction-page min-h-screen bg-[#08090a] px-5 py-10 text-[#f7f8f8] sm:px-8 lg:px-10">
      <div className="mx-auto max-w-5xl">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.08] pb-6">
          <Link href="/" className="text-lg font-semibold tracking-[-0.04em]">CipherBid</Link>
          <Link href="/" className="inline-flex min-h-11 items-center text-sm text-[#9ba3af] hover:text-white">Back to auctions</Link>
        </header>
        <section className="py-10 sm:py-14" aria-labelledby="create-auction-title">
          <p className="font-mono text-xs uppercase tracking-[0.16em] text-[#a8b1ff]">Guaranteed onchain delivery</p>
          <h1 id="create-auction-title" className="mt-3 max-w-3xl text-4xl font-semibold tracking-[-0.055em] sm:text-6xl">Create a private-bid NFT auction</h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-[#9ba3af]">The NFT moves into CipherBid custody atomically with immutable reserve, cap, deadlines, and seller claim handle.</p>
        </section>
        {deployment ? (
          <div className="grid gap-6 lg:grid-cols-[20rem_minmax(0,1fr)] lg:items-start">
            <WalletConnectPanel
              provider={provider}
              expectedChainId={deployment.chainId}
              expectedNetworkLabel={deployment.network === 'mainnet' ? 'Starknet mainnet' : 'Starknet Sepolia'}
              onConnected={setConnection}
              onDisconnected={() => setConnection(null)}
            />
            <SellerCreateForm deployment={deployment} connection={connection} />
          </div>
        ) : (
          <p role="alert" className="rounded-xl border border-amber-300/20 bg-amber-300/10 p-4 text-amber-100">
            {error ?? 'Auction deployment is not configured.'}
          </p>
        )}
      </div>
    </main>
  )
}
