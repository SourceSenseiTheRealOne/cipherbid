export const MAX_U128 = (1n << 128n) - 1n

type ParseTokenAmountOptions = Readonly<{
  max?: bigint
}>

const CANONICAL_DECIMAL = /^(0|[1-9]\d*)(?:\.(\d+))?$/

export function parseTokenAmount(input: string, decimals: number, options: ParseTokenAmountOptions = {}): bigint {
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 255) {
    throw new Error('Token decimals must be an integer from 0 to 255')
  }

  const match = CANONICAL_DECIMAL.exec(input)
  if (!match) {
    throw new Error('Enter a canonical non-negative decimal amount')
  }

  const fraction = match[2] ?? ''
  if (fraction.length > decimals) {
    throw new Error(`Amount has more than ${decimals} decimal places`)
  }

  const whole = input.split('.')[0]
  const scale = 10n ** BigInt(decimals)
  const fractionUnits = fraction.length === 0 ? 0n : BigInt(fraction.padEnd(decimals, '0'))
  const amount = BigInt(whole) * scale + fractionUnits

  if (amount > MAX_U128) {
    throw new Error('Amount exceeds the Starknet u128 limit')
  }
  if (options.max !== undefined && amount > options.max) {
    throw new Error('Amount exceeds the auction cap')
  }

  return amount
}
