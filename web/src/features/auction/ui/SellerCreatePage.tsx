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
    <main className="cipherbid-auction-page px-5 sm:px-8 lg:px-10">
      <div className="cb-shell max-w-5xl">
        <header className="cb-nav">
          <Link href="/" className="cb-wordmark">
            CipherBid
          </Link>
          <Link href="/" className="cb-nav-link">
            Back to auctions
          </Link>
        </header>
        <section className="cb-route-intro" aria-labelledby="create-auction-title">
          <p className="cb-kicker">Guaranteed onchain delivery</p>
          <h1 id="create-auction-title" className="cb-display">
            Create a private-bid NFT auction
          </h1>
          <p className="cb-copy mt-5 max-w-2xl text-base">
            The NFT moves into CipherBid custody atomically with immutable reserve, cap, deadlines, and seller claim
            handle.
          </p>
        </section>
        {deployment ? (
          <div className="cb-workbench">
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
          <p role="alert" className="cb-panel border-amber-300/20 p-4 text-amber-100">
            {error ?? 'Auction deployment is not configured.'}
          </p>
        )}
      </div>
    </main>
  )
}
