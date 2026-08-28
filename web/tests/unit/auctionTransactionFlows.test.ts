import { describe, expect, it, vi } from 'vitest'
import { createBidderCredential, createSellerCredential, bindAcceptedIndex } from '@/features/credentials/credentials'
import { TransactionOrchestrator } from '@/features/transactions/transactionOrchestrator'
import {
  extractResolvedSellerOpenNoteId,
  runPrivateBidFlow,
  runPrivateClaimFlow,
  runRevealFlow,
  runSellerClaimFlow,
  runSellerCreationFlow,
  runSettlementFlow,
  type PrivacyWallet,
} from '@/features/transactions/auctionTransactionFlows'

const expectedWallet = { address: '0x777', chainId: '0x534e5f5345504f4c4941' } as const
const getWalletSnapshot = async () => expectedWallet
const binding = {
  network: 'sepolia' as const,
  chainId: BigInt(expectedWallet.chainId),
  auctionHouse: 0x123n,
  auctionId: 7n,
}
const password = 'correct horse battery staple'

function hashResponse(transactionHash: string) {
  return { transaction_hash: transactionHash }
}

describe('auction transaction flows', () => {
  it('extracts the resolved seller note only from the exact helper calldata sequence', () => {
    const seller = createSellerCredential({ ...binding, claimSecret: 0x503n })
    expect(
      extractResolvedSellerOpenNoteId(
        {
          call: {
            calldata: [
              '0xdead',
              '0x3',
              '0x7',
              `0x${seller.claimSecret.toString(16)}`,
              `0x${seller.claimHandle.toString(16)}`,
              '0x0',
              '0x0',
              '0x456',
              '0x903',
              '0xbeef',
            ],
          },
        },
        seller,
        '0x456',
      ),
    ).toBe(0x903n)
    expect(() => extractResolvedSellerOpenNoteId({ call: { calldata: ['0x903'] } }, seller, '0x456')).toThrow()
  })

  it('verifies seller recovery before atomic approval and creation submission', async () => {
    const sequence: string[] = []
    const execute = vi.fn(async () => {
      sequence.push('execute')
      return hashResponse('0x101')
    })
    const verify = vi.fn(async (hash: string) => ({ hash, created: true }))
    const credential = createSellerCredential({ ...binding, claimSecret: 0x501n })

    const result = await runSellerCreationFlow({
      orchestrator: new TransactionOrchestrator(),
      wallet: { execute },
      expectedWallet,
      getWalletSnapshot,
      credential,
      recoveryPassword: password,
      onRecoveryReady: async (bundle) => {
        expect(bundle.serialized).not.toContain('claimSecret')
        sequence.push('recovery')
      },
      nftContract: '0x999',
      tokenId: 99n,
      reservePrice: 2n,
      cap: 5n,
      biddingDeadline: 100n,
      revealDeadline: 200n,
      bidderLimit: 2n,
      verify,
    })

    expect(sequence).toEqual(['recovery', 'execute'])
    expect(execute).toHaveBeenCalledWith([
      { contractAddress: '0x999', entrypoint: 'approve', calldata: ['0x123', '0x63', '0x0'] },
      {
        contractAddress: '0x123',
        entrypoint: 'create_auction',
        calldata: ['0x7', expect.any(String), '0x999', '0x63', '0x0', '0x2', '0x5', '0x64', '0xc8', '0x2'],
      },
    ])
    expect(result.evidence).toEqual({ hash: '0x101', created: true })
  })

  it('uses STRK20 for private bid and claims, but standard execute for reveal and settlement', async () => {
    const execute = vi.fn(async () => hashResponse('0x201'))
    const strk20InvokeTransaction = vi.fn(
      async (_actions: Parameters<PrivacyWallet['strk20InvokeTransaction']>[0]) => hashResponse('0x202'),
    )
    const wallet = { execute, strk20InvokeTransaction }
    const verify = vi.fn(async (hash: string) => ({ hash }))
    const bidder = bindAcceptedIndex(
      createBidderCredential({
        ...binding,
        claimSecret: 0x502n,
        bidNonce: 0x601n,
        amount: 4n,
        assetRecipient: 0x888n,
      }),
      1,
    )

    await runPrivateBidFlow({
      orchestrator: new TransactionOrchestrator(),
      wallet,
      expectedWallet,
      getWalletSnapshot,
      credential: bidder,
      recoveryPassword: password,
      onRecoveryReady: async () => undefined,
      paymentToken: '0x456',
      cap: 5n,
      verify,
    })
    expect(strk20InvokeTransaction.mock.calls[0][0].map((action: { type: string }) => action.type)).toEqual([
      'withdraw',
      'invoke',
    ])

    await runRevealFlow({
      orchestrator: new TransactionOrchestrator(),
      wallet,
      expectedWallet,
      getWalletSnapshot,
      credential: bidder,
      verify,
    })
    expect(execute).toHaveBeenCalledWith({
      contractAddress: '0x123',
      entrypoint: 'reveal_bid',
      calldata: ['0x7', '0x1', '0x4', '0x601', '0x888'],
    })

    await runSettlementFlow({
      orchestrator: new TransactionOrchestrator(),
      wallet,
      expectedWallet,
      getWalletSnapshot,
      auctionHouse: '0x123',
      auctionId: 7n,
      verify,
    })
    expect(execute).toHaveBeenCalledWith({ contractAddress: '0x123', entrypoint: 'settle_auction', calldata: ['0x7'] })

    await runPrivateClaimFlow({
      orchestrator: new TransactionOrchestrator(),
      wallet,
      expectedWallet,
      getWalletSnapshot,
      kind: 'loser_refund',
      credential: bidder,
      paymentToken: '0x456',
      recipient: '0x777',
      verify,
    })
    expect(strk20InvokeTransaction.mock.calls.at(-1)?.[0].map((action: { type: string }) => action.type)).toEqual([
      'transfer',
      'invoke',
    ])
  })

  it('authorizes exactly the simulated seller note and aborts if re-preparation changes it', async () => {
    const seller = createSellerCredential({ ...binding, claimSecret: 0x503n })
    const execute = vi.fn(async () => hashResponse('0x301'))
    const strk20InvokeTransaction = vi.fn(
      async (_actions: Parameters<PrivacyWallet['strk20InvokeTransaction']>[0]) => hashResponse('0x302'),
    )
    const strk20PrepareInvoke = vi.fn(async () => ({ openNoteId: '0x903' }))
    const verify = vi.fn(async (hash: string) => ({ hash }))

    const result = await runSellerClaimFlow({
      orchestrator: new TransactionOrchestrator(),
      wallet: { execute, strk20InvokeTransaction, strk20PrepareInvoke },
      expectedWallet,
      getWalletSnapshot,
      credential: seller,
      paymentToken: '0x456',
      recipient: '0x777',
      extractOpenNoteId: (prepared) => BigInt((prepared as { openNoteId: string }).openNoteId),
      verifyAuthorization: verify,
      verifyClaim: verify,
    })
    expect(execute).toHaveBeenCalledWith({
      contractAddress: '0x123',
      entrypoint: 'authorize_seller_proceeds',
      calldata: ['0x7', `0x${seller.claimHandle.toString(16)}`, '0x903'],
    })
    expect(strk20PrepareInvoke).toHaveBeenCalledTimes(2)
    expect(strk20InvokeTransaction).toHaveBeenCalledTimes(1)
    expect(result.authorizedOpenNoteId).toBe(0x903n)

    let preparation = 0
    const changedPrepare = vi.fn(async () => ({ openNoteId: preparation++ === 0 ? '0x903' : '0x904' }))
    const privacySubmit = vi.fn(async () => hashResponse('0x402'))
    await expect(
      runSellerClaimFlow({
        orchestrator: new TransactionOrchestrator(),
        wallet: { execute: vi.fn(async () => hashResponse('0x401')), strk20InvokeTransaction: privacySubmit, strk20PrepareInvoke: changedPrepare },
        expectedWallet,
        getWalletSnapshot,
        credential: seller,
        paymentToken: '0x456',
        recipient: '0x777',
        extractOpenNoteId: (prepared) => BigInt((prepared as { openNoteId: string }).openNoteId),
        verifyAuthorization: verify,
        verifyClaim: verify,
      }),
    ).rejects.toMatchObject({ code: 'FAILED' })
    expect(privacySubmit).not.toHaveBeenCalled()
  })
})
