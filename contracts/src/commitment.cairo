use core::poseidon::poseidon_hash_span;

const CLAIM_DOMAIN: felt252 = 'CIPHERBID_CLAIM_V1';
const BID_DOMAIN: felt252 = 'CIPHERBID_BID_V1';

pub fn compute_claim_handle(claim_secret: felt252) -> felt252 {
    assert(claim_secret != 0, 'ZERO_CLAIM_SECRET');
    poseidon_hash_span(array![CLAIM_DOMAIN, claim_secret].span())
}

pub fn compute_bid_commitment(
    chain_id: felt252,
    auction_house: felt252,
    auction_id: u64,
    amount: u128,
    bid_secret: felt252,
    claim_handle: felt252,
    asset_recipient: felt252,
) -> felt252 {
    assert(chain_id != 0, 'ZERO_CHAIN_ID');
    assert(auction_house != 0, 'ZERO_AUCTION_HOUSE');
    assert(amount != 0, 'ZERO_BID_AMOUNT');
    assert(bid_secret != 0, 'ZERO_BID_SECRET');
    assert(claim_handle != 0, 'ZERO_CLAIM_HANDLE');
    assert(asset_recipient != 0, 'ZERO_RECIPIENT');

    poseidon_hash_span(
        array![
            BID_DOMAIN, chain_id, auction_house, auction_id.into(), amount.into(), bid_secret,
            claim_handle, asset_recipient,
        ]
            .span(),
    )
}
