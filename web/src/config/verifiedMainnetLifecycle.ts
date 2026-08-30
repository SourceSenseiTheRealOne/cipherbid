type PublishedReceipt = Readonly<{
  label: string
  transactionHash: `0x${string}`
  finalityStatus: 'ACCEPTED_ON_L2'
  blockNumber: number
}>

const VERIFIED_AUCTION_ID = '1788040057342'

const VERIFIED_MAINNET_RECEIPTS: readonly PublishedReceipt[] = Object.freeze([
  Object.freeze({
    label: 'Auction creation',
    transactionHash: '0x79f62ae22728e4f69182df0b52de903efe863ce10f5685809a8b3df926d20b7',
    finalityStatus: 'ACCEPTED_ON_L2',
    blockNumber: 14_066_134,
  }),
  Object.freeze({
    label: 'Bidder A private bid',
    transactionHash: '0x70a5ca96744778f5c7f8d1b9b353deafad4dfcbacb218b28721667a759ce245',
    finalityStatus: 'ACCEPTED_ON_L2',
    blockNumber: 14_066_346,
  }),
  Object.freeze({
    label: 'Bidder B private bid',
    transactionHash: '0x52376bbde2b895e5e241b5385baf491293c7fec799d777ad332e3def0677fd4',
    finalityStatus: 'ACCEPTED_ON_L2',
    blockNumber: 14_066_470,
  }),
  Object.freeze({
    label: 'Bidder A reveal',
    transactionHash: '0x4ba193bde7a631a4f0b330633aded56ddabf0b457a040c0ca1303dd00675c5c',
    finalityStatus: 'ACCEPTED_ON_L2',
    blockNumber: 14_066_530,
  }),
  Object.freeze({
    label: 'Bidder B reveal',
    transactionHash: '0x25123dc40fe62121154204482aaa86e0a03885cd7185a50500190962858659b',
    finalityStatus: 'ACCEPTED_ON_L2',
    blockNumber: 14_066_581,
  }),
  Object.freeze({
    label: 'Settlement',
    transactionHash: '0x883f852f91052cc25dee8e30a7ce04996db7ccaca015d4bb2d5e2826602cbf',
    finalityStatus: 'ACCEPTED_ON_L2',
    blockNumber: 14_066_773,
  }),
  Object.freeze({
    label: 'Winner surplus',
    transactionHash: '0x4a76360a895ce3f984ee7ab704be0e5c2c220c5584ad05704bb338f2fff540d',
    finalityStatus: 'ACCEPTED_ON_L2',
    blockNumber: 14_066_957,
  }),
  Object.freeze({
    label: 'Loser refund',
    transactionHash: '0x7bbe0489702cdc6466b7aa4c262d7d1f34dcabace16e47c5b02cafef7fff15e',
    finalityStatus: 'ACCEPTED_ON_L2',
    blockNumber: 14_067_030,
  }),
])

export function verifiedReceiptsForAuction(
  network: 'sepolia' | 'mainnet',
  auctionId: string,
): readonly PublishedReceipt[] {
  return network === 'mainnet' && auctionId === VERIFIED_AUCTION_ID ? VERIFIED_MAINNET_RECEIPTS : []
}
