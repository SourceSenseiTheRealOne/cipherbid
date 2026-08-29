use cipherbid::demo_erc721::{
    IDemoERC721Dispatcher, IDemoERC721DispatcherTrait, IDemoERC721SafeDispatcher,
    IDemoERC721SafeDispatcherTrait,
};
use snforge_std::{
    ContractClassTrait, DeclareResultTrait, declare, start_cheat_caller_address,
    stop_cheat_caller_address,
};
use starknet::ContractAddress;

fn address(value: felt252) -> ContractAddress {
    value.try_into().unwrap()
}

fn deploy_demo(owner: ContractAddress, token_id: u256) -> ContractAddress {
    let contract = declare("DemoERC721").unwrap().contract_class();
    let mut calldata = array![owner.into(), token_id.low.into(), token_id.high.into()];
    let (contract_address, _) = contract.deploy(@calldata).unwrap();
    contract_address
}

#[test]
fn constructor_mints_one_approved_transferable_demo_token() {
    let seller = address(0x777);
    let auction_house = address(0x123);
    let recipient = address(0x888);
    let token_id: u256 = 99;
    let nft = deploy_demo(seller, token_id);
    let dispatcher = IDemoERC721Dispatcher { contract_address: nft };

    assert(dispatcher.owner_of(token_id) == seller, 'BAD_INITIAL_OWNER');
    assert(dispatcher.balance_of(seller) == 1, 'BAD_INITIAL_BALANCE');

    start_cheat_caller_address(nft, seller);
    dispatcher.approve(auction_house, token_id);
    stop_cheat_caller_address(nft);
    assert(dispatcher.get_approved(token_id) == auction_house, 'BAD_APPROVAL');

    start_cheat_caller_address(nft, auction_house);
    dispatcher.transfer_from(seller, recipient, token_id);
    stop_cheat_caller_address(nft);

    assert(dispatcher.owner_of(token_id) == recipient, 'BAD_TRANSFER_OWNER');
    assert(dispatcher.balance_of(seller) == 0, 'SELLER_BALANCE_NOT_CLEARED');
    assert(dispatcher.balance_of(recipient) == 1, 'RECIPIENT_BALANCE_NOT_SET');
    assert(dispatcher.get_approved(token_id) == address(0), 'APPROVAL_NOT_CLEARED');
}

#[test]
#[feature("safe_dispatcher")]
fn unauthorized_transfer_and_zero_owner_deployment_are_rejected() {
    let seller = address(0x777);
    let attacker = address(0x666);
    let token_id: u256 = 99;
    let nft = deploy_demo(seller, token_id);
    let safe_dispatcher = IDemoERC721SafeDispatcher { contract_address: nft };

    start_cheat_caller_address(nft, attacker);
    let unauthorized = safe_dispatcher.transfer_from(seller, attacker, token_id);
    stop_cheat_caller_address(nft);
    assert(unauthorized.is_err(), 'UNAUTHORIZED_TRANSFER');

    let contract = declare("DemoERC721").unwrap().contract_class();
    let mut zero_owner = array![address(0).into(), token_id.low.into(), token_id.high.into()];
    assert(contract.deploy(@zero_owner).is_err(), 'ZERO_OWNER_ACCEPTED');
}
