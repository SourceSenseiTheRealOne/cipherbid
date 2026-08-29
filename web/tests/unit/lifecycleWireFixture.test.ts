import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  buildAuthorizeSellerProceedsCall,
  buildRevealBidCall,
  buildSettleAuctionCall,
} from '@/features/auction/lifecycleCalls'
import { computeClaimHandle } from '@/features/auction/commitment'
import {
  buildLoserRefundActions,
  buildSellerProceedsActions,
  buildWinnerSurplusActions,
} from '@/features/privacy/strk20ClaimActions'

type LifecycleFixture = Readonly<{
  schema: 'cipherbid.lifecycle-routes.v2'
  sample: Readonly<{
    auctionId: string
    acceptedIndex: string
    amount: string
    bidNonce: string
    claimHandle: string
    claimSecret: string
    sellerClaimSecret: string
    sellerClaimHandle: string
    assetRecipient: `0x${string}`
    paymentToken: `0x${string}`
    auctionHouse: `0x${string}`
    walletRecipient: `0x${string}`
    sellerRecipient: `0x${string}`
    sellerOpenNoteId: string
  }>
  directCalls: Readonly<{
    reveal: unknown
    settlement: unknown
    sellerProceedsAuthorization: unknown
  }>
  operationValues: Readonly<Record<string, number>>
  strk20Claims: Readonly<{
    loserRefund: Readonly<{ actions: readonly unknown[]; outputAmount: string }>
    winnerSurplus: Readonly<{ actions: readonly unknown[]; outputAmount: string }>
    sellerProceeds: Readonly<{ actions: readonly unknown[]; outputAmount: string }>
  }>
  sellerAuthorization: Readonly<Record<string, unknown>>
  poolTouching: Readonly<Record<string, boolean>>
  sharedPrivacyInvoke: Readonly<{
    arguments: readonly Readonly<{ index: number; name: string; cairoType: string }>[]
    returnType: 'Span<OpenNoteDeposit>'
  }>
  contractOutputs: Readonly<Record<string, unknown>>
  events: Readonly<Record<string, readonly string[]>>
  submission: Readonly<Record<string, unknown>>
  mainnetMinimum: readonly string[]
  preferredDemo: readonly string[]
}>

const repositoryRoot = resolve(process.cwd(), '..')
const lifecycleFixturePath = resolve(process.cwd(), 'tests/fixtures/lifecycle-routes-v2.json')
const ingressFixturePath = resolve(process.cwd(), 'tests/fixtures/bid-ingress-v1.json')
const cairoSourcePath = resolve(repositoryRoot, 'contracts/src/lib.cairo')

function fixture(): LifecycleFixture {
  return JSON.parse(readFileSync(lifecycleFixturePath, 'utf8')) as LifecycleFixture
}

function privacyInvokeArguments(cairoSource: string): readonly Readonly<{ name: string; cairoType: string }>[] {
  const interfaceMatch = cairoSource.match(
    /pub trait IAuctionHouse<TContractState>\s*\{[\s\S]*?fn privacy_invoke\([\s\S]*?ref self: TContractState,([\s\S]*?)\) -> Span<OpenNoteDeposit>;/,
  )
  if (!interfaceMatch) throw new Error('Could not locate the Cairo privacy_invoke interface')

  return interfaceMatch[1]
    .split('\n')
    .map((line) => line.trim().replace(/,$/, ''))
    .filter(Boolean)
    .map((line) => {
      const argument = line.match(/^([a-z0-9_]+):\s*([^,]+)$/i)
      if (!argument) throw new Error(`Invalid Cairo privacy_invoke argument: ${line}`)
      return { name: argument[1], cairoType: argument[2] }
    })
}

describe('lifecycle routes v2 fixture', () => {
  it('freezes reveal, settlement, and seller proceeds authorization as connected-wallet calls', () => {
    const wire = fixture()

    expect(
      buildRevealBidCall({
        auctionId: BigInt(wire.sample.auctionId),
        acceptedIndex: BigInt(wire.sample.acceptedIndex),
        amount: BigInt(wire.sample.amount),
        bidNonce: BigInt(wire.sample.bidNonce),
        assetRecipient: wire.sample.assetRecipient,
        auctionHouse: wire.sample.auctionHouse,
      }),
    ).toEqual(wire.directCalls.reveal)

    expect(
      buildSettleAuctionCall({
        auctionId: BigInt(wire.sample.auctionId),
        auctionHouse: wire.sample.auctionHouse,
      }),
    ).toEqual(wire.directCalls.settlement)

    expect(
      buildAuthorizeSellerProceedsCall({
        auctionId: BigInt(wire.sample.auctionId),
        claimHandle: BigInt(wire.sample.sellerClaimHandle),
        openNoteId: BigInt(wire.sample.sellerOpenNoteId),
        auctionHouse: wire.sample.auctionHouse,
      }),
    ).toEqual(wire.directCalls.sellerProceedsAuthorization)
  })

  it('freezes all monetary claims as OPEN-note transfer then invoke actions', () => {
    const wire = fixture()
    const input = {
      auctionId: BigInt(wire.sample.auctionId),
      paymentToken: wire.sample.paymentToken,
      claimSecret: BigInt(wire.sample.claimSecret),
      claimHandle: BigInt(wire.sample.claimHandle),
      auctionHouse: wire.sample.auctionHouse,
      recipient: wire.sample.walletRecipient,
    }

    expect(buildLoserRefundActions(input)).toEqual(wire.strk20Claims.loserRefund.actions)
    expect(buildWinnerSurplusActions(input)).toEqual(wire.strk20Claims.winnerSurplus.actions)
    expect(
      buildSellerProceedsActions({
        auctionId: BigInt(wire.sample.auctionId),
        paymentToken: wire.sample.paymentToken,
        claimSecret: BigInt(wire.sample.sellerClaimSecret),
        claimHandle: BigInt(wire.sample.sellerClaimHandle),
        auctionHouse: wire.sample.auctionHouse,
        recipient: wire.sample.sellerRecipient,
      }),
    ).toEqual(wire.strk20Claims.sellerProceeds.actions)
    expect(computeClaimHandle(BigInt(wire.sample.sellerClaimSecret))).toBe(BigInt(wire.sample.sellerClaimHandle))
    expect(wire.operationValues).toEqual({ PLACE_BID: 0, LOSER_REFUND: 1, WINNER_SURPLUS: 2, SELLER_PROCEEDS: 3 })

    for (const claim of [
      wire.strk20Claims.loserRefund,
      wire.strk20Claims.winnerSurplus,
      wire.strk20Claims.sellerProceeds,
    ]) {
      expect(claim.actions.map((action) => (action as { type: string }).type)).toEqual(['transfer', 'invoke'])
      expect(JSON.stringify(claim.actions).match(/\$\{poolAddress\}/g)).toHaveLength(1)
      expect(JSON.stringify(claim.actions).match(/\$\{openNoteIds\[0\]\}/g)).toHaveLength(1)
    }
  })

  it('keeps one shared Cairo envelope across ingress and both claims', () => {
    const wire = fixture()
    const ingress = JSON.parse(readFileSync(ingressFixturePath, 'utf8')) as {
      privacyInvoke: { arguments: readonly Readonly<{ index: number; name: string; cairoType: string }>[] }
    }
    const cairoArguments = privacyInvokeArguments(readFileSync(cairoSourcePath, 'utf8'))
    const expectedArguments = wire.sharedPrivacyInvoke.arguments.map(({ name, cairoType }) => ({ name, cairoType }))

    expect(wire.sharedPrivacyInvoke.arguments.map(({ index }) => index)).toEqual(
      wire.sharedPrivacyInvoke.arguments.map((_, index) => index),
    )
    expect(cairoArguments).toEqual(expectedArguments)
    expect(ingress.privacyInvoke.arguments.map(({ index, name, cairoType }) => ({ index, name, cairoType }))).toEqual(
      wire.sharedPrivacyInvoke.arguments,
    )
    expect(wire.sharedPrivacyInvoke.returnType).toBe('Span<OpenNoteDeposit>')
  })

  it('freezes pool-touching classification and the minimum mainnet evidence set', () => {
    const wire = fixture()

    expect(wire.poolTouching).toEqual({
      bidderAIngress: true,
      bidderBIngress: true,
      revealA: false,
      revealB: false,
      settlement: false,
      loserRefund: true,
      winnerSurplus: true,
      sellerProceedsAuthorization: false,
      sellerProceeds: true,
    })
    expect(wire.mainnetMinimum).toEqual(['bidderAIngress', 'bidderBIngress', 'loserRefund'])
    expect(wire.preferredDemo).toEqual([
      'bidderAIngress',
      'bidderBIngress',
      'revealA',
      'revealB',
      'settlement',
      'loserRefund',
      'winnerSurplus',
      'sellerProceedsAuthorization',
      'sellerProceeds',
    ])
  })

  it('freezes claim outputs, receipt events, and wallet submission ownership', () => {
    const wire = fixture()

    expect(wire.contractOutputs).toEqual({
      loserRefund: {
        length: 1,
        noteId: '${openNoteIds[0]}',
        token: 'payment_token',
        amount: 'cap',
      },
      winnerSurplus: {
        length: 1,
        noteId: '${openNoteIds[0]}',
        token: 'payment_token',
        amount: 'cap - clearing_price',
        zeroAmountBehavior: 'ineligible_no_transaction',
      },
      sellerProceeds: {
        route: 'strk20_open_note',
        length: 1,
        noteId: '${openNoteIds[0]}',
        recipientAuthorization: 'configured_seller_pre_authorized_note_id',
        token: 'payment_token',
        amount: 'clearing_price',
        openNoteDeposits: 1,
      },
    })
    expect(wire.events).toEqual({
      reveal: ['BidRevealed'],
      settlement: ['AuctionSettled', 'ERC721.Transfer'],
      loserRefund: ['OpenNoteCreated', 'LoserRefundClaimed', 'ExternalContractInvoked', 'OpenNoteDeposited'],
      winnerSurplus: ['OpenNoteCreated', 'WinnerSurplusClaimed', 'ExternalContractInvoked', 'OpenNoteDeposited'],
      sellerProceedsAuthorization: ['SellerProceedsAuthorized'],
      sellerProceeds: ['OpenNoteCreated', 'SellerProceedsClaimed', 'ExternalContractInvoked', 'OpenNoteDeposited'],
    })
    expect(wire.submission).toEqual({
      standardCalls: 'walletAccount.execute(call)',
      strk20Claims: 'walletAccount.strk20InvokeTransaction(actions)',
      proofGeneration: 'wallet_for_all_strk20_claims',
      result: ['transaction_hash'],
    })
    expect(wire.sellerAuthorization).toEqual({
      requiredCaller: 'configured_seller',
      preparation: 'strk20PrepareInvoke(actions,true)',
      binds: ['auction_id', 'seller_claim_handle', 'open_note_id'],
      replaceableBeforeClaim: true,
      reprepareAfterAuthorization: true,
      frontRunBehavior: 'copied_secret_can_only_target_authorized_note',
      publicDisclosure: 'seller_to_open_note_id_link',
    })
  })
})
