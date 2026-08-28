import { describe, expect, it } from 'vitest'
import { TransactionUnconfirmedError } from '@/features/transactions/receiptVerifier'
import {
  TransactionFlowError,
  TransactionOrchestrator,
  type TransactionFlowState,
} from '@/features/transactions/transactionOrchestrator'

const wallet = { address: '0x123', chainId: '0x534e5f5345504f4c4941' } as const

describe('transaction orchestrator', () => {
  it('runs one transaction through prepare, wallet, receipt, readback, and success', async () => {
    const orchestrator = new TransactionOrchestrator()
    const states: TransactionFlowState[] = []
    orchestrator.subscribe((state) => states.push(state))

    const result = await orchestrator.run({
      operationId: 'settle:7',
      expectedWallet: wallet,
      getWalletSnapshot: async () => wallet,
      prepare: async () => ({ call: 'settle' }),
      submit: async (prepared) => {
        expect(prepared).toEqual({ call: 'settle' })
        return '0x789'
      },
      verify: async (hash) => ({ hash, state: 'settled' }),
    })

    expect(result).toEqual({ hash: '0x789', state: 'settled' })
    expect(states.map((state) => state.status)).toEqual([
      'preparing',
      'awaiting_wallet',
      'confirming',
      'reading_state',
      'succeeded',
    ])
    expect(states.every((state) => !('prepared' in state) && !('errorMessage' in state))).toBe(true)
  })

  it('enforces one active transaction and detects wallet changes', async () => {
    const orchestrator = new TransactionOrchestrator()
    let release!: () => void
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })
    const first = orchestrator.run({
      operationId: 'bid:7',
      expectedWallet: wallet,
      getWalletSnapshot: async () => wallet,
      prepare: async () => {
        await gate
        return 'prepared'
      },
      submit: async () => '0x111',
      verify: async () => true,
    })
    await expect(
      orchestrator.run({
        operationId: 'bid:8',
        expectedWallet: wallet,
        getWalletSnapshot: async () => wallet,
        prepare: async () => 'prepared',
        submit: async () => '0x222',
        verify: async () => true,
      }),
    ).rejects.toMatchObject({ code: 'ACTIVE_TRANSACTION' })
    release()
    await first

    let reads = 0
    await expect(
      orchestrator.run({
        operationId: 'reveal:7',
        expectedWallet: wallet,
        getWalletSnapshot: async () => (reads++ === 0 ? wallet : { ...wallet, address: '0x999' }),
        prepare: async () => 'prepared',
        submit: async () => '0x333',
        verify: async () => true,
      }),
    ).rejects.toMatchObject({ code: 'WALLET_CHANGED' })
  })

  it('classifies wallet rejection and timeout without storing raw errors', async () => {
    const orchestrator = new TransactionOrchestrator()
    const states: TransactionFlowState[] = []
    orchestrator.subscribe((state) => states.push(state))
    await expect(
      orchestrator.run({
        operationId: 'claim:7',
        expectedWallet: wallet,
        getWalletSnapshot: async () => wallet,
        prepare: async () => 'prepared',
        submit: async () => {
          throw { code: 4001, message: 'synthetic secret must not persist' }
        },
        verify: async () => true,
      }),
    ).rejects.toMatchObject({ code: 'WALLET_REJECTED' })
    expect(states.at(-1)).toMatchObject({ status: 'failed', errorCode: 'WALLET_REJECTED' })
    expect(JSON.stringify(states)).not.toContain('synthetic secret')

    await expect(
      orchestrator.run({
        operationId: 'claim:8',
        expectedWallet: wallet,
        getWalletSnapshot: async () => wallet,
        prepare: async () => 'prepared',
        submit: async () => '0x888',
        verify: async () => {
          throw new TransactionUnconfirmedError('still pending')
        },
      }),
    ).rejects.toBeInstanceOf(TransactionFlowError)
    expect(states.at(-1)).toMatchObject({ status: 'unconfirmed', errorCode: 'UNCONFIRMED' })
  })
})
