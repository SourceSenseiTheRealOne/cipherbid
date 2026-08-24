use cipherbid::commitment::{compute_bid_commitment, compute_claim_handle};

const CHAIN_ID: felt252 = 'SN_SEPOLIA';
const AUCTION_HOUSE: felt252 = 0x222;
const AUCTION_ID: u64 = 7;
const AMOUNT: u128 = 3000000000000000000;
const BID_SECRET: felt252 = 987654321;
const CLAIM_HANDLE: felt252 = 0x3078725b5aaffe73f545ebca32c0b5a4af14404599edd691c752e59ffca3724;
const ASSET_RECIPIENT: felt252 = 0x333;

fn commitment(
    chain_id: felt252,
    auction_house: felt252,
    auction_id: u64,
    amount: u128,
    bid_secret: felt252,
    claim_handle: felt252,
    asset_recipient: felt252,
) -> felt252 {
    compute_bid_commitment(
        chain_id, auction_house, auction_id, amount, bid_secret, claim_handle, asset_recipient,
    )
}

#[test]
fn matches_frozen_typescript_poseidon_vectors() {
    assert(
        compute_claim_handle(
            123456789,
        ) == 0x3078725b5aaffe73f545ebca32c0b5a4af14404599edd691c752e59ffca3724,
        'BAD_CLAIM_VECTOR',
    );
    assert(
        commitment(
            CHAIN_ID, AUCTION_HOUSE, AUCTION_ID, AMOUNT, BID_SECRET, CLAIM_HANDLE, ASSET_RECIPIENT,
        ) == 0x34fe5ddb49c604d4b8b63f768c4d6e4159bdd4166bdc3e1e7094217c9f6313e,
        'BAD_BID_VECTOR',
    );
}

#[test]
fn every_bid_domain_field_changes_the_commitment() {
    let expected = commitment(
        CHAIN_ID, AUCTION_HOUSE, AUCTION_ID, AMOUNT, BID_SECRET, CLAIM_HANDLE, ASSET_RECIPIENT,
    );
    assert(
        commitment(
            CHAIN_ID + 1,
            AUCTION_HOUSE,
            AUCTION_ID,
            AMOUNT,
            BID_SECRET,
            CLAIM_HANDLE,
            ASSET_RECIPIENT,
        ) != expected,
        'CHAIN_NOT_BOUND',
    );
    assert(
        commitment(
            CHAIN_ID,
            AUCTION_HOUSE + 1,
            AUCTION_ID,
            AMOUNT,
            BID_SECRET,
            CLAIM_HANDLE,
            ASSET_RECIPIENT,
        ) != expected,
        'HOUSE_NOT_BOUND',
    );
    assert(
        commitment(
            CHAIN_ID,
            AUCTION_HOUSE,
            AUCTION_ID + 1,
            AMOUNT,
            BID_SECRET,
            CLAIM_HANDLE,
            ASSET_RECIPIENT,
        ) != expected,
        'AUCTION_NOT_BOUND',
    );
    assert(
        commitment(
            CHAIN_ID,
            AUCTION_HOUSE,
            AUCTION_ID,
            AMOUNT + 1,
            BID_SECRET,
            CLAIM_HANDLE,
            ASSET_RECIPIENT,
        ) != expected,
        'AMOUNT_NOT_BOUND',
    );
    assert(
        commitment(
            CHAIN_ID,
            AUCTION_HOUSE,
            AUCTION_ID,
            AMOUNT,
            BID_SECRET + 1,
            CLAIM_HANDLE,
            ASSET_RECIPIENT,
        ) != expected,
        'BID_SECRET_NOT_BOUND',
    );
    assert(
        commitment(
            CHAIN_ID,
            AUCTION_HOUSE,
            AUCTION_ID,
            AMOUNT,
            BID_SECRET,
            CLAIM_HANDLE + 1,
            ASSET_RECIPIENT,
        ) != expected,
        'CLAIM_NOT_BOUND',
    );
    assert(
        commitment(
            CHAIN_ID,
            AUCTION_HOUSE,
            AUCTION_ID,
            AMOUNT,
            BID_SECRET,
            CLAIM_HANDLE,
            ASSET_RECIPIENT + 1,
        ) != expected,
        'RECIPIENT_NOT_BOUND',
    );
}

#[test]
#[should_panic(expected: 'ZERO_CLAIM_SECRET')]
fn rejects_zero_claim_secret() {
    compute_claim_handle(0);
}

#[test]
#[should_panic(expected: 'ZERO_BID_SECRET')]
fn rejects_zero_bid_secret() {
    commitment(CHAIN_ID, AUCTION_HOUSE, AUCTION_ID, AMOUNT, 0, CLAIM_HANDLE, ASSET_RECIPIENT);
}

#[test]
#[should_panic(expected: 'ZERO_CLAIM_HANDLE')]
fn rejects_zero_claim_handle() {
    commitment(CHAIN_ID, AUCTION_HOUSE, AUCTION_ID, AMOUNT, BID_SECRET, 0, ASSET_RECIPIENT);
}

#[test]
#[should_panic(expected: 'ZERO_BID_AMOUNT')]
fn rejects_zero_bid_amount() {
    commitment(CHAIN_ID, AUCTION_HOUSE, AUCTION_ID, 0, BID_SECRET, CLAIM_HANDLE, ASSET_RECIPIENT);
}
