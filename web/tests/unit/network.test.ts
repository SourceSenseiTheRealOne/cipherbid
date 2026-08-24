import { describe, expect, it } from 'vitest'
import { isSepoliaChainId } from '@/lib/starknet/network'

describe('isSepoliaChainId', () => {
  it('accepts the canonical felt chain id and rejects other networks', () => {
    expect(isSepoliaChainId('0x534e5f5345504f4c4941')).toBe(true)
    expect(isSepoliaChainId('SN_SEPOLIA')).toBe(true)
    expect(isSepoliaChainId('0x534e5f4d41494e')).toBe(false)
  })
})
