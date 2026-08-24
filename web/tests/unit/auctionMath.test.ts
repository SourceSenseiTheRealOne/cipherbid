import { describe, expect, it } from 'vitest'
import { MAX_U128, parseTokenAmount } from '@/features/auction/auctionMath'

describe('parseTokenAmount', () => {
  it('converts exact decimal strings to base-unit bigint without floating point', () => {
    expect(parseTokenAmount('12.3405', 6)).toBe(12_340_500n)
    expect(parseTokenAmount('0.000001', 6)).toBe(1n)
    expect(parseTokenAmount('42', 0)).toBe(42n)
  })

  it.each([
    ['', 18],
    [' ', 18],
    ['-1', 18],
    ['+1', 18],
    ['1e3', 18],
    ['NaN', 18],
    ['0x10', 18],
    ['1.', 18],
    ['.5', 18],
    ['01', 18],
    ['1_000', 18],
  ] as const)('rejects non-canonical decimal input %j', (input, decimals) => {
    expect(() => parseTokenAmount(input, decimals)).toThrow('Enter a canonical non-negative decimal amount')
  })

  it('rejects fractional precision beyond token decimals', () => {
    expect(() => parseTokenAmount('1.0000001', 6)).toThrow('Amount has more than 6 decimal places')
    expect(() => parseTokenAmount('1.1', 0)).toThrow('Amount has more than 0 decimal places')
  })

  it('rejects invalid decimals, u128 overflow, and values above the auction cap', () => {
    expect(() => parseTokenAmount('1', -1)).toThrow('Token decimals must be an integer from 0 to 255')
    expect(() => parseTokenAmount('1', 256)).toThrow('Token decimals must be an integer from 0 to 255')
    expect(() => parseTokenAmount((MAX_U128 + 1n).toString(), 0)).toThrow('Amount exceeds the Starknet u128 limit')
    expect(() => parseTokenAmount('5.000001', 6, { max: 5_000_000n })).toThrow('Amount exceeds the auction cap')
  })
})
