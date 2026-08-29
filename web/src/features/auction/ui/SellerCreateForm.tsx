'use client'

import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { RpcProvider } from 'starknet'
import type { DeploymentManifest } from '@/config/deployment'
import type { PrivacyWalletConnection } from '@/features/wallet/walletConnection'
import { useWalletStore } from '@/features/wallet/walletStore'
import { generateSellerCredential } from '@/features/credentials/credentials'
import { readAuctionSnapshot, type ChainReader } from '@/features/auction/auctionReader'
import { buildAuctionHref } from '@/features/auction/auctionRoute'
import { verifyTransactionTransition } from '@/features/transactions/receiptVerifier'
import { TransactionOrchestrator } from '@/features/transactions/transactionOrchestrator'
import { runSellerCreationFlow, type StandardWallet } from '@/features/transactions/auctionTransactionFlows'

export type SellerCreateDeployment = DeploymentManifest

export type SellerCreateFormProps = Readonly<{
  deployment: SellerCreateDeployment
  connection: PrivacyWalletConnection | null
  onCreated?: (auctionId: bigint) => void
}>

function download(serialized: string, bundleId: string, auctionId: bigint): void {
  const blob = new Blob([serialized], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `cipherbid-seller-${auctionId}-${bundleId.slice(2, 10)}.recovery.json`
  anchor.click()
  URL.revokeObjectURL(url)
}

function unixTimestamp(value: string, label: string): bigint {
  const milliseconds = new Date(value).getTime()
  if (!Number.isFinite(milliseconds)) throw new Error(`${label} is invalid`)
  return BigInt(Math.floor(milliseconds / 1000))
}

export function SellerCreateForm({ deployment, connection, onCreated }: SellerCreateFormProps) {
  const provider = useMemo(() => new RpcProvider({ nodeUrl: deployment.rpcUrl }), [deployment.rpcUrl])
  const reader = useMemo<ChainReader>(
    () => ({
      callContract: (call) => provider.callContract({ ...call, calldata: call.calldata ? [...call.calldata] : [] }),
      getClassHashAt: (address) => provider.getClassHashAt(address),
    }),
    [provider],
  )
  const orchestrator = useMemo(() => new TransactionOrchestrator(), [])
  const [auctionId, setAuctionId] = useState('')
  const [nftContract, setNftContract] = useState('')
  const [tokenId, setTokenId] = useState('')
  const [reservePrice, setReservePrice] = useState('')
  const [cap, setCap] = useState('')
  const [biddingDeadline, setBiddingDeadline] = useState('')
  const [revealDeadline, setRevealDeadline] = useState('')
  const [bidderLimit, setBidderLimit] = useState('2')
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState('')
  const [createdAuctionId, setCreatedAuctionId] = useState<bigint | null>(null)
  const enabled = connection !== null && connection.supportsStrk20

  useEffect(() => orchestrator.subscribe((state) => setStatus(state.status.replaceAll('_', ' '))), [orchestrator])

  function walletSnapshot() {
    const state = useWalletStore.getState()
    if (!state.address || !state.chainId) throw new Error('Wallet disconnected')
    return Promise.resolve({ address: state.address, chainId: state.chainId })
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!connection || !/^0x[0-9a-fA-F]+$/.test(nftContract)) return
    try {
      const id = BigInt(auctionId)
      const credential = generateSellerCredential({
        network: deployment.network,
        chainId: BigInt(deployment.chainId),
        auctionHouse: BigInt(deployment.auctionHouse),
        auctionId: id,
      })
      const bidDeadline = unixTimestamp(biddingDeadline, 'Bidding deadline')
      const revealEnd = unixTimestamp(revealDeadline, 'Reveal deadline')
      await runSellerCreationFlow({
        orchestrator,
        wallet: connection.account as StandardWallet,
        expectedWallet: { address: connection.address, chainId: connection.chainId },
        getWalletSnapshot: walletSnapshot,
        credential,
        recoveryPassword: password,
        onRecoveryReady: async (bundle) => {
          download(bundle.serialized, bundle.bundleId, id)
          if (!window.confirm('Confirm that the encrypted seller recovery file downloaded and can be stored safely.')) {
            throw new Error('Seller recovery was not confirmed')
          }
        },
        nftContract: nftContract as `0x${string}`,
        tokenId: BigInt(tokenId),
        reservePrice: BigInt(reservePrice),
        cap: BigInt(cap),
        biddingDeadline: bidDeadline,
        revealDeadline: revealEnd,
        bidderLimit: BigInt(bidderLimit),
        verify: (transactionHash) =>
          verifyTransactionTransition({
            provider,
            manifest: deployment,
            transactionHash,
            expectedEvent: 'AuctionCreated',
            requirePoolTouch: false,
            readState: async () => {
              const snapshot = await readAuctionSnapshot(reader, deployment, id)
              return snapshot.config.seller === connection.address && snapshot.custodyValid
            },
          }),
      })
      setCreatedAuctionId(id)
      setStatus('auction created with NFT in custody')
      onCreated?.(id)
    } catch {
      setStatus('auction creation failed or remains unconfirmed')
    }
  }

  const fieldClass =
    'min-h-12 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 outline-none focus:border-[#a8b1ff] disabled:cursor-not-allowed disabled:opacity-50'

  return (
    <form
      onSubmit={(event) => void submit(event)}
      className="rounded-2xl border border-white/10 bg-[#111217] p-5 sm:p-7"
    >
      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#a8b1ff]">Seller workflow</p>
      <h2 className="mt-2 text-2xl font-semibold">Create auction</h2>
      {!enabled ? (
        <p className="mt-4 text-sm text-[#9ba3af]">Connect a compatible wallet to create an auction.</p>
      ) : null}
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {[
          ['Auction ID', auctionId, setAuctionId, 'numeric'],
          ['NFT contract address', nftContract, setNftContract, 'text'],
          ['NFT token ID', tokenId, setTokenId, 'numeric'],
          ['Reserve price', reservePrice, setReservePrice, 'decimal'],
          ['Uniform collateral cap', cap, setCap, 'decimal'],
          ['Bidding deadline', biddingDeadline, setBiddingDeadline, 'datetime-local'],
          ['Reveal deadline', revealDeadline, setRevealDeadline, 'datetime-local'],
          ['Bidder limit', bidderLimit, setBidderLimit, 'numeric'],
        ].map(([label, value, setter, kind]) => {
          const id = `seller-${String(label).toLowerCase().replaceAll(' ', '-')}`
          return (
            <label key={String(label)} htmlFor={id} className="block text-sm font-medium">
              {String(label)}
              <input
                id={id}
                aria-label={String(label)}
                type={kind === 'datetime-local' ? 'datetime-local' : 'text'}
                inputMode={kind === 'numeric' || kind === 'decimal' ? kind : undefined}
                disabled={!enabled}
                value={String(value)}
                onChange={(event) => (setter as (value: string) => void)(event.target.value)}
                className={`${fieldClass} mt-2`}
              />
            </label>
          )
        })}
        <label htmlFor="seller-recovery-password" className="block text-sm font-medium sm:col-span-2">
          Recovery password
          <input
            id="seller-recovery-password"
            aria-label="Recovery password"
            type="password"
            autoComplete="new-password"
            disabled={!enabled}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className={`${fieldClass} mt-2`}
          />
        </label>
      </div>
      <p className="mt-5 rounded-xl border border-[#7170ff]/20 bg-[#7170ff]/10 p-4 text-sm leading-6 text-[#d7dcff]">
        Encrypted recovery is downloaded and import-verified before the wallet receives the NFT approval and auction
        creation request.
      </p>
      <button
        type="submit"
        disabled={!enabled}
        className="mt-5 min-h-12 w-full rounded-xl bg-[#6654d9] px-5 font-semibold disabled:cursor-not-allowed disabled:opacity-45"
      >
        Create auction with NFT custody
      </button>
      <p role="status" className="mt-4 min-h-6 text-sm text-[#a8b1ff]">
        {status}
      </p>
      {createdAuctionId !== null ? (
        <a
          href={buildAuctionHref(createdAuctionId.toString())}
          className="mt-2 inline-flex min-h-11 items-center font-semibold text-[#aee5c1] underline underline-offset-4"
        >
          Open auction #{createdAuctionId.toString()}
        </a>
      ) : null}
    </form>
  )
}
