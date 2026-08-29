use cipherbid::commitment::{compute_bid_commitment, compute_claim_handle};

const CHAIN_ID: felt252 = 'SN_SEPOLIA';
const AUCTION_HOUSE: felt252 = 0x222;
const AUCTION_ID: u64 = 7;
const AMOUNT: u128 = 3000000000000000000;
const BID_NONCE: felt252 = 987654321;
const CLAIM_HANDLE: felt252 = 0x3078725b5aaffe73f545ebca32c0b5a4af14404599edd691c752e59ffca3724;
const ASSET_RECIPIENT: felt252 = 0x333;

fn commitment(
    chain_id: felt252,
    auction_house: felt252,
    auction_id: u64,
    amount: u128,
    bid_nonce: felt252,
    claim_handle: felt252,
    asset_recipient: felt252,
) -> felt252 {
    compute_bid_commitment(
        chain_id,
        auction_house.try_into().expect('INVALID_AUCTION_HOUSE'),
        auction_id,
        amount,
        bid_nonce,
        claim_handle,
        asset_recipient.try_into().expect('INVALID_RECIPIENT'),
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
            CHAIN_ID, AUCTION_HOUSE, AUCTION_ID, AMOUNT, BID_NONCE, CLAIM_HANDLE, ASSET_RECIPIENT,
        ) == 0x34fe5ddb49c604d4b8b63f768c4d6e4159bdd4166bdc3e1e7094217c9f6313e,
        'BAD_BID_VECTOR',
    );
}

#[test]
fn every_bid_domain_field_changes_the_commitment() {
    let expected = commitment(
        CHAIN_ID, AUCTION_HOUSE, AUCTION_ID, AMOUNT, BID_NONCE, CLAIM_HANDLE, ASSET_RECIPIENT,
    );
    assert(
        commitment(
            CHAIN_ID + 1,
            AUCTION_HOUSE,
            AUCTION_ID,
            AMOUNT,
            BID_NONCE,
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
            BID_NONCE,
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
            BID_NONCE,
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
            BID_NONCE,
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
            BID_NONCE + 1,
            CLAIM_HANDLE,
            ASSET_RECIPIENT,
        ) != expected,
        'BID_NONCE_NOT_BOUND',
    );
    assert(
        commitment(
            CHAIN_ID,
            AUCTION_HOUSE,
            AUCTION_ID,
            AMOUNT,
            BID_NONCE,
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
            BID_NONCE,
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
#[should_panic(expected: 'ZERO_BID_NONCE')]
fn rejects_zero_bid_nonce() {
    commitment(CHAIN_ID, AUCTION_HOUSE, AUCTION_ID, AMOUNT, 0, CLAIM_HANDLE, ASSET_RECIPIENT);
}

#[test]
#[should_panic(expected: 'ZERO_CLAIM_HANDLE')]
fn rejects_zero_claim_handle() {
    commitment(CHAIN_ID, AUCTION_HOUSE, AUCTION_ID, AMOUNT, BID_NONCE, 0, ASSET_RECIPIENT);
}

#[test]
#[should_panic(expected: 'ZERO_BID_AMOUNT')]
fn rejects_zero_bid_amount() {
    commitment(CHAIN_ID, AUCTION_HOUSE, AUCTION_ID, 0, BID_NONCE, CLAIM_HANDLE, ASSET_RECIPIENT);
}

#[test]
fn matches_minimum_and_maximum_boundary_vectors() {
    let minimum_claim_handle = compute_claim_handle(1);
    assert(
        minimum_claim_handle == 0x6b7f8ff6dee712dbd900e4e0269931a6dc86de5359e13dc740ca1898d110b48,
        'BAD_MIN_CLAIM_VECTOR',
    );
    assert(
        commitment(
            1, 1, 1, 1, 1, minimum_claim_handle, 1,
        ) == 0x5c8b0026c8ddfd09e47cba64881b66d371c620d84b0e573f811ec2334526848,
        'BAD_MIN_BID_VECTOR',
    );

    let max_felt = 0x800000000000011000000000000000000000000000000000000000000000000;
    let max_address = 0x7ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff;
    let maximum_claim_handle = compute_claim_handle(max_felt);
    assert(
        maximum_claim_handle == 0x51f784d5ce10bdf76e3c632882ba6e181464bd8f4493fd9e7bfc44c6deefd34,
        'BAD_MAX_CLAIM_VECTOR',
    );
    assert(
        commitment(
            max_felt,
            max_address,
            0xffffffffffffffff,
            0xffffffffffffffffffffffffffffffff,
            max_felt,
            maximum_claim_handle,
            max_address,
        ) == 0x1dc855fa1871e1425360884f6b03c77837f2c5d47e551f86b55af0e0f8fa1b5,
        'BAD_MAX_BID_VECTOR',
    );
}

#[test]
#[should_panic(expected: 'ZERO_AUCTION_ID')]
fn rejects_zero_auction_id() {
    commitment(CHAIN_ID, AUCTION_HOUSE, 0, AMOUNT, BID_NONCE, CLAIM_HANDLE, ASSET_RECIPIENT);
}

#[test]
#[should_panic(expected: 'ZERO_CHAIN_ID')]
fn rejects_zero_chain_id() {
    commitment(0, AUCTION_HOUSE, AUCTION_ID, AMOUNT, BID_NONCE, CLAIM_HANDLE, ASSET_RECIPIENT);
}

#[test]
#[should_panic(expected: 'ZERO_AUCTION_HOUSE')]
fn rejects_zero_auction_house() {
    commitment(CHAIN_ID, 0, AUCTION_ID, AMOUNT, BID_NONCE, CLAIM_HANDLE, ASSET_RECIPIENT);
}

#[test]
#[should_panic(expected: 'ZERO_RECIPIENT')]
fn rejects_zero_recipient() {
    commitment(CHAIN_ID, AUCTION_HOUSE, AUCTION_ID, AMOUNT, BID_NONCE, CLAIM_HANDLE, 0);
}

#[test]
#[should_panic(expected: 'INVALID_AUCTION_HOUSE')]
fn rejects_out_of_range_auction_house() {
    commitment(
        CHAIN_ID,
        0x800000000000000000000000000000000000000000000000000000000000000,
        AUCTION_ID,
        AMOUNT,
        BID_NONCE,
        CLAIM_HANDLE,
        ASSET_RECIPIENT,
    );
}

#[test]
#[should_panic(expected: 'INVALID_RECIPIENT')]
fn rejects_out_of_range_recipient() {
    commitment(
        CHAIN_ID,
        AUCTION_HOUSE,
        AUCTION_ID,
        AMOUNT,
        BID_NONCE,
        CLAIM_HANDLE,
        0x800000000000000000000000000000000000000000000000000000000000000,
    );
}
