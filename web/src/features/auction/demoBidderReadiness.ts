const MINIMUM_PUBLIC_DEPOSIT = 15n * 10n ** 18n
const NOTE_MATURITY_BLOCKS = 10

type Hex = `0x${string}`

export type PublicDeposit = Readonly<{
  amount: bigint
  blockNumber: number
  transactionHash: Hex
}>

export type DemoBidderObservation = Readonly<{
  name: string
  address: Hex
  publicKey: Hex
  deposits: readonly PublicDeposit[]
}>

export type DemoBidderStatus = Readonly<{
  name: string
  address: Hex
  publicKey: Hex
  registered: boolean
  depositAmount?: bigint
  depositBlock?: number
  depositTransactionHash?: Hex
  confirmations?: number
  ready: boolean
  blockers: readonly string[]
}>

function felt(value: Hex, label: string): bigint {
  if (!/^0x[0-9a-fA-F]+$/.test(value)) throw new Error(`${label} must be hexadecimal`)
  return BigInt(value)
}

function normalized(value: Hex, label: string): Hex {
  const parsed = felt(value, label)
  if (parsed <= 0n) throw new Error(`${label} must be non-zero`)
  return `0x${parsed.toString(16)}`
}

export function evaluateDemoBidderReadiness(
  input: Readonly<{
    bidders: readonly DemoBidderObservation[]
    latestBlock: number
    minimumPublicDeposit?: bigint
  }>,
): Readonly<{ ready: boolean; statuses: readonly DemoBidderStatus[] }> {
  if (!Number.isSafeInteger(input.latestBlock) || input.latestBlock < 0) {
    throw new Error('Latest block must be a non-negative safe integer')
  }
  if (input.bidders.length !== 2) throw new Error('The demo requires exactly two bidder accounts')
  const minimumPublicDeposit = input.minimumPublicDeposit ?? MINIMUM_PUBLIC_DEPOSIT
  if (minimumPublicDeposit <= 0n) throw new Error('Minimum public deposit must be positive')
  const minimumDepositLabel =
    minimumPublicDeposit % 10n ** 18n === 0n
      ? `${minimumPublicDeposit / 10n ** 18n} STRK`
      : `${minimumPublicDeposit} base units of STRK`

  const addresses = input.bidders.map((bidder) => normalized(bidder.address, `${bidder.name} address`))
  if (new Set(addresses).size !== addresses.length) throw new Error('Demo bidder accounts must be distinct')

  const registeredKeys = input.bidders
    .map((bidder) => felt(bidder.publicKey, `${bidder.name} public key`))
    .filter((key) => key !== 0n)
    .map((key) => key.toString())
  if (new Set(registeredKeys).size !== registeredKeys.length) {
    throw new Error('Registered demo bidder viewing public keys must be distinct')
  }

  const statuses = input.bidders.map((bidder, index): DemoBidderStatus => {
    const publicKey = felt(bidder.publicKey, `${bidder.name} public key`)
    const registered = publicKey !== 0n
    const qualifyingDeposits = bidder.deposits
      .map((deposit) => {
        if (deposit.amount < 0n) throw new Error(`${bidder.name} deposit amount cannot be negative`)
        if (
          !Number.isSafeInteger(deposit.blockNumber) ||
          deposit.blockNumber < 0 ||
          deposit.blockNumber > input.latestBlock
        ) {
          throw new Error(`${bidder.name} deposit block is invalid`)
        }
        felt(deposit.transactionHash, `${bidder.name} deposit transaction hash`)
        return deposit
      })
      .filter((deposit) => deposit.amount >= minimumPublicDeposit)
      .sort((left, right) => left.blockNumber - right.blockNumber)
    const deposit = qualifyingDeposits[0]
    const confirmations = deposit ? input.latestBlock - deposit.blockNumber : undefined
    const blockers: string[] = []

    if (!registered) blockers.push('STRK20 viewing key is not registered')
    if (!deposit) {
      blockers.push(`No public STRK deposit of at least ${minimumDepositLabel} was found`)
    } else if ((confirmations ?? 0) < NOTE_MATURITY_BLOCKS) {
      const remaining = NOTE_MATURITY_BLOCKS - (confirmations ?? 0)
      blockers.push(`Qualifying deposit needs ${remaining} more block${remaining === 1 ? '' : 's'} before bidding`)
    }

    return Object.freeze({
      name: bidder.name,
      address: addresses[index]!,
      publicKey: `0x${publicKey.toString(16)}`,
      registered,
      ...(deposit
        ? {
            depositAmount: deposit.amount,
            depositBlock: deposit.blockNumber,
            depositTransactionHash: deposit.transactionHash,
            confirmations,
          }
        : {}),
      ready: blockers.length === 0,
      blockers: Object.freeze(blockers),
    })
  })

  return Object.freeze({ ready: statuses.every((status) => status.ready), statuses: Object.freeze(statuses) })
}
