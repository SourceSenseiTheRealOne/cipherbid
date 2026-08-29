import { describe, expect, it } from 'vitest'
import type { DeploymentManifest } from '@/config/deployment'
import {
  CIPHERBID_EVENT_SELECTORS,
  verifyTransactionTransition,
  type ReceiptProvider,
} from '@/features/transactions/receiptVerifier'

const manifest: DeploymentManifest = {
  network: 'sepolia',
  chainId: '0x534e5f5345504f4c4941',
  rpcUrl: 'https://rpc.example/sepolia',
  auctionHouse: '0x123',
  auctionHouseClassHash: '0x456',
  strk20Pool: '0x254a6b2997ef52e9f830ce1f543f6b29768295e8d17e2267d672c552cfe0d91',
  paymentToken: '0x4718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d',
}

const successfulReceipt = {
  execution_status: 'SUCCEEDED',
  finality_status: 'ACCEPTED_ON_L2',
  block_hash: '0xabc',
  block_number: 77,
  events: [
    {
      from_address: manifest.auctionHouse,
      keys: [CIPHERBID_EVENT_SELECTORS.AuctionSettled, '0x7'],
      data: [],
    },
    {
      from_address: manifest.strk20Pool,
      keys: ['0x999'],
      data: [],
    },
  ],
} as const

function provider(receipt: unknown = successfulReceipt): ReceiptProvider {
  return { waitForTransaction: async () => receipt }
}

describe('receipt verifier', () => {
  it('accepts only a successful finalized receipt plus exact events and state readback', async () => {
    await expect(
      verifyTransactionTransition({
        provider: provider(),
        manifest,
        transactionHash: '0x789',
        expectedEvent: 'AuctionSettled',
        requirePoolTouch: true,
        readState: async () => true,
        timeoutMs: 100,
      }),
    ).resolves.toEqual({
      transactionHash: '0x789',
      finalityStatus: 'ACCEPTED_ON_L2',
      blockHash: '0xabc',
      blockNumber: 77,
      cipherBidEventFound: true,
      poolTouchFound: true,
      stateReadbackPassed: true,
    })
  })

  it('rejects revert, missing evidence, and false state readback', async () => {
    await expect(
      verifyTransactionTransition({
        provider: provider({ ...successfulReceipt, execution_status: 'REVERTED' }),
        manifest,
        transactionHash: '0x789',
        expectedEvent: 'AuctionSettled',
        requirePoolTouch: false,
        readState: async () => true,
      }),
    ).rejects.toThrow('did not succeed')

    await expect(
      verifyTransactionTransition({
        provider: provider({ ...successfulReceipt, events: successfulReceipt.events.slice(1) }),
        manifest,
        transactionHash: '0x789',
        expectedEvent: 'AuctionSettled',
        requirePoolTouch: true,
        readState: async () => true,
      }),
    ).rejects.toThrow('CipherBid event')

    await expect(
      verifyTransactionTransition({
        provider: provider({ ...successfulReceipt, events: successfulReceipt.events.slice(0, 1) }),
        manifest,
        transactionHash: '0x789',
        expectedEvent: 'AuctionSettled',
        requirePoolTouch: true,
        readState: async () => true,
      }),
    ).rejects.toThrow('STRK20 pool')

    await expect(
      verifyTransactionTransition({
        provider: provider(),
        manifest,
        transactionHash: '0x789',
        expectedEvent: 'AuctionSettled',
        requirePoolTouch: true,
        readState: async () => false,
      }),
    ).rejects.toThrow('State readback')
  })

  it('classifies timeout as unconfirmed instead of success or revert', async () => {
    const never: ReceiptProvider = { waitForTransaction: async () => new Promise(() => undefined) }
    await expect(
      verifyTransactionTransition({
        provider: never,
        manifest,
        transactionHash: '0x789',
        expectedEvent: 'AuctionSettled',
        requirePoolTouch: false,
        readState: async () => true,
        timeoutMs: 1,
      }),
    ).rejects.toMatchObject({ name: 'TransactionUnconfirmedError' })
  })
})
