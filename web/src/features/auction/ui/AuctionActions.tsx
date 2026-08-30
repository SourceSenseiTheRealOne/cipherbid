'use client'

import { useEffect, useMemo, useState } from 'react'
import { RpcProvider } from 'starknet'
import type { PrivacyWalletConnection } from '@/features/wallet/walletConnection'
import { useWalletStore } from '@/features/wallet/walletStore'
import type { AuctionLiveViewModel } from '@/features/auction/ui/AuctionLivePage'
import { formatTokenAmount, parseTokenAmount } from '@/features/auction/auctionMath'
import { AtomicDeliveryReceipt, type VerifiedTransactionReceipt } from '@/features/auction/ui/AtomicDeliveryReceipt'
import type { DeploymentManifest } from '@/config/deployment'
import { verifiedReceiptsForAuction } from '@/config/verifiedMainnetLifecycle'
import { readAuctionSnapshot, type ChainReader } from '@/features/auction/auctionReader'
import {
  bindAcceptedIndex,
  generateBidderCredential,
  type BidderCredential,
  type SellerCredential,
} from '@/features/credentials/credentials'
import { decryptRecoveryBundle } from '@/features/credentials/recoveryBundle'
import { verifyTransactionTransition, type CipherBidEventName } from '@/features/transactions/receiptVerifier'
import { TransactionOrchestrator } from '@/features/transactions/transactionOrchestrator'
import {
  extractResolvedSellerOpenNoteId,
  runPrivateBidFlow,
  runPrivateClaimFlow,
  runRevealFlow,
  runSellerClaimFlow,
  runSettlementFlow,
  type PrivacyWallet,
} from '@/features/transactions/auctionTransactionFlows'

export type AuctionActionsProps = Readonly<{
  model: AuctionLiveViewModel
  connection: PrivacyWalletConnection | null
  onRefresh?: () => void
}>

function isHex(value: string): value is `0x${string}` {
  return /^0x[0-9a-fA-F]+$/.test(value)
}

function phase(model: AuctionLiveViewModel): 'bidding' | 'reveal' | 'settle' | 'settled' {
  if (model.state.settled) return 'settled'
  const now = BigInt(Math.floor(Date.now() / 1000))
  if (now < BigInt(model.biddingDeadline)) return 'bidding'
  if (now < BigInt(model.revealDeadline)) return 'reveal'
  return 'settle'
}

function publicManifest(model: AuctionLiveViewModel): DeploymentManifest {
  if (
    !isHex(model.auctionHouse) ||
    !isHex(model.auctionHouseClassHash) ||
    !isHex(model.strk20Pool) ||
    !isHex(model.paymentToken)
  ) {
    throw new Error('Live deployment data is malformed')
  }
  return {
    network: model.network,
    chainId: model.chainId,
    rpcUrl: model.rpcUrl,
    auctionHouse: model.auctionHouse,
    auctionHouseClassHash: model.auctionHouseClassHash,
    strk20Pool: model.strk20Pool,
    paymentToken: model.paymentToken,
  }
}

function download(serialized: string, bundleId: string, auctionId: string): void {
  const blob = new Blob([serialized], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `cipherbid-auction-${auctionId}-${bundleId.slice(2, 10)}.recovery.json`
  anchor.click()
  URL.revokeObjectURL(url)
}

export function AuctionActions({ model, connection, onRefresh }: AuctionActionsProps) {
  const refresh = onRefresh ?? (() => window.location.reload())
  const deployment = useMemo(() => publicManifest(model), [model])
  const provider = useMemo(() => new RpcProvider({ nodeUrl: deployment.rpcUrl }), [deployment.rpcUrl])
  const reader = useMemo<ChainReader>(
    () => ({
      callContract: (call) => provider.callContract({ ...call, calldata: call.calldata ? [...call.calldata] : [] }),
      getClassHashAt: (address) => provider.getClassHashAt(address),
    }),
    [provider],
  )
  const orchestrator = useMemo(() => new TransactionOrchestrator(), [])
  const [bidAmount, setBidAmount] = useState('')
  const [recipientOverrides, setRecipientOverrides] = useState<Record<string, string>>({})
  const [password, setPassword] = useState('')
  const [bidderCredential, setBidderCredential] = useState<BidderCredential | null>(null)
  const [sellerCredential, setSellerCredential] = useState<SellerCredential | null>(null)
  const [receipts, setReceipts] = useState<VerifiedTransactionReceipt[]>([])
  const [status, setStatus] = useState<string>('')
  const currentPhase = phase(model)
  const enabled = connection !== null && connection.supportsStrk20
  const displayedReceipts = useMemo(() => {
    const seen = new Set<string>()
    return [...verifiedReceiptsForAuction(model.network, model.auctionId), ...receipts].filter((receipt) => {
      if (seen.has(receipt.transactionHash)) return false
      seen.add(receipt.transactionHash)
      return true
    })
  }, [model.auctionId, model.network, receipts])

  useEffect(() => orchestrator.subscribe((state) => setStatus(state.status.replaceAll('_', ' '))), [orchestrator])

  const recipient = connection ? (recipientOverrides[connection.address] ?? connection.address) : ''

  function walletSnapshot() {
    const state = useWalletStore.getState()
    if (!state.address || !state.chainId) throw new Error('Wallet disconnected')
    return Promise.resolve({ address: state.address, chainId: state.chainId })
  }

  async function snapshot() {
    return readAuctionSnapshot(reader, deployment, BigInt(model.auctionId))
  }

  async function verify(
    transactionHash: string,
    expectedEvent: CipherBidEventName,
    requirePoolTouch: boolean,
    predicate: (value: Awaited<ReturnType<typeof readAuctionSnapshot>>) => boolean,
  ) {
    return verifyTransactionTransition({
      provider,
      manifest: deployment,
      transactionHash,
      expectedEvent,
      requirePoolTouch,
      readState: async () => predicate(await snapshot()),
    })
  }

  function recordReceipt(label: string, evidence: Awaited<ReturnType<typeof verifyTransactionTransition>>) {
    setReceipts((current) => [
      ...current,
      {
        label,
        transactionHash: evidence.transactionHash,
        finalityStatus: evidence.finalityStatus,
        blockNumber: evidence.blockNumber,
      },
    ])
  }

  async function recoveryReady(bundle: Readonly<{ serialized: string; bundleId: `0x${string}` }>) {
    download(bundle.serialized, bundle.bundleId, model.auctionId)
    if (!window.confirm('Confirm that the encrypted recovery file downloaded and can be stored safely.')) {
      throw new Error('Recovery export was not confirmed')
    }
  }

  async function submitBid() {
    if (!connection || !isHex(recipient)) return
    try {
      const credential = generateBidderCredential({
        network: model.network,
        chainId: BigInt(model.chainId),
        auctionHouse: BigInt(model.auctionHouse),
        auctionId: BigInt(model.auctionId),
        amount: (() => {
          const amount = parseTokenAmount(bidAmount, 18, { max: BigInt(model.cap) })
          if (amount === 0n) throw new Error('Bid amount must be positive')
          return amount
        })(),
        assetRecipient: BigInt(recipient),
      })
      let acceptedIndex = -1
      const result = await runPrivateBidFlow({
        orchestrator,
        wallet: connection.account as PrivacyWallet,
        expectedWallet: { address: connection.address, chainId: connection.chainId },
        getWalletSnapshot: walletSnapshot,
        credential,
        recoveryPassword: password,
        onRecoveryReady: recoveryReady,
        paymentToken: deployment.paymentToken,
        cap: BigInt(model.cap),
        verify: (hash) =>
          verify(hash, 'BidCommitted', true, (fresh) => {
            acceptedIndex = fresh.bids.findIndex((bid) => bid.commitment === credential.commitment)
            return acceptedIndex >= 0
          }),
      })
      recordReceipt('Private bid', result.evidence)
      setBidderCredential(bindAcceptedIndex(credential, acceptedIndex))
      setStatus('private bid confirmed')
      refresh()
    } catch {
      setStatus('private bid failed or remains unconfirmed')
    }
  }

  async function importRecovery(file: File | undefined) {
    if (!file) return
    try {
      const credentials = await decryptRecoveryBundle(await file.text(), password)
      const matching = credentials.find(
        (credential) =>
          credential.network === model.network &&
          credential.chainId === BigInt(model.chainId) &&
          credential.auctionId === BigInt(model.auctionId) &&
          credential.auctionHouse === BigInt(model.auctionHouse),
      )
      if (!matching) throw new Error('No matching credential')
      if (matching.role === 'seller') {
        setSellerCredential(matching)
      } else {
        const index = model.bids.findIndex((bid) => BigInt(bid.commitment) === matching.commitment)
        setBidderCredential(index >= 0 ? bindAcceptedIndex(matching, index) : matching)
      }
      setStatus(`${matching.role} recovery imported`)
    } catch {
      setStatus('recovery import failed')
    }
  }

  async function reveal() {
    if (!connection || !bidderCredential) return
    try {
      const evidence = await runRevealFlow({
        orchestrator,
        wallet: connection.account as PrivacyWallet,
        expectedWallet: { address: connection.address, chainId: connection.chainId },
        getWalletSnapshot: walletSnapshot,
        credential: bidderCredential,
        verify: (hash) =>
          verify(hash, 'BidRevealed', false, (fresh) => {
            const index = bidderCredential.acceptedIndex
            return index !== undefined && fresh.bids[index]?.revealed === true
          }),
      })
      recordReceipt('Bid reveal', evidence)
      setStatus('reveal confirmed')
      refresh()
    } catch {
      setStatus('reveal failed or remains unconfirmed')
    }
  }

  async function settle() {
    if (!connection) return
    try {
      const evidence = await runSettlementFlow({
        orchestrator,
        wallet: connection.account as PrivacyWallet,
        expectedWallet: { address: connection.address, chainId: connection.chainId },
        getWalletSnapshot: walletSnapshot,
        auctionHouse: deployment.auctionHouse,
        auctionId: BigInt(model.auctionId),
        verify: (hash) => verify(hash, 'AuctionSettled', false, (fresh) => fresh.state.settled && fresh.custodyValid),
      })
      recordReceipt('Settlement', evidence)
      setStatus('settlement confirmed')
      refresh()
    } catch {
      setStatus('settlement failed or remains unconfirmed')
    }
  }

  async function bidderClaim() {
    if (!connection || !bidderCredential || bidderCredential.acceptedIndex === undefined) return
    const winner = model.state.sold && bidderCredential.acceptedIndex === model.state.winnerIndex
    try {
      const evidence = await runPrivateClaimFlow({
        orchestrator,
        wallet: connection.account as PrivacyWallet,
        expectedWallet: { address: connection.address, chainId: connection.chainId },
        getWalletSnapshot: walletSnapshot,
        kind: winner ? 'winner_surplus' : 'loser_refund',
        credential: bidderCredential,
        paymentToken: deployment.paymentToken,
        recipient: connection.address,
        verify: (hash) =>
          verify(
            hash,
            winner ? 'WinnerSurplusClaimed' : 'LoserRefundClaimed',
            true,
            (asyncSnapshot) => asyncSnapshot.state.settled,
          ),
      })
      recordReceipt(winner ? 'Winner surplus' : 'Loser refund', evidence)
      setStatus('private bidder claim confirmed')
      refresh()
    } catch {
      setStatus('private bidder claim failed or remains unconfirmed')
    }
  }

  async function sellerClaim() {
    if (!connection || !sellerCredential) return
    try {
      const result = await runSellerClaimFlow({
        orchestrator,
        wallet: connection.account as Required<PrivacyWallet>,
        expectedWallet: { address: connection.address, chainId: connection.chainId },
        getWalletSnapshot: walletSnapshot,
        credential: sellerCredential,
        paymentToken: deployment.paymentToken,
        recipient: connection.address,
        extractOpenNoteId: (prepared) =>
          extractResolvedSellerOpenNoteId(prepared, sellerCredential, deployment.strk20Pool),
        verifyAuthorization: (hash) =>
          verify(hash, 'SellerProceedsAuthorized', false, (fresh) => fresh.state.sellerAuthorizedNote > 0n),
        verifyClaim: (hash) => verify(hash, 'SellerProceedsClaimed', true, (fresh) => fresh.state.sellerClaimConsumed),
      })
      recordReceipt('Seller authorization', result.authorizationEvidence)
      recordReceipt('Seller proceeds', result.claimEvidence)
      setStatus('private seller proceeds confirmed')
      refresh()
    } catch {
      setStatus('private seller claim failed or remains unconfirmed')
    }
  }

  return (
    <section
      aria-labelledby="auction-actions-title"
      className="rounded-2xl border border-white/10 bg-[#111217] p-5 sm:p-6"
    >
      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#a8b1ff]">Wallet actions</p>
      <h2 id="auction-actions-title" className="mt-2 text-2xl font-semibold">
        Transact privately
      </h2>
      {!enabled ? <p className="mt-4 text-sm text-[#9ba3af]">Connect a compatible wallet to transact.</p> : null}

      <div className="mt-5 space-y-4">
        <label className="block text-sm font-medium" htmlFor="live-bid-amount">
          Private bid amount
        </label>
        <input
          id="live-bid-amount"
          aria-label="Private bid amount"
          inputMode="decimal"
          placeholder="e.g. 3.5"
          disabled={!enabled || currentPhase !== 'bidding'}
          value={bidAmount}
          onChange={(event) => setBidAmount(event.target.value)}
          className="min-h-12 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 outline-none focus:border-[#a8b1ff] disabled:opacity-50"
        />
        <p className="text-xs leading-5 text-[#858b98]">
          Enter any positive bid up to {formatTokenAmount(BigInt(model.cap), 18)} STRK. Bids below the{' '}
          {formatTokenAmount(BigInt(model.reservePrice), 18)} STRK reserve cannot win.
        </p>
        <label className="block text-sm font-medium" htmlFor="live-recipient">
          NFT recipient
        </label>
        <input
          id="live-recipient"
          value={recipient}
          disabled={!enabled || currentPhase !== 'bidding'}
          onChange={(event) => {
            if (!connection) return
            setRecipientOverrides((current) => ({ ...current, [connection.address]: event.target.value }))
          }}
          className="min-h-12 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 font-mono text-xs outline-none focus:border-[#a8b1ff] disabled:opacity-50"
        />
        <label className="block text-sm font-medium" htmlFor="recovery-password">
          Recovery password
        </label>
        <input
          id="recovery-password"
          aria-label="Recovery password"
          type="password"
          autoComplete="new-password"
          disabled={!enabled}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="min-h-12 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 outline-none focus:border-[#a8b1ff] disabled:opacity-50"
        />
        <label className="block text-sm font-medium" htmlFor="recovery-import">
          Import encrypted recovery bundle
        </label>
        <input
          id="recovery-import"
          aria-label="Import encrypted recovery bundle"
          type="file"
          accept="application/json,.json"
          disabled={!enabled || password.length < 12}
          onChange={(event) => void importRecovery(event.target.files?.[0])}
          className="block min-h-11 w-full text-xs text-[#9ba3af] file:mr-3 file:min-h-11 file:rounded-lg file:border-0 file:bg-white/10 file:px-4 file:text-white"
        />
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          disabled={!enabled || currentPhase !== 'bidding'}
          onClick={() => void submitBid()}
          className="min-h-12 rounded-xl bg-[#6654d9] px-4 font-semibold disabled:cursor-not-allowed disabled:opacity-45"
        >
          Submit private bid
        </button>
        <button
          type="button"
          disabled={!enabled || currentPhase !== 'reveal' || bidderCredential?.acceptedIndex === undefined}
          onClick={() => void reveal()}
          className="min-h-12 rounded-xl border border-white/10 bg-white/[0.04] px-4 font-semibold disabled:cursor-not-allowed disabled:opacity-45"
        >
          Reveal bid
        </button>
        <button
          type="button"
          disabled={!enabled || currentPhase !== 'settle'}
          onClick={() => void settle()}
          className="min-h-12 rounded-xl border border-white/10 bg-white/[0.04] px-4 font-semibold disabled:cursor-not-allowed disabled:opacity-45"
        >
          Settle auction
        </button>
        <button
          type="button"
          disabled={!enabled || currentPhase !== 'settled' || !bidderCredential}
          onClick={() => void bidderClaim()}
          className="min-h-12 rounded-xl border border-white/10 bg-white/[0.04] px-4 font-semibold disabled:cursor-not-allowed disabled:opacity-45"
        >
          Claim bidder funds
        </button>
        <button
          type="button"
          disabled={
            !enabled ||
            currentPhase !== 'settled' ||
            !sellerCredential ||
            BigInt(connection?.address ?? '0x0') !== BigInt(model.seller)
          }
          onClick={() => void sellerClaim()}
          className="min-h-12 rounded-xl border border-[#3bc478]/20 bg-[#3bc478]/10 px-4 font-semibold text-[#aee5c1] disabled:cursor-not-allowed disabled:opacity-45 sm:col-span-2"
        >
          Claim seller proceeds privately
        </button>
      </div>
      <p role="status" className="mt-4 min-h-6 text-sm text-[#a8b1ff]">
        {status}
      </p>
      <p className="mt-2 text-xs leading-5 text-[#858b98]">
        Recovery files are encrypted locally. CipherBid does not store credentials in localStorage or send them to a
        backend.
      </p>
      <div className="mt-6">
        <AtomicDeliveryReceipt
          settlement={{
            network: model.network,
            settled: model.state.settled,
            sold: model.state.sold,
            auctionId: model.auctionId,
            nftContract: model.nftContract,
            tokenId: model.tokenId,
            nftOwner: model.nftOwner,
            winnerRecipient: model.state.winnerRecipient,
            clearingPrice: model.state.clearingPrice,
            sellerEntitlement: model.state.sellerEntitlement,
            sellerClaimConsumed: model.state.sellerClaimConsumed,
            custodyValid: model.custodyValid,
          }}
          receipts={displayedReceipts}
        />
      </div>
    </section>
  )
}
