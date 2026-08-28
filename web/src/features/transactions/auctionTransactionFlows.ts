import type { WALLET_API } from '@starknet-io/types-js'
import { num, type Call } from 'starknet'
import {
  buildAuthorizeSellerProceedsCall,
  buildRevealBidCall,
  buildSettleAuctionCall,
} from '@/features/auction/lifecycleCalls'
import { buildPlaceBidActions, type HexAddress } from '@/features/privacy/strk20Actions'
import {
  buildLoserRefundActions,
  buildSellerProceedsActions,
  buildWinnerSurplusActions,
} from '@/features/privacy/strk20ClaimActions'
import type {
  BidderCredential,
  CipherBidCredential,
  SellerCredential,
} from '@/features/credentials/credentials'
import { createVerifiedRecoveryBundle } from '@/features/credentials/recoveryBundle'
import {
  TransactionOrchestrator,
  type WalletSnapshot,
} from '@/features/transactions/transactionOrchestrator'

export type VerifiedRecoveryExport = Readonly<{
  serialized: string
  bundleId: `0x${string}`
  credentialCount: number
}>

export type StandardWallet = Readonly<{
  execute: (calls: Call | readonly Call[]) => Promise<unknown>
}>

export type PrivacyWallet = StandardWallet &
  Readonly<{
    strk20InvokeTransaction: (actions: readonly WALLET_API.STRK20_ACTION[]) => Promise<unknown>
    strk20PrepareInvoke?: (actions: readonly WALLET_API.STRK20_ACTION[], simulateOnly: boolean) => Promise<unknown>
  }>

type BaseFlow = Readonly<{
  orchestrator: TransactionOrchestrator
  expectedWallet: WalletSnapshot
  getWalletSnapshot: () => Promise<WalletSnapshot>
}>

type Verify<Evidence> = (transactionHash: string) => Promise<Evidence>

const felt = (value: bigint) => num.toHex(value)
const address = (value: bigint) => num.toHex(value) as HexAddress

function transactionHash(response: unknown): string {
  if (typeof response !== 'object' || response === null) throw new Error('Wallet returned an invalid response')
  const record = response as Record<string, unknown>
  const value = record.transaction_hash ?? record.transactionHash
  if (typeof value !== 'string') throw new Error('Wallet returned no transaction hash')
  return value
}

function u256(value: bigint): readonly [string, string] {
  if (value < 0n || value >= 1n << 256n) throw new Error('Token ID must fit u256')
  return [felt(value & ((1n << 128n) - 1n)), felt(value >> 128n)]
}

function assertCredentialWallet(credential: CipherBidCredential, wallet: WalletSnapshot): void {
  try {
    if (credential.chainId !== BigInt(wallet.chainId)) throw new Error('Credential chain does not match wallet')
  } catch {
    throw new Error('Credential chain does not match wallet')
  }
}

export function extractResolvedSellerOpenNoteId(
  prepared: unknown,
  credential: SellerCredential,
  poolAddress: HexAddress,
): bigint {
  if (typeof prepared !== 'object' || prepared === null) throw new Error('Prepared STRK20 call is malformed')
  const call = (prepared as Record<string, unknown>).call
  if (typeof call !== 'object' || call === null) throw new Error('Prepared STRK20 call is malformed')
  const calldata = (call as Record<string, unknown>).calldata
  if (!Array.isArray(calldata) || !calldata.every((item) => typeof item === 'string')) {
    throw new Error('Prepared STRK20 calldata is malformed')
  }
  const expected = [
    3n,
    credential.auctionId,
    credential.claimSecret,
    credential.claimHandle,
    0n,
    0n,
    BigInt(poolAddress),
  ]
  const matches: bigint[] = []
  for (let start = 0; start + expected.length < calldata.length; start += 1) {
    let exact = true
    for (let offset = 0; offset < expected.length; offset += 1) {
      try {
        if (BigInt(calldata[start + offset] as string) !== expected[offset]) exact = false
      } catch {
        exact = false
      }
    }
    if (exact) {
      const openNoteId = BigInt(calldata[start + expected.length] as string)
      if (openNoteId > 0n) matches.push(openNoteId)
    }
  }
  if (matches.length !== 1) throw new Error('Prepared STRK20 call does not contain one resolved seller open-note ID')
  return matches[0]
}

export async function runSellerCreationFlow<Evidence>(
  input: BaseFlow &
    Readonly<{
      wallet: StandardWallet
      credential: SellerCredential
      recoveryPassword: string
      onRecoveryReady: (bundle: VerifiedRecoveryExport) => Promise<void>
      nftContract: HexAddress
      tokenId: bigint
      reservePrice: bigint
      cap: bigint
      biddingDeadline: bigint
      revealDeadline: bigint
      bidderLimit: bigint
      verify: Verify<Evidence>
    }>,
) {
  assertCredentialWallet(input.credential, input.expectedWallet)
  let recovery: VerifiedRecoveryExport | undefined
  const evidence = await input.orchestrator.run({
    operationId: `create:${input.credential.auctionId}`,
    expectedWallet: input.expectedWallet,
    getWalletSnapshot: input.getWalletSnapshot,
    prepare: async () => {
      recovery = await createVerifiedRecoveryBundle([input.credential], input.recoveryPassword)
      await input.onRecoveryReady(recovery)
      const [tokenLow, tokenHigh] = u256(input.tokenId)
      return [
        {
          contractAddress: input.nftContract,
          entrypoint: 'approve',
          calldata: [address(input.credential.auctionHouse), tokenLow, tokenHigh],
        },
        {
          contractAddress: address(input.credential.auctionHouse),
          entrypoint: 'create_auction',
          calldata: [
            felt(input.credential.auctionId),
            felt(input.credential.claimHandle),
            input.nftContract,
            tokenLow,
            tokenHigh,
            felt(input.reservePrice),
            felt(input.cap),
            felt(input.biddingDeadline),
            felt(input.revealDeadline),
            felt(input.bidderLimit),
          ],
        },
      ] satisfies readonly Call[]
    },
    submit: async (calls) => transactionHash(await input.wallet.execute(calls)),
    verify: input.verify,
  })
  if (!recovery) throw new Error('Recovery export was not created')
  return Object.freeze({ evidence, credential: input.credential, recovery })
}

export async function runPrivateBidFlow<Evidence>(
  input: BaseFlow &
    Readonly<{
      wallet: PrivacyWallet
      credential: BidderCredential
      recoveryPassword: string
      onRecoveryReady: (bundle: VerifiedRecoveryExport) => Promise<void>
      paymentToken: HexAddress
      cap: bigint
      verify: Verify<Evidence>
    }>,
) {
  assertCredentialWallet(input.credential, input.expectedWallet)
  if (input.credential.amount > input.cap) throw new Error('Bid amount exceeds collateral cap')
  let recovery: VerifiedRecoveryExport | undefined
  const evidence = await input.orchestrator.run({
    operationId: `bid:${input.credential.auctionId}`,
    expectedWallet: input.expectedWallet,
    getWalletSnapshot: input.getWalletSnapshot,
    prepare: async () => {
      recovery = await createVerifiedRecoveryBundle([input.credential], input.recoveryPassword)
      await input.onRecoveryReady(recovery)
      return buildPlaceBidActions({
        auctionId: input.credential.auctionId,
        paymentToken: input.paymentToken,
        cap: input.cap,
        commitment: input.credential.commitment,
        claimHandle: input.credential.claimHandle,
        auctionHouse: address(input.credential.auctionHouse),
      })
    },
    submit: async (actions) => transactionHash(await input.wallet.strk20InvokeTransaction(actions)),
    verify: input.verify,
  })
  if (!recovery) throw new Error('Recovery export was not created')
  return Object.freeze({ evidence, credential: input.credential, recovery })
}

export async function runRevealFlow<Evidence>(
  input: BaseFlow & Readonly<{ wallet: StandardWallet; credential: BidderCredential; verify: Verify<Evidence> }>,
) {
  assertCredentialWallet(input.credential, input.expectedWallet)
  if (input.credential.acceptedIndex === undefined) throw new Error('Bid accepted index is required for reveal')
  return input.orchestrator.run({
    operationId: `reveal:${input.credential.auctionId}:${input.credential.acceptedIndex}`,
    expectedWallet: input.expectedWallet,
    getWalletSnapshot: input.getWalletSnapshot,
    prepare: async () =>
      buildRevealBidCall({
        auctionId: input.credential.auctionId,
        acceptedIndex: BigInt(input.credential.acceptedIndex!),
        amount: input.credential.amount,
        bidNonce: input.credential.bidNonce,
        assetRecipient: address(input.credential.assetRecipient),
        auctionHouse: address(input.credential.auctionHouse),
      }),
    submit: async (call) => transactionHash(await input.wallet.execute(call)),
    verify: input.verify,
  })
}

export async function runSettlementFlow<Evidence>(
  input: BaseFlow &
    Readonly<{
      wallet: StandardWallet
      auctionHouse: HexAddress
      auctionId: bigint
      verify: Verify<Evidence>
    }>,
) {
  return input.orchestrator.run({
    operationId: `settle:${input.auctionId}`,
    expectedWallet: input.expectedWallet,
    getWalletSnapshot: input.getWalletSnapshot,
    prepare: async () => buildSettleAuctionCall(input),
    submit: async (call) => transactionHash(await input.wallet.execute(call)),
    verify: input.verify,
  })
}

export type BidderClaimKind = 'loser_refund' | 'winner_surplus'

export async function runPrivateClaimFlow<Evidence>(
  input: BaseFlow &
    Readonly<{
      wallet: PrivacyWallet
      kind: BidderClaimKind
      credential: BidderCredential
      paymentToken: HexAddress
      recipient: HexAddress
      verify: Verify<Evidence>
    }>,
) {
  assertCredentialWallet(input.credential, input.expectedWallet)
  const build = input.kind === 'loser_refund' ? buildLoserRefundActions : buildWinnerSurplusActions
  return input.orchestrator.run({
    operationId: `${input.kind}:${input.credential.auctionId}`,
    expectedWallet: input.expectedWallet,
    getWalletSnapshot: input.getWalletSnapshot,
    prepare: async () =>
      build({
        auctionId: input.credential.auctionId,
        paymentToken: input.paymentToken,
        claimSecret: input.credential.claimSecret,
        claimHandle: input.credential.claimHandle,
        auctionHouse: address(input.credential.auctionHouse),
        recipient: input.recipient,
      }),
    submit: async (actions) => transactionHash(await input.wallet.strk20InvokeTransaction(actions)),
    verify: input.verify,
  })
}

export async function runSellerClaimFlow<AuthorizationEvidence, ClaimEvidence>(
  input: BaseFlow &
    Readonly<{
      wallet: Required<PrivacyWallet>
      credential: SellerCredential
      paymentToken: HexAddress
      recipient: HexAddress
      extractOpenNoteId: (prepared: unknown) => bigint
      verifyAuthorization: Verify<AuthorizationEvidence>
      verifyClaim: Verify<ClaimEvidence>
    }>,
) {
  assertCredentialWallet(input.credential, input.expectedWallet)
  const actions = buildSellerProceedsActions({
    auctionId: input.credential.auctionId,
    paymentToken: input.paymentToken,
    claimSecret: input.credential.claimSecret,
    claimHandle: input.credential.claimHandle,
    auctionHouse: address(input.credential.auctionHouse),
    recipient: input.recipient,
  })
  let authorizedOpenNoteId: bigint | undefined
  const authorizationEvidence = await input.orchestrator.run({
    operationId: `seller-authorize:${input.credential.auctionId}`,
    expectedWallet: input.expectedWallet,
    getWalletSnapshot: input.getWalletSnapshot,
    prepare: async () => {
      authorizedOpenNoteId = input.extractOpenNoteId(await input.wallet.strk20PrepareInvoke(actions, true))
      if (authorizedOpenNoteId <= 0n) throw new Error('Wallet preparation returned an invalid open-note ID')
      return buildAuthorizeSellerProceedsCall({
        auctionId: input.credential.auctionId,
        claimHandle: input.credential.claimHandle,
        openNoteId: authorizedOpenNoteId,
        auctionHouse: address(input.credential.auctionHouse),
      })
    },
    submit: async (call) => transactionHash(await input.wallet.execute(call)),
    verify: input.verifyAuthorization,
  })
  if (authorizedOpenNoteId === undefined) throw new Error('Seller note authorization was not prepared')

  const claimEvidence = await input.orchestrator.run({
    operationId: `seller-claim:${input.credential.auctionId}`,
    expectedWallet: input.expectedWallet,
    getWalletSnapshot: input.getWalletSnapshot,
    prepare: async () => {
      const preparedOpenNoteId = input.extractOpenNoteId(await input.wallet.strk20PrepareInvoke(actions, true))
      if (preparedOpenNoteId !== authorizedOpenNoteId) {
        throw new Error('Prepared seller open-note ID changed after authorization')
      }
      return actions
    },
    submit: async (preparedActions) =>
      transactionHash(await input.wallet.strk20InvokeTransaction(preparedActions)),
    verify: input.verifyClaim,
  })

  return Object.freeze({ authorizationEvidence, claimEvidence, authorizedOpenNoteId })
}
