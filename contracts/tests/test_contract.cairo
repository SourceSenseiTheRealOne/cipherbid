use cipherbid::{IAuctionIngressSpikeDispatcher, IAuctionIngressSpikeDispatcherTrait};
use snforge_std::{ContractClassTrait, DeclareResultTrait, declare, start_cheat_caller_address};
use starknet::ContractAddress;

fn address(value: felt252) -> ContractAddress {
    value.try_into().unwrap()
}

fn deploy_contract(pool: ContractAddress, cap: u128) -> ContractAddress {
    let contract = declare("AuctionIngressSpike").unwrap().contract_class();
    let mut calldata = array![pool.into(), cap.into()];
    let (contract_address, _) = contract.deploy(@calldata).unwrap();
    contract_address
}

#[test]
fn pool_can_park_bid_collateral_without_returning_an_open_note() {
    let pool = address(0x123);
    let contract_address = deploy_contract(pool, 5);
    start_cheat_caller_address(contract_address, pool);
    let dispatcher = IAuctionIngressSpikeDispatcher { contract_address };

    let deposits = dispatcher.privacy_invoke(0, 7, 101, 202, 0, 0, pool, 0);

    assert(deposits.len() == 0, 'BID_MUST_PARK');
    let (operation, auction_id, commitment, claim_handle) = dispatcher.get_spike_state();
    assert(operation == 0, 'BAD_OPERATION');
    assert(auction_id == 7, 'BAD_AUCTION');
    assert(commitment == 101, 'BAD_COMMITMENT');
    assert(claim_handle == 202, 'BAD_CLAIM');
}

#[test]
fn pool_can_route_a_no_value_reveal() {
    let pool = address(0x123);
    let contract_address = deploy_contract(pool, 5);
    start_cheat_caller_address(contract_address, pool);
    let dispatcher = IAuctionIngressSpikeDispatcher { contract_address };

    let deposits = dispatcher.privacy_invoke(1, 7, 3, 404, 202, 0x333, pool, 0);

    assert(deposits.len() == 0, 'REVEAL_MOVED_VALUE');
    let (operation, auction_id, amount, bid_secret) = dispatcher.get_spike_state();
    assert(operation == 1, 'BAD_OPERATION');
    assert(auction_id == 7, 'BAD_AUCTION');
    assert(amount == 3, 'BAD_AMOUNT');
    assert(bid_secret == 404, 'BAD_SECRET');
}

#[test]
#[should_panic(expected: 'CALLER_NOT_POOL')]
fn direct_caller_cannot_drive_the_spike() {
    let pool = address(0x123);
    let attacker = address(0x456);
    let contract_address = deploy_contract(pool, 5);
    start_cheat_caller_address(contract_address, attacker);
    let dispatcher = IAuctionIngressSpikeDispatcher { contract_address };

    dispatcher.privacy_invoke(0, 7, 101, 202, 0, 0, pool, 0);
}

#[test]
fn configured_uniform_cap_is_public() {
    let pool = address(0x123);
    let contract_address = deploy_contract(pool, 5);
    let dispatcher = IAuctionIngressSpikeDispatcher { contract_address };

    assert(dispatcher.get_cap() == 5, 'BAD_CAP');
}

#[test]
fn rejects_zero_uniform_cap() {
    let contract = declare("AuctionIngressSpike").unwrap().contract_class();
    let mut calldata = array![address(0x123).into(), 0];

    assert(contract.deploy(@calldata).is_err(), 'ZERO_CAP_ACCEPTED');
}
