import type { WALLET_API } from '@starknet-io/types-js'
import { num } from 'starknet'

export type HexAddress = `0x${string}`

export type PlaceBidInput = Readonly<{
  auctionId: bigint
  paymentToken: HexAddress
  cap: bigint
  commitment: bigint
  claimHandle: bigint
  auctionHouse: HexAddress
}>

const PLACE_BID = 0n
const ZERO = num.toHex(0n)
const POOL_ADDRESS_PLACEHOLDER = '${poolAddress}'

const felt = (value: bigint) => num.toHex(value)

export function buildPlaceBidActions(input: PlaceBidInput): readonly WALLET_API.STRK20_ACTION[] {
  return [
    {
      type: 'withdraw',
      token: input.paymentToken,
      amount: felt(input.cap),
      recipient: input.auctionHouse,
    },
    {
      type: 'invoke',
      contract: input.auctionHouse,
      calldata: [
        felt(PLACE_BID),
        felt(input.auctionId),
        felt(input.commitment),
        felt(input.claimHandle),
        ZERO,
        ZERO,
        POOL_ADDRESS_PLACEHOLDER,
        ZERO,
      ],
    },
  ]
}
