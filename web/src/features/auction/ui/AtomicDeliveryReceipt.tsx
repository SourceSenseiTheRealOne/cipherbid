import { formatTokenAmount } from '@/features/auction/auctionMath'

export type VerifiedTransactionReceipt = Readonly<{
  label: string
  transactionHash: string
  finalityStatus: 'ACCEPTED_ON_L2' | 'ACCEPTED_ON_L1'
  blockNumber: number
}>

export type AtomicSettlementModel = Readonly<{
  network: 'sepolia' | 'mainnet'
  settled: boolean
  sold: boolean
  auctionId: string
  nftContract: string
  tokenId: string
  nftOwner: string
  winnerRecipient: string
  clearingPrice: string
  sellerEntitlement: string
  custodyValid: boolean
}>

export function AtomicDeliveryReceipt({
  settlement,
  receipts,
}: Readonly<{ settlement: AtomicSettlementModel; receipts: readonly VerifiedTransactionReceipt[] }>) {
  const explorer = settlement.network === 'mainnet' ? 'https://starkscan.co' : 'https://sepolia.starkscan.co'
  const deliveryVerified =
    settlement.settled &&
    settlement.sold &&
    settlement.custodyValid &&
    BigInt(settlement.nftOwner) === BigInt(settlement.winnerRecipient)
  const strk = (value: string) => `${formatTokenAmount(BigInt(value), 18)} STRK`

  return (
    <section
      aria-labelledby="atomic-receipt-title"
      className="rounded-2xl border border-white/10 bg-[#111217] p-5 sm:p-6"
    >
      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#a8b1ff]">Public execution truth</p>
      <h2 id="atomic-receipt-title" className="mt-2 text-2xl font-semibold">
        Atomic Delivery Receipt
      </h2>
      <p className={`mt-4 text-sm font-semibold ${deliveryVerified ? 'text-[#aee5c1]' : 'text-[#d7dcff]'}`}>
        {deliveryVerified
          ? 'Delivery verified'
          : settlement.settled
            ? 'No-sale NFT return verified'
            : 'Settlement pending'}
      </p>

      <dl className="mt-5 divide-y divide-white/[0.08] border-y border-white/[0.08] text-sm">
        <div className="grid gap-1 py-3 sm:grid-cols-[9rem_1fr]">
          <dt className="text-[#858b98]">Auction</dt>
          <dd>#{settlement.auctionId}</dd>
        </div>
        <div className="grid gap-1 py-3 sm:grid-cols-[9rem_1fr]">
          <dt className="text-[#858b98]">NFT</dt>
          <dd className="break-all font-mono text-xs">
            {settlement.nftContract} / {settlement.tokenId}
          </dd>
        </div>
        <div className="grid gap-1 py-3 sm:grid-cols-[9rem_1fr]">
          <dt className="text-[#858b98]">NFT owner</dt>
          <dd className="break-all font-mono text-xs">{settlement.nftOwner}</dd>
        </div>
        <div className="grid gap-1 py-3 sm:grid-cols-[9rem_1fr]">
          <dt className="text-[#858b98]">Clearing price</dt>
          <dd className="font-semibold">
            {settlement.settled && settlement.sold ? strk(settlement.clearingPrice) : '—'}
          </dd>
        </div>
        <div className="grid gap-1 py-3 sm:grid-cols-[9rem_1fr]">
          <dt className="text-[#858b98]">Seller allocation</dt>
          <dd>
            {settlement.settled && settlement.sold ? `Seller receives ${strk(settlement.sellerEntitlement)}` : '—'}
          </dd>
        </div>
      </dl>

      <h3 className="mt-6 text-sm font-semibold">Verified transaction receipts</h3>
      {receipts.length === 0 ? (
        <p className="mt-3 text-sm text-[#858b98]">No verified transaction receipts yet.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {receipts.map((receipt) => (
            <li key={`${receipt.label}-${receipt.transactionHash}`}>
              <a
                href={`${explorer}/tx/${receipt.transactionHash}`}
                target="_blank"
                rel="noreferrer"
                aria-label={`${receipt.label} ${receipt.transactionHash}`}
                className="flex min-h-11 flex-wrap items-center justify-between gap-2 rounded-lg border border-white/[0.08] bg-white/[0.025] px-3 text-sm hover:border-[#a8b1ff]/40"
              >
                <span className="font-semibold">{receipt.label}</span>
                <span className="font-mono text-xs text-[#9ba3af]">
                  {receipt.transactionHash} · block {receipt.blockNumber}
                </span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
