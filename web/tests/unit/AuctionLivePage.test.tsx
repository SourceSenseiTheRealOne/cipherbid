import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { AuctionLivePage, type AuctionLiveViewModel } from '@/features/auction/ui/AuctionLivePage'

const model: AuctionLiveViewModel = {
  network: 'sepolia',
  chainId: '0x534e5f5345504f4c4941',
  rpcUrl: 'https://rpc.example/sepolia',
  auctionHouse: '0x123',
  auctionHouseClassHash: '0x321',
  strk20Pool: '0x456',
  paymentToken: '0x654',
  auctionId: '7',
  seller: '0x777',
  sellerClaimHandle: '0xabc',
  nftContract: '0x999',
  tokenId: '99',
  reservePrice: '2000000000000000000',
  cap: '5000000000000000000',
  biddingDeadline: '100',
  revealDeadline: '200',
  bidderLimit: 2,
  nftOwner: '0x888',
  custodyValid: true,
  state: {
    settled: true,
    sold: true,
    winnerIndex: 1,
    winnerCommitment: '0x222',
    winnerRecipient: '0x888',
    clearingPrice: '3000000000000000000',
    sellerEntitlement: '3000000000000000000',
    sellerAuthorizedNote: '0x903',
    sellerClaimConsumed: false,
  },
  bids: [
    {
      commitment: '0x111',
      claimHandle: '0xa11',
      revealed: true,
      amount: '3000000000000000000',
      assetRecipient: '0x887',
    },
    {
      commitment: '0x222',
      claimHandle: '0xa22',
      revealed: true,
      amount: '4000000000000000000',
      assetRecipient: '0x888',
    },
  ],
}

describe('AuctionLivePage', () => {
  it('renders exact returned auction, settlement, bid, and custody data', () => {
    render(<AuctionLivePage model={model} />)
    expect(screen.getByRole('heading', { level: 1, name: 'Auction #7' })).toBeInTheDocument()
    expect(screen.getAllByText('Sold')).not.toHaveLength(0)
    const facts = screen.getByRole('region', { name: 'Live auction facts' })
    expect(within(facts).getByText('2 STRK')).toBeInTheDocument()
    expect(within(facts).getByText('5 STRK')).toBeInTheDocument()
    expect(within(facts).getByText('1970-01-01 00:01:40 UTC')).toBeInTheDocument()
    expect(within(facts).getByText('1970-01-01 00:03:20 UTC')).toBeInTheDocument()
    expect(screen.getByText('Custody verified')).toBeInTheDocument()
    expect(screen.getByText('0x888', { selector: 'code' })).toBeInTheDocument()
    expect(screen.getByRole('row', { name: /0x222.*4 STRK.*Winner/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Connect a privacy-capable wallet' })).toBeInTheDocument()
  })

  it('renders an honest unavailable state without fake auction values', () => {
    render(<AuctionLivePage error="Auction deployment is not configured" auctionId="7" />)
    expect(screen.getByRole('alert')).toHaveTextContent('Auction deployment is not configured')
    expect(screen.queryByText('2 STRK')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /submit/i })).not.toBeInTheDocument()
  })
})
