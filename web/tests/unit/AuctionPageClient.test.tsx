import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuctionPageClient, type AuctionModelLoader } from '@/features/auction/ui/AuctionPageClient'
import type { AuctionLiveViewModel } from '@/features/auction/ui/AuctionLivePage'

const navigation = vi.hoisted(() => ({ query: 'id=7' }))

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(navigation.query),
}))

function model(auctionId: string): AuctionLiveViewModel {
  return {
    network: 'mainnet',
    chainId: '0x534e5f4d41494e',
    rpcUrl: 'https://rpc.example/mainnet',
    auctionHouse: '0x123',
    auctionHouseClassHash: '0x456',
    strk20Pool: '0x789',
    paymentToken: '0xabc',
    auctionId,
    seller: '0x111',
    sellerClaimHandle: '0x12',
    nftContract: '0x222',
    tokenId: '99',
    reservePrice: '1000000000000000000',
    cap: '4000000000000000000',
    biddingDeadline: '4102444800',
    revealDeadline: '4102445100',
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
}

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })
  return { promise, resolve, reject }
}

beforeEach(() => {
  navigation.query = 'id=7'
})

describe('AuctionPageClient', () => {
  it('loads one validated auction and renders only the verified model', async () => {
    const loadModel = vi.fn<AuctionModelLoader>().mockResolvedValue(model('7'))

    render(<AuctionPageClient loadModel={loadModel} />)

    expect(screen.getByRole('status')).toHaveTextContent('Loading auction #7')
    expect(await screen.findByRole('heading', { level: 1, name: 'Auction #7' })).toBeInTheDocument()
    expect(loadModel).toHaveBeenCalledOnce()
    expect(loadModel).toHaveBeenCalledWith(7n)
  })

  it.each(['', 'id=0', 'id=7&id=8', 'id=18446744073709551616'])(
    'rejects invalid query %s before public RPC loading',
    async (query) => {
      navigation.query = query
      const loadModel = vi.fn<AuctionModelLoader>()

      render(<AuctionPageClient loadModel={loadModel} />)

      expect(screen.getByRole('heading', { level: 1, name: 'Live auction unavailable' })).toBeInTheDocument()
      expect(screen.getByRole('alert')).toHaveTextContent(/auction/i)
      expect(loadModel).not.toHaveBeenCalled()
    },
  )

  it('renders hostile query text inertly and caps its display', () => {
    navigation.query = `id=${encodeURIComponent(`<script>${'x'.repeat(100)}</script>`)}`
    const loadModel = vi.fn<AuctionModelLoader>()
    const { container } = render(<AuctionPageClient loadModel={loadModel} />)

    expect(screen.getByRole('alert')).toHaveTextContent('Auction ID must be a positive u64 decimal value.')
    expect(screen.getByText(/<script>/).textContent?.length).toBeLessThanOrEqual(89)
    expect(container.querySelector('main script')).toBeNull()
    expect(loadModel).not.toHaveBeenCalled()
  })

  it('renders a generic public-read failure and retries successfully', async () => {
    const loadModel = vi
      .fn<AuctionModelLoader>()
      .mockRejectedValueOnce(new Error('sensitive upstream diagnostic'))
      .mockResolvedValueOnce(model('7'))

    render(<AuctionPageClient loadModel={loadModel} />)

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The requested onchain auction state could not be verified from public RPC.',
    )
    expect(screen.getByRole('alert')).not.toHaveTextContent('sensitive upstream diagnostic')

    fireEvent.click(screen.getByRole('button', { name: 'Retry public read' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'Auction #7' })).toBeInTheDocument()
    expect(loadModel).toHaveBeenCalledTimes(2)
  })

  it('prevents a stale request from replacing a newer query result', async () => {
    const first = deferred<AuctionLiveViewModel>()
    const second = deferred<AuctionLiveViewModel>()
    const loadModel = vi.fn<AuctionModelLoader>().mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise)
    const { rerender } = render(<AuctionPageClient loadModel={loadModel} />)

    navigation.query = 'id=8'
    rerender(<AuctionPageClient loadModel={loadModel} />)
    await waitFor(() => expect(loadModel).toHaveBeenLastCalledWith(8n))

    await act(async () => second.resolve(model('8')))
    expect(await screen.findByRole('heading', { level: 1, name: 'Auction #8' })).toBeInTheDocument()

    await act(async () => first.resolve(model('7')))
    expect(screen.getByRole('heading', { level: 1, name: 'Auction #8' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { level: 1, name: 'Auction #7' })).not.toBeInTheDocument()
  })
})
