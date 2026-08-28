import { TransactionUnconfirmedError } from '@/features/transactions/receiptVerifier'

export type WalletSnapshot = Readonly<{ address: string; chainId: string }>

export type TransactionErrorCode =
  | 'ACTIVE_TRANSACTION'
  | 'WALLET_CHANGED'
  | 'WALLET_REJECTED'
  | 'UNCONFIRMED'
  | 'INVALID_TRANSACTION_HASH'
  | 'FAILED'

export type TransactionFlowStatus =
  | 'preparing'
  | 'awaiting_wallet'
  | 'confirming'
  | 'reading_state'
  | 'succeeded'
  | 'unconfirmed'
  | 'failed'

export type TransactionFlowState = Readonly<{
  operationId: string
  status: TransactionFlowStatus
  transactionHash?: string
  errorCode?: TransactionErrorCode
}>

export class TransactionFlowError extends Error {
  override name = 'TransactionFlowError'

  constructor(
    readonly code: TransactionErrorCode,
    message: string,
  ) {
    super(message)
  }
}

type TransactionRunInput<Prepared, Verified> = Readonly<{
  operationId: string
  expectedWallet: WalletSnapshot
  getWalletSnapshot: () => Promise<WalletSnapshot>
  prepare: () => Promise<Prepared>
  submit: (prepared: Prepared) => Promise<string>
  verify: (transactionHash: string) => Promise<Verified>
}>

type Listener = (state: TransactionFlowState) => void

function sameWallet(actual: WalletSnapshot, expected: WalletSnapshot): boolean {
  try {
    return BigInt(actual.address) === BigInt(expected.address) && BigInt(actual.chainId) === BigInt(expected.chainId)
  } catch {
    return false
  }
}

function assertWallet(actual: WalletSnapshot, expected: WalletSnapshot): void {
  if (!sameWallet(actual, expected)) {
    throw new TransactionFlowError('WALLET_CHANGED', 'Connected wallet or network changed during the transaction')
  }
}

function rejectedByWallet(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false
  const code = (error as Record<string, unknown>).code
  return code === 4001 || code === '4001' || code === 'ACTION_REJECTED' || code === 'USER_REJECTED'
}

function classifyError(error: unknown): TransactionFlowError {
  if (error instanceof TransactionFlowError) return error
  if (error instanceof TransactionUnconfirmedError) {
    return new TransactionFlowError('UNCONFIRMED', 'Transaction remains unconfirmed')
  }
  if (rejectedByWallet(error)) {
    return new TransactionFlowError('WALLET_REJECTED', 'Wallet request was rejected')
  }
  return new TransactionFlowError('FAILED', 'Transaction flow failed')
}

export class TransactionOrchestrator {
  readonly #listeners = new Set<Listener>()
  #active = false
  #state: TransactionFlowState | null = null

  get active(): boolean {
    return this.#active
  }

  get state(): TransactionFlowState | null {
    return this.#state
  }

  subscribe(listener: Listener): () => void {
    this.#listeners.add(listener)
    return () => this.#listeners.delete(listener)
  }

  #publish(state: TransactionFlowState): void {
    this.#state = Object.freeze({ ...state })
    for (const listener of this.#listeners) listener(this.#state)
  }

  async run<Prepared, Verified>(input: TransactionRunInput<Prepared, Verified>): Promise<Verified> {
    if (this.#active) {
      throw new TransactionFlowError('ACTIVE_TRANSACTION', 'Another transaction is already active')
    }
    if (!input.operationId.trim()) throw new TransactionFlowError('FAILED', 'Operation ID is required')

    this.#active = true
    let transactionHash: string | undefined
    try {
      this.#publish({ operationId: input.operationId, status: 'preparing' })
      assertWallet(await input.getWalletSnapshot(), input.expectedWallet)
      const prepared = await input.prepare()

      this.#publish({ operationId: input.operationId, status: 'awaiting_wallet' })
      assertWallet(await input.getWalletSnapshot(), input.expectedWallet)
      transactionHash = await input.submit(prepared)
      if (!/^0x[0-9a-fA-F]+$/.test(transactionHash) || BigInt(transactionHash) === 0n) {
        throw new TransactionFlowError('INVALID_TRANSACTION_HASH', 'Wallet returned an invalid transaction hash')
      }

      this.#publish({ operationId: input.operationId, status: 'confirming', transactionHash })
      this.#publish({ operationId: input.operationId, status: 'reading_state', transactionHash })
      const verified = await input.verify(transactionHash)
      this.#publish({ operationId: input.operationId, status: 'succeeded', transactionHash })
      return verified
    } catch (error) {
      const classified = classifyError(error)
      this.#publish({
        operationId: input.operationId,
        status: classified.code === 'UNCONFIRMED' ? 'unconfirmed' : 'failed',
        ...(transactionHash ? { transactionHash } : {}),
        errorCode: classified.code,
      })
      throw classified
    } finally {
      this.#active = false
    }
  }
}
