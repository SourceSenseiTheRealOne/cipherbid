import { hash, RpcProvider } from 'starknet'
import { evaluateDemoBidderReadiness, type DemoBidderStatus, type PublicDeposit } from '@/features/auction/demoBidderReadiness'
import { MAINNET_STRK20_POOL, STRK_TOKEN } from '@/config/deployment'
import { MAINNET_BIDDER_A, MAINNET_BIDDER_B, buildMainnetReleaseCandidate } from '@/config/mainnetRelease'

const RPC_URL = 'https://api.zan.top/public/starknet-mainnet/rpc/v0_10'
const RELEASE_BLOCK_FLOOR = 14_017_934
const DEPOSIT_SELECTOR = hash.getSelectorFromName('Deposit')
const BIDDER_ACCOUNTS = Object.freeze([
  { name: 'mainnet-bidder-a', address: MAINNET_BIDDER_A },
  { name: 'mainnet-bidder-b', address: MAINNET_BIDDER_B },
])

function callValues(value: readonly string[] | Readonly<{ result: readonly string[] }>): readonly string[] {
  return 'result' in value ? value.result : value
}

async function publicDeposits(
  provider: RpcProvider,
  bidderAddress: `0x${string}`,
): Promise<readonly PublicDeposit[]> {
  const deposits: PublicDeposit[] = []
  let continuationToken: string | undefined
  do {
    const page = await provider.getEvents({
      from_block: { block_number: RELEASE_BLOCK_FLOOR },
      to_block: 'latest',
      address: MAINNET_STRK20_POOL,
      keys: [[DEPOSIT_SELECTOR], [bidderAddress], [STRK_TOKEN]],
      chunk_size: 100,
      ...(continuationToken ? { continuation_token: continuationToken } : {}),
    })
    for (const event of page.events) {
      if (event.block_number === undefined || event.data[0] === undefined) {
        throw new Error('STRK20 deposit event is missing accepted block or amount data')
      }
      deposits.push(
        Object.freeze({
          amount: BigInt(event.data[0]),
          blockNumber: event.block_number,
          transactionHash: event.transaction_hash as `0x${string}`,
        }),
      )
    }
    continuationToken = page.continuation_token
  } while (continuationToken)
  return Object.freeze(deposits)
}

function printableStatus(status: DemoBidderStatus) {
  return {
    ...status,
    depositAmount: status.depositAmount?.toString(),
    privateBalanceVerified: false,
  }
}

async function main(): Promise<void> {
  const provider = new RpcProvider({ nodeUrl: RPC_URL })
  const latestBlock = await provider.getBlockNumber()
  const feeResponse = await provider.callContract({
    contractAddress: MAINNET_STRK20_POOL,
    entrypoint: 'get_fee_amount',
  })
  const [feeValue] = callValues(feeResponse)
  if (!feeValue) throw new Error('STRK20 returned no pool fee')
  const candidate = buildMainnetReleaseCandidate(BigInt(feeValue))
  const bidders = await Promise.all(
    BIDDER_ACCOUNTS.map(async (bidder) => {
      const response = await provider.callContract({
        contractAddress: MAINNET_STRK20_POOL,
        entrypoint: 'get_public_key',
        calldata: [bidder.address],
      })
      const [publicKey] = callValues(response)
      if (!publicKey) throw new Error(`STRK20 returned no public key for ${bidder.name}`)
      return {
        ...bidder,
        publicKey: publicKey as `0x${string}`,
        deposits: await publicDeposits(provider, bidder.address),
      }
    }),
  )
  const readiness = evaluateDemoBidderReadiness({
    bidders,
    latestBlock,
    minimumPublicDeposit: candidate.bidderShieldTarget,
  })
  console.log(
    JSON.stringify(
      {
        schema: 'cipherbid.mainnet-bidder-public-readiness.v1',
        latestBlock,
        releaseBlockFloor: RELEASE_BLOCK_FLOOR,
        livePoolFee: candidate.poolFee.toString(),
        requiredPublicDeposit: candidate.bidderShieldTarget.toString(),
        ready: readiness.ready,
        statuses: readiness.statuses.map(printableStatus),
        note: 'Public registration and deposit maturity only; Ready X remains authoritative for unspent private balance.',
      },
      null,
      2,
    ),
  )
  if (!readiness.ready) {
    const blockers = readiness.statuses.flatMap((status) =>
      status.blockers.map((blocker) => `${status.name}: ${blocker}`),
    )
    throw new Error(`Mainnet bidder preflight failed before any auction write:\n${blockers.join('\n')}`)
  }
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
