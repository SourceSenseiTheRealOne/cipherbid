import type { WALLET_API } from '@starknet-io/types-js'
import { num } from 'starknet'
import type { HexAddress } from './strk20Actions'

export type PrivateClaimInput = Readonly<{
  auctionId: bigint
  paymentToken: HexAddress
  claimSecret: bigint
  claimHandle: bigint
  auctionHouse: HexAddress
  recipient: HexAddress
}>

const LOSER_REFUND = 1n
const WINNER_SURPLUS = 2n
const SELLER_PROCEEDS = 3n
const ZERO = num.toHex(0n)
const POOL_ADDRESS_PLACEHOLDER = '${poolAddress}'
const OPEN_NOTE_ID_PLACEHOLDER = '${openNoteIds[0]}'

const felt = (value: bigint) => num.toHex(value)

function buildClaimActions(
  operation: typeof LOSER_REFUND | typeof WINNER_SURPLUS | typeof SELLER_PROCEEDS,
  input: PrivateClaimInput,
): readonly WALLET_API.STRK20_ACTION[] {
  return [
    {
      type: 'transfer',
      token: input.paymentToken,
      amount: 'OPEN',
      recipient: input.recipient,
    },
    {
      type: 'invoke',
      contract: input.auctionHouse,
      calldata: [
        felt(operation),
        felt(input.auctionId),
        felt(input.claimSecret),
        felt(input.claimHandle),
        ZERO,
        ZERO,
        POOL_ADDRESS_PLACEHOLDER,
        OPEN_NOTE_ID_PLACEHOLDER,
      ],
    },
  ]
}

export function buildLoserRefundActions(input: PrivateClaimInput): readonly WALLET_API.STRK20_ACTION[] {
  return buildClaimActions(LOSER_REFUND, input)
}

export function buildWinnerSurplusActions(input: PrivateClaimInput): readonly WALLET_API.STRK20_ACTION[] {
  return buildClaimActions(WINNER_SURPLUS, input)
}

export function buildSellerProceedsActions(input: PrivateClaimInput): readonly WALLET_API.STRK20_ACTION[] {
  return buildClaimActions(SELLER_PROCEEDS, input)
}
