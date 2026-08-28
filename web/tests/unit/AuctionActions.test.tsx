import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { AuctionActions } from '@/features/auction/ui/AuctionActions'
import type { AuctionLiveViewModel } from '@/features/auction/ui/AuctionLivePage'

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
  biddingDeadline: `${Math.floor(Date.now() / 1000) + 3600}`,
  revealDeadline: `${Math.floor(Date.now() / 1000) + 7200}`,
  bidderLimit: 2,
  nftOwner: '0x123',
  custodyValid: true,
  state: {
    settled: false,
    sold: false,
    winnerIndex: 0,
    winnerCommitment: '0x0',
    winnerRecipient: '0x0',
    clearingPrice: '0',
    sellerEntitlement: '0',
    sellerAuthorizedNote: '0x0',
    sellerClaimConsumed: false,
  },
  bids: [],
}

const connection = {
  account: {
    execute: vi.fn(),
    strk20InvokeTransaction: vi.fn(),
    strk20PrepareInvoke: vi.fn(),
  },
  address: '0x777' as const,
  chainId: model.chainId,
  walletApiVersions: ['0.10.3'],
  supportsStrk20: true,
}

describe('AuctionActions', () => {
  it('keeps transaction controls disabled without a connected account', () => {
    render(<AuctionActions model={model} connection={null} />)
    expect(screen.getByLabelText('Private bid amount')).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Submit private bid' })).toBeDisabled()
    expect(screen.getByText('Connect a compatible wallet to transact.')).toBeInTheDocument()
  })

  it('enables bounded bidding and encrypted recovery controls for a compatible account', () => {
    render(<AuctionActions model={model} connection={connection} />)
    expect(screen.getByLabelText('Private bid amount')).toBeEnabled()
    expect(screen.getByLabelText('Recovery password')).toBeEnabled()
    expect(screen.getByLabelText('Import encrypted recovery bundle')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Submit private bid' })).toBeEnabled()
    expect(screen.getByText('Enter any positive bid up to 5 STRK. Bids below the 2 STRK reserve cannot win.')).toBeInTheDocument()
    expect(document.body.textContent).not.toContain('claimSecret')
  })
})
