import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { AuctionActions } from '@/features/auction/ui/AuctionActions'
import type { AuctionLiveViewModel } from '@/features/auction/ui/AuctionLivePage'
import { createSellerCredential } from '@/features/credentials/credentials'
import { createVerifiedRecoveryBundle } from '@/features/credentials/recoveryBundle'
import { MAINNET_CHAIN_ID } from '@/config/deployment'

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
    expect(
      screen.getByText('Enter any positive bid up to 5 STRK. Bids below the 2 STRK reserve cannot win.'),
    ).toBeInTheDocument()
    expect(document.body.textContent).not.toContain('claimSecret')
  })

  it('rejects a recovery bundle from another network even when contract and auction IDs match', async () => {
    const user = userEvent.setup()
    const password = 'correct horse battery staple'
    const bundle = await createVerifiedRecoveryBundle(
      [
        createSellerCredential({
          network: 'sepolia',
          chainId: BigInt(model.chainId),
          auctionHouse: BigInt(model.auctionHouse),
          auctionId: BigInt(model.auctionId),
          claimSecret: 0x123456789abcdefn,
        }),
      ],
      password,
    )
    const mainnetModel: AuctionLiveViewModel = {
      ...model,
      network: 'mainnet',
      chainId: MAINNET_CHAIN_ID,
      rpcUrl: 'https://rpc.example/mainnet',
    }
    const mainnetConnection = { ...connection, chainId: MAINNET_CHAIN_ID }
    const recoveryFile = new File([bundle.serialized], 'wrong-network.recovery.json', { type: 'application/json' })
    Object.defineProperty(recoveryFile, 'text', { value: async () => bundle.serialized })
    render(<AuctionActions model={mainnetModel} connection={mainnetConnection} />)

    await user.type(screen.getByLabelText('Recovery password'), password)
    await user.upload(screen.getByLabelText('Import encrypted recovery bundle'), recoveryFile)

    expect(await screen.findByText('recovery import failed')).toBeInTheDocument()
    expect(screen.queryByText('seller recovery imported')).not.toBeInTheDocument()
  }, 10_000)

  it('rehydrates only the verified mainnet lifecycle receipts after a clean refresh', () => {
    const verifiedModel: AuctionLiveViewModel = {
      ...model,
      network: 'mainnet',
      chainId: MAINNET_CHAIN_ID,
      auctionId: '1788040057342',
      nftOwner: '0x57791bafe2653e8a62509261aeba6a9d09f1fe09f039c9ff0c09c00c24b1f1a',
      state: {
        ...model.state,
        settled: true,
        sold: true,
        winnerIndex: 1,
        winnerRecipient: '0x57791bafe2653e8a62509261aeba6a9d09f1fe09f039c9ff0c09c00c24b1f1a',
        clearingPrice: '2000000000000000000',
        sellerEntitlement: '2000000000000000000',
      },
    }

    const { rerender } = render(<AuctionActions model={verifiedModel} connection={null} />)

    expect(screen.getByText('Delivery verified')).toBeInTheDocument()
    expect(screen.getAllByRole('link')).toHaveLength(8)
    expect(
      screen.getByRole('link', {
        name: /Settlement 0x883f852f91052cc25dee8e30a7ce04996db7ccaca015d4bb2d5e2826602cbf/i,
      }),
    ).toHaveAttribute(
      'href',
      'https://starkscan.co/tx/0x883f852f91052cc25dee8e30a7ce04996db7ccaca015d4bb2d5e2826602cbf',
    )
    expect(
      screen.getByRole('link', {
        name: /Loser refund 0x7bbe0489702cdc6466b7aa4c262d7d1f34dcabace16e47c5b02cafef7fff15e/i,
      }),
    ).toBeInTheDocument()

    rerender(<AuctionActions model={{ ...verifiedModel, auctionId: '1788040057343' }} connection={null} />)
    expect(screen.queryAllByRole('link')).toHaveLength(0)
    expect(screen.getByText('No verified transaction receipts yet.')).toBeInTheDocument()
  })
})
