import { MAX_U128 } from '@/features/auction/auctionMath'
import type { HexAddress } from './strk20Actions'
import type { Call } from 'starknet'

type CapProvider = Readonly<{
  callContract: (call: Call) => Promise<string[]>
}>

export async function readCanonicalCap(auctionHouse: HexAddress, provider: CapProvider): Promise<bigint> {
  const response = await provider.callContract({
    contractAddress: auctionHouse,
    entrypoint: 'get_cap',
    calldata: [],
  })

  if (response.length !== 1) throw new Error('Contract returned an invalid uniform cap')

  try {
    const cap = BigInt(response[0])
    if (cap <= 0n || cap > MAX_U128) throw new Error('invalid cap')
    return cap
  } catch {
    throw new Error('Contract returned an invalid uniform cap')
  }
}
