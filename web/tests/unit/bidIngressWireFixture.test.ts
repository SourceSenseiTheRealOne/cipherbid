import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { buildPlaceBidActions } from '@/features/privacy/strk20Actions'

type WireArgument = Readonly<{
  index: number
  name: string
  cairoType: string
  sampleValue: string
}>

type BidIngressWireFixture = Readonly<{
  schema: 'cipherbid.bid-ingress.v1'
  sample: Readonly<{
    auctionId: string
    paymentToken: `0x${string}`
    cap: string
    commitment: string
    claimHandle: string
    auctionHouse: `0x${string}`
  }>
  actions: readonly unknown[]
  placeholders: Readonly<{
    poolAddress: readonly string[]
    openNoteIds: readonly string[]
  }>
  privacyInvoke: Readonly<{
    selector: 'privacy_invoke'
    arguments: readonly WireArgument[]
    returnType: 'Span<OpenNoteDeposit>'
    expectedLength: 0
  }>
  submission: Readonly<{
    preflight: string
    preflightProof: 'empty'
    submit: string
    proofGeneration: 'wallet'
    signature: 'wallet'
    broadcast: 'wallet'
  }>
  receipt: Readonly<{
    requiredPoolEvents: readonly string[]
    requiredAuctionEvents: readonly string[]
    forbiddenPoolEvents: readonly string[]
    walletResultFields: readonly string[]
  }>
  privacyBoundary: Readonly<{
    appReceives: readonly string[]
    appNeverReceives: readonly string[]
  }>
}>

const repositoryRoot = resolve(process.cwd(), '..')
const fixturePath = resolve(process.cwd(), 'tests/fixtures/bid-ingress-v1.json')
const cairoSourcePath = resolve(repositoryRoot, 'contracts/src/lib.cairo')

function loadFixture(): BidIngressWireFixture {
  return JSON.parse(readFileSync(fixturePath, 'utf8')) as BidIngressWireFixture
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

describe('bid ingress v1 cross-layer fixture', () => {
  it('pins the exact withdraw then invoke action and every calldata position', () => {
    const fixture = loadFixture()
    const actions = buildPlaceBidActions({
      auctionId: BigInt(fixture.sample.auctionId),
      paymentToken: fixture.sample.paymentToken,
      cap: BigInt(fixture.sample.cap),
      commitment: BigInt(fixture.sample.commitment),
      claimHandle: BigInt(fixture.sample.claimHandle),
      auctionHouse: fixture.sample.auctionHouse,
    })

    expect(fixture.schema).toBe('cipherbid.bid-ingress.v1')
    expect(actions).toEqual(fixture.actions)
    expect(actions.map((action) => action.type)).toEqual(['withdraw', 'invoke'])

    const invoke = actions[1]
    expect(invoke.type).toBe('invoke')
    if (invoke.type !== 'invoke') throw new Error('Bid ingress action 1 must be invoke')

    expect(fixture.privacyInvoke.arguments.map(({ index }) => index)).toEqual(
      fixture.privacyInvoke.arguments.map((_, index) => index),
    )
    expect(invoke.calldata).toHaveLength(fixture.privacyInvoke.arguments.length)
    for (const argument of fixture.privacyInvoke.arguments) {
      expect(invoke.calldata[argument.index]).toBe(argument.sampleValue)
    }
  })

  it('pins the Cairo ABI argument order and the empty OpenNoteDeposit return', () => {
    const fixture = loadFixture()
    const cairoSource = readFileSync(cairoSourcePath, 'utf8')

    expect(privacyInvokeArguments(cairoSource)).toEqual(
      fixture.privacyInvoke.arguments.map(({ name, cairoType }) => ({ name, cairoType })),
    )
    expect(fixture.privacyInvoke.returnType).toBe('Span<OpenNoteDeposit>')
    expect(fixture.privacyInvoke.expectedLength).toBe(0)
  })

  it('uses only the literal pool placeholder and freezes receipt/privacy boundaries', () => {
    const fixture = loadFixture()
    const serializedActions = JSON.stringify(fixture.actions)

    expect(fixture.placeholders.poolAddress).toEqual(['actions[1].calldata[6]'])
    expect(fixture.placeholders.openNoteIds).toEqual([])
    expect(serializedActions.match(/\$\{poolAddress\}/g)).toHaveLength(1)
    expect(serializedActions).not.toContain('${openNoteIds[')

    expect(fixture.receipt.requiredPoolEvents).toEqual(['Withdrawal', 'ExternalContractInvoked'])
    expect(fixture.receipt.requiredAuctionEvents).toEqual(['BidCommitted'])
    expect(fixture.receipt.forbiddenPoolEvents).toEqual(['OpenNoteCreated', 'OpenNoteDeposited'])
    expect(fixture.receipt.walletResultFields).toEqual(['transaction_hash'])
    expect(fixture.submission).toEqual({
      preflight: 'strk20PrepareInvoke(actions, true)',
      preflightProof: 'empty',
      submit: 'strk20InvokeTransaction(actions)',
      proofGeneration: 'wallet',
      signature: 'wallet',
      broadcast: 'wallet',
    })
    expect(fixture.privacyBoundary.appReceives).toEqual(['transaction_hash'])
    expect(fixture.privacyBoundary.appNeverReceives).toEqual([
      'viewing_key',
      'private_notes',
      'wallet_private_key',
      'proof_data',
      'proof_output',
      'proof_facts',
    ])
  })
})
