import type { DeploymentManifest } from '@/config/deployment'
import { hash } from 'starknet'

const EVENT_NAMES = [
  'AuctionCreated',
  'BidCommitted',
  'BidRevealed',
  'AuctionSettled',
  'SellerProceedsAuthorized',
  'LoserRefundClaimed',
  'WinnerSurplusClaimed',
  'SellerProceedsClaimed',
] as const

export type CipherBidEventName = (typeof EVENT_NAMES)[number]

export const CIPHERBID_EVENT_SELECTORS = Object.freeze(
  Object.fromEntries(EVENT_NAMES.map((name) => [name, hash.getSelectorFromName(name)])) as Record<
    CipherBidEventName,
    string
  >,
)

export type ReceiptProvider = Readonly<{
  waitForTransaction: (transactionHash: string) => Promise<unknown>
}>

type ReceiptEvent = Readonly<{
  fromAddress: string
  keys: readonly string[]
  data: readonly string[]
}>

type NormalizedReceipt = Readonly<{
  executionStatus: string
  finalityStatus: string
  blockHash: string
  blockNumber: number
  events: readonly ReceiptEvent[]
}>

export class TransactionUnconfirmedError extends Error {
  override name = 'TransactionUnconfirmedError'
}

function record(value: unknown, label: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new Error(`${label} is malformed`)
  return value as Record<string, unknown>
}

function stringField(source: Record<string, unknown>, snake: string, camel: string): string {
  const value = source[snake] ?? source[camel]
  if (typeof value !== 'string' || value.length === 0) throw new Error(`Receipt ${snake} is missing`)
  return value
}

function normalizeReceipt(value: unknown): NormalizedReceipt {
  const receipt = record(value, 'Receipt')
  const rawEvents = receipt.events
  if (!Array.isArray(rawEvents)) throw new Error('Receipt events are missing')
  const events = rawEvents.map((rawEvent, index): ReceiptEvent => {
    const event = record(rawEvent, `Receipt event ${index}`)
    const fromAddress = stringField(event, 'from_address', 'fromAddress')
    if (!Array.isArray(event.keys) || !event.keys.every((key) => typeof key === 'string')) {
      throw new Error(`Receipt event ${index} keys are malformed`)
    }
    if (!Array.isArray(event.data) || !event.data.every((item) => typeof item === 'string')) {
      throw new Error(`Receipt event ${index} data are malformed`)
    }
    return { fromAddress, keys: event.keys as string[], data: event.data as string[] }
  })
  const rawBlockNumber = receipt.block_number ?? receipt.blockNumber
  if (typeof rawBlockNumber !== 'number' || !Number.isSafeInteger(rawBlockNumber) || rawBlockNumber < 0) {
    throw new Error('Receipt block_number is malformed')
  }
  return {
    executionStatus: stringField(receipt, 'execution_status', 'executionStatus'),
    finalityStatus: stringField(receipt, 'finality_status', 'finalityStatus'),
    blockHash: stringField(receipt, 'block_hash', 'blockHash'),
    blockNumber: rawBlockNumber,
    events,
  }
}

function sameFelt(left: string, right: string): boolean {
  try {
    return BigInt(left) === BigInt(right)
  } catch {
    return false
  }
}

async function waitWithTimeout(provider: ReceiptProvider, transactionHash: string, timeoutMs: number): Promise<unknown> {
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs <= 0) throw new Error('Receipt timeout must be a positive integer')
  let timer: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new TransactionUnconfirmedError(`Transaction ${transactionHash} remains unconfirmed`)),
      timeoutMs,
    )
  })
  try {
    return await Promise.race([provider.waitForTransaction(transactionHash), timeout])
  } finally {
    if (timer) clearTimeout(timer)
  }
}

export async function verifyTransactionTransition(input: Readonly<{
  provider: ReceiptProvider
  manifest: DeploymentManifest
  transactionHash: string
  expectedEvent: CipherBidEventName
  requirePoolTouch: boolean
  readState: () => Promise<boolean>
  timeoutMs?: number
}>) {
  if (!/^0x[0-9a-fA-F]+$/.test(input.transactionHash) || BigInt(input.transactionHash) === 0n) {
    throw new Error('Transaction hash must be a non-zero hexadecimal felt')
  }
  const receipt = normalizeReceipt(
    await waitWithTimeout(input.provider, input.transactionHash, input.timeoutMs ?? 120_000),
  )
  if (receipt.executionStatus !== 'SUCCEEDED') {
    throw new Error(`Transaction ${input.transactionHash} did not succeed`)
  }
  if (receipt.finalityStatus !== 'ACCEPTED_ON_L2' && receipt.finalityStatus !== 'ACCEPTED_ON_L1') {
    throw new TransactionUnconfirmedError(
      `Transaction ${input.transactionHash} has unconfirmed finality ${receipt.finalityStatus}`,
    )
  }

  const expectedSelector = CIPHERBID_EVENT_SELECTORS[input.expectedEvent]
  const cipherBidEventFound = receipt.events.some(
    (event) =>
      sameFelt(event.fromAddress, input.manifest.auctionHouse) &&
      event.keys.length > 0 &&
      sameFelt(event.keys[0], expectedSelector),
  )
  if (!cipherBidEventFound) throw new Error(`Expected CipherBid event ${input.expectedEvent} was not found`)

  const poolTouchFound = receipt.events.some((event) => sameFelt(event.fromAddress, input.manifest.strk20Pool))
  if (input.requirePoolTouch && !poolTouchFound) throw new Error('Expected STRK20 pool event was not found')

  const stateReadbackPassed = await input.readState()
  if (!stateReadbackPassed) throw new Error('State readback did not confirm the requested transition')

  return Object.freeze({
    transactionHash: input.transactionHash,
    finalityStatus: receipt.finalityStatus,
    blockHash: receipt.blockHash,
    blockNumber: receipt.blockNumber,
    cipherBidEventFound,
    poolTouchFound,
    stateReadbackPassed,
  })
}
