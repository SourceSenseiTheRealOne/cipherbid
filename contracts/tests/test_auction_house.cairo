#[feature("safe_dispatcher")]

use cipherbid::{
    IAuctionHouseDispatcher, IAuctionHouseDispatcherTrait, IAuctionHouseSafeDispatcher,
    IAuctionHouseSafeDispatcherTrait,
};
use cipherbid::commitment::{compute_bid_commitment, compute_claim_handle};
use snforge_std::{
    ContractClassTrait, DeclareResultTrait, declare, start_cheat_block_timestamp,
    start_cheat_caller_address, stop_cheat_caller_address,
};
use starknet::ContractAddress;

#[starknet::interface]
trait IMockERC721<TContractState> {
    fn approve(ref self: TContractState, spender: ContractAddress, token_id: u256);
    fn transfer_from(
        ref self: TContractState,
        from: ContractAddress,
        to: ContractAddress,
        token_id: u256,
    );
    fn owner_of(self: @TContractState, token_id: u256) -> ContractAddress;
}

#[starknet::contract]
mod MockERC721 {
    use starknet::storage::{Map, StorageMapReadAccess, StorageMapWriteAccess};
    use starknet::{ContractAddress, get_caller_address};
    use super::IMockERC721;

    #[storage]
    struct Storage {
        owners: Map<u256, ContractAddress>,
        approvals: Map<u256, ContractAddress>,
    }

    #[constructor]
    fn constructor(ref self: ContractState, owner: ContractAddress, token_id: u256) {
        self.owners.write(token_id, owner);
    }

    #[abi(embed_v0)]
    impl MockERC721Impl of IMockERC721<ContractState> {
        fn approve(ref self: ContractState, spender: ContractAddress, token_id: u256) {
            assert(self.owners.read(token_id) == get_caller_address(), 'NOT_OWNER');
            self.approvals.write(token_id, spender);
        }

        fn transfer_from(
            ref self: ContractState,
            from: ContractAddress,
            to: ContractAddress,
            token_id: u256,
        ) {
            let owner = self.owners.read(token_id);
            let caller = get_caller_address();
            assert(owner == from, 'BAD_FROM');
            assert(caller == owner || caller == self.approvals.read(token_id), 'NOT_AUTHORIZED');
            self.owners.write(token_id, to);
            self.approvals.write(token_id, 0.try_into().unwrap());
        }

        fn owner_of(self: @ContractState, token_id: u256) -> ContractAddress {
            self.owners.read(token_id)
        }
    }
}

#[starknet::interface]
trait IMockERC20<TContractState> {
    fn mint(ref self: TContractState, recipient: ContractAddress, amount: u256);
    fn approve(ref self: TContractState, spender: ContractAddress, amount: u256) -> bool;
    fn allowance(
        self: @TContractState, owner: ContractAddress, spender: ContractAddress,
    ) -> u256;
    fn pull(
        ref self: TContractState,
        owner: ContractAddress,
        recipient: ContractAddress,
        amount: u256,
    );
    fn balance_of(self: @TContractState, account: ContractAddress) -> u256;
}

#[starknet::contract]
mod MockERC20 {
    use starknet::{ContractAddress, get_caller_address};
    use starknet::storage::{
        Map, StorageMapReadAccess, StorageMapWriteAccess, StoragePointerReadAccess,
        StoragePointerWriteAccess,
    };
    use super::IMockERC20;

    #[storage]
    struct Storage {
        balances: Map<ContractAddress, u256>,
        approved_owner: ContractAddress,
        approved_spender: ContractAddress,
        approved_amount: u256,
    }

    #[abi(embed_v0)]
    impl MockERC20Impl of IMockERC20<ContractState> {
        fn mint(ref self: ContractState, recipient: ContractAddress, amount: u256) {
            self.balances.write(recipient, self.balances.read(recipient) + amount);
        }

        fn approve(ref self: ContractState, spender: ContractAddress, amount: u256) -> bool {
            self.approved_owner.write(get_caller_address());
            self.approved_spender.write(spender);
            self.approved_amount.write(amount);
            true
        }

        fn allowance(
            self: @ContractState, owner: ContractAddress, spender: ContractAddress,
        ) -> u256 {
            if self.approved_owner.read() == owner && self.approved_spender.read() == spender {
                self.approved_amount.read()
            } else {
                0
            }
        }

        fn pull(
            ref self: ContractState,
            owner: ContractAddress,
            recipient: ContractAddress,
            amount: u256,
        ) {
            assert(get_caller_address() == self.approved_spender.read(), 'NOT_SPENDER');
            assert(owner == self.approved_owner.read(), 'BAD_ALLOWANCE_OWNER');
            let allowed = self.approved_amount.read();
            assert(amount <= allowed, 'ALLOWANCE_TOO_LOW');
            self.balances.write(owner, self.balances.read(owner) - amount);
            self.balances.write(recipient, self.balances.read(recipient) + amount);
            self.approved_amount.write(allowed - amount);
        }

        fn balance_of(self: @ContractState, account: ContractAddress) -> u256 {
            self.balances.read(account)
        }
    }
}

fn address(value: felt252) -> ContractAddress {
    value.try_into().unwrap()
}

fn deploy_house(
    pool: ContractAddress, payment_token: ContractAddress, max_bidders: u32,
) -> ContractAddress {
    let contract = declare("AuctionHouse").unwrap().contract_class();
    let mut calldata = array![pool.into(), payment_token.into(), max_bidders.into()];
    let (contract_address, _) = contract.deploy(@calldata).unwrap();
    contract_address
}

fn deploy_nft(owner: ContractAddress, token_id: u256) -> ContractAddress {
    let contract = declare("MockERC721").unwrap().contract_class();
    let mut calldata = array![owner.into(), token_id.low.into(), token_id.high.into()];
    let (contract_address, _) = contract.deploy(@calldata).unwrap();
    contract_address
}

fn deploy_token() -> ContractAddress {
    let contract = declare("MockERC20").unwrap().contract_class();
    let mut calldata = array![];
    let (contract_address, _) = contract.deploy(@calldata).unwrap();
    contract_address
}

#[test]
fn deployment_configuration_is_immutable_and_public() {
    let pool = address(0x123);
    let token = address(0x456);
    let house = deploy_house(pool, token, 32);
    let dispatcher = IAuctionHouseDispatcher { contract_address: house };

    let (configured_pool, configured_token, max_bidders) = dispatcher.get_house_config();
    assert(configured_pool == pool, 'BAD_POOL');
    assert(configured_token == token, 'BAD_TOKEN');
    assert(max_bidders == 32, 'BAD_MAX_BIDDERS');
}

#[test]
fn rejects_invalid_deployment_configuration() {
    let contract = declare("AuctionHouse").unwrap().contract_class();
    let pool = address(0x123);
    let token = address(0x456);

    let mut zero_pool = array![address(0).into(), token.into(), 32];
    assert(contract.deploy(@zero_pool).is_err(), 'ZERO_POOL_ACCEPTED');

    let mut zero_token = array![pool.into(), address(0).into(), 32];
    assert(contract.deploy(@zero_token).is_err(), 'ZERO_TOKEN_ACCEPTED');

    let mut same_addresses = array![pool.into(), pool.into(), 32];
    assert(contract.deploy(@same_addresses).is_err(), 'SAME_ADDRESSES');

    let mut zero_bound = array![pool.into(), token.into(), 0];
    assert(contract.deploy(@zero_bound).is_err(), 'ZERO_BOUND_ACCEPTED');

    let mut excessive_bound = array![pool.into(), token.into(), 33];
    assert(contract.deploy(@excessive_bound).is_err(), 'LARGE_BOUND_ACCEPTED');
}

#[test]
fn creation_custodies_nft_and_freezes_configuration() {
    let seller = address(0x777);
    let pool = address(0x123);
    let payment_token = address(0x456);
    let house = deploy_house(pool, payment_token, 32);
    let token_id: u256 = 99;
    let nft = deploy_nft(seller, token_id);
    let nft_dispatcher = IMockERC721Dispatcher { contract_address: nft };
    start_cheat_caller_address(nft, seller);
    nft_dispatcher.approve(house, token_id);
    stop_cheat_caller_address(nft);

    let dispatcher = IAuctionHouseDispatcher { contract_address: house };
    start_cheat_caller_address(house, seller);
    dispatcher.create_auction(7, 0xabc, nft, token_id, 2, 5, 100, 200, 2);

    assert(nft_dispatcher.owner_of(token_id) == house, 'NFT_NOT_CUSTODIED');
    let config = dispatcher.get_auction_config(7);
    assert(config.auction_id == 7, 'BAD_AUCTION_ID');
    assert(config.seller == seller, 'BAD_SELLER');
    assert(config.seller_claim_handle == 0xabc, 'BAD_SELLER_CLAIM');
    assert(config.nft_contract == nft, 'BAD_NFT');
    assert(config.token_id == token_id, 'BAD_TOKEN_ID');
    assert(config.reserve_price == 2, 'BAD_RESERVE');
    assert(config.cap == 5, 'BAD_CAP');
    assert(config.bidding_deadline == 100, 'BAD_BID_DEADLINE');
    assert(config.reveal_deadline == 200, 'BAD_REVEAL_DEADLINE');
    assert(config.bidder_limit == 2, 'BAD_BIDDER_LIMIT');
}

#[test]
fn failed_custody_rolls_back_creation_and_allows_retry() {
    let seller = address(0x777);
    let house = deploy_house(address(0x123), address(0x456), 32);
    let token_id: u256 = 99;
    let nft = deploy_nft(seller, token_id);
    start_cheat_caller_address(house, seller);

    let safe_dispatcher = IAuctionHouseSafeDispatcher { contract_address: house };
    let failed = safe_dispatcher.create_auction(7, 0xabc, nft, token_id, 2, 5, 100, 200, 2);
    assert(failed.is_err(), 'UNAPPROVED_CUSTODY');

    let nft_dispatcher = IMockERC721Dispatcher { contract_address: nft };
    start_cheat_caller_address(nft, seller);
    nft_dispatcher.approve(house, token_id);
    stop_cheat_caller_address(nft);

    let dispatcher = IAuctionHouseDispatcher { contract_address: house };
    dispatcher.create_auction(7, 0xabc, nft, token_id, 2, 5, 100, 200, 2);
    assert(dispatcher.get_auction_config(7).seller == seller, 'RETRY_NOT_CREATED');
    assert(nft_dispatcher.owner_of(token_id) == house, 'RETRY_NOT_CUSTODIED');
}

#[test]
fn pool_parks_exact_cap_and_records_bounded_bid() {
    let seller = address(0x777);
    let pool = address(0x123);
    let token = deploy_token();
    let house = deploy_house(pool, token, 32);
    let token_id: u256 = 99;
    let nft = deploy_nft(seller, token_id);
    let nft_dispatcher = IMockERC721Dispatcher { contract_address: nft };
    start_cheat_caller_address(nft, seller);
    nft_dispatcher.approve(house, token_id);
    stop_cheat_caller_address(nft);
    let dispatcher = IAuctionHouseDispatcher { contract_address: house };
    start_cheat_caller_address(house, seller);
    dispatcher.create_auction(7, 0xabc, nft, token_id, 2, 5, 100, 200, 2);

    let token_dispatcher = IMockERC20Dispatcher { contract_address: token };
    token_dispatcher.mint(house, 5);
    start_cheat_caller_address(house, pool);
    let deposits = dispatcher.privacy_invoke(0, 7, 0x111, 0x222, 0, 0, pool, 0);

    assert(deposits.is_empty(), 'BID_RETURNED_NOTE');
    assert(dispatcher.get_bid_count(7) == 1, 'BAD_BID_COUNT');
    let bid = dispatcher.get_bid(7, 0);
    assert(bid.commitment == 0x111, 'BAD_COMMITMENT');
    assert(bid.claim_handle == 0x222, 'BAD_CLAIM_HANDLE');
    assert(!bid.revealed, 'BID_ALREADY_REVEALED');
}

#[test]
fn wrong_collateral_amount_reverts_without_consuming_slot() {
    let seller = address(0x777);
    let pool = address(0x123);
    let token = deploy_token();
    let house = deploy_house(pool, token, 32);
    let token_id: u256 = 99;
    let nft = deploy_nft(seller, token_id);
    let nft_dispatcher = IMockERC721Dispatcher { contract_address: nft };
    start_cheat_caller_address(nft, seller);
    nft_dispatcher.approve(house, token_id);
    stop_cheat_caller_address(nft);
    let dispatcher = IAuctionHouseDispatcher { contract_address: house };
    start_cheat_caller_address(house, seller);
    dispatcher.create_auction(7, 0xabc, nft, token_id, 2, 5, 100, 200, 2);

    let token_dispatcher = IMockERC20Dispatcher { contract_address: token };
    token_dispatcher.mint(house, 4);
    start_cheat_caller_address(house, pool);
    let safe = IAuctionHouseSafeDispatcher { contract_address: house };
    assert(safe.privacy_invoke(0, 7, 0x111, 0x222, 0, 0, pool, 0).is_err(), 'SHORT_CAP');

    token_dispatcher.mint(house, 1);
    dispatcher.privacy_invoke(0, 7, 0x111, 0x222, 0, 0, pool, 0);
    assert(dispatcher.get_bid_count(7) == 1, 'FAILED_BID_CONSUMED_SLOT');
}

#[test]
fn reveal_recomputes_commitment_and_persists_public_bid_data_once() {
    let seller = address(0x777);
    let pool = address(0x123);
    let token = deploy_token();
    let house = deploy_house(pool, token, 32);
    let token_id: u256 = 99;
    let nft = deploy_nft(seller, token_id);
    let nft_dispatcher = IMockERC721Dispatcher { contract_address: nft };
    start_cheat_caller_address(nft, seller);
    nft_dispatcher.approve(house, token_id);
    stop_cheat_caller_address(nft);
    let dispatcher = IAuctionHouseDispatcher { contract_address: house };
    start_cheat_caller_address(house, seller);
    dispatcher.create_auction(7, 0xabc, nft, token_id, 2, 5, 100, 200, 2);

    let claim_handle = 0x222;
    let bid_nonce = 0x333;
    let recipient = address(0x888);
    let commitment = compute_bid_commitment(
        'SN_SEPOLIA', house, 7, 3, bid_nonce, claim_handle, recipient,
    );
    IMockERC20Dispatcher { contract_address: token }.mint(house, 5);
    start_cheat_caller_address(house, pool);
    dispatcher.privacy_invoke(0, 7, commitment, claim_handle, 0, 0, pool, 0);

    start_cheat_block_timestamp(house, 100);
    dispatcher.reveal_bid(7, 0, 3, bid_nonce, recipient);
    let bid = dispatcher.get_bid(7, 0);
    assert(bid.revealed, 'BID_NOT_REVEALED');
    assert(bid.amount == 3, 'BAD_REVEALED_AMOUNT');
    assert(bid.asset_recipient == recipient, 'BAD_RECIPIENT');

    let safe = IAuctionHouseSafeDispatcher { contract_address: house };
    assert(safe.reveal_bid(7, 0, 3, bid_nonce, recipient).is_err(), 'DOUBLE_REVEAL');
}

#[test]
fn settlement_delivers_nft_and_records_vickrey_price() {
    let seller = address(0x777);
    let pool = address(0x123);
    let token = deploy_token();
    let house = deploy_house(pool, token, 32);
    let token_id: u256 = 99;
    let nft = deploy_nft(seller, token_id);
    let nft_dispatcher = IMockERC721Dispatcher { contract_address: nft };
    start_cheat_caller_address(nft, seller);
    nft_dispatcher.approve(house, token_id);
    stop_cheat_caller_address(nft);
    let dispatcher = IAuctionHouseDispatcher { contract_address: house };
    start_cheat_caller_address(house, seller);
    let seller_secret = 0x551;
    let seller_handle = compute_claim_handle(seller_secret);
    dispatcher.create_auction(7, seller_handle, nft, token_id, 2, 5, 100, 200, 2);

    let recipient_a = address(0x881);
    let recipient_b = address(0x882);
    let secret_a = 0x541;
    let secret_b = 0x542;
    let handle_a = compute_claim_handle(secret_a);
    let handle_b = compute_claim_handle(secret_b);
    let commitment_a = compute_bid_commitment(
        'SN_SEPOLIA', house, 7, 3, 0x331, handle_a, recipient_a,
    );
    let commitment_b = compute_bid_commitment(
        'SN_SEPOLIA', house, 7, 4, 0x332, handle_b, recipient_b,
    );
    let token_dispatcher = IMockERC20Dispatcher { contract_address: token };
    start_cheat_caller_address(house, pool);
    token_dispatcher.mint(house, 5);
    dispatcher.privacy_invoke(0, 7, commitment_a, handle_a, 0, 0, pool, 0);
    token_dispatcher.mint(house, 5);
    dispatcher.privacy_invoke(0, 7, commitment_b, handle_b, 0, 0, pool, 0);

    start_cheat_block_timestamp(house, 100);
    dispatcher.reveal_bid(7, 0, 3, 0x331, recipient_a);
    dispatcher.reveal_bid(7, 1, 4, 0x332, recipient_b);
    start_cheat_block_timestamp(house, 200);
    dispatcher.settle_auction(7);

    let state = dispatcher.get_auction_state(7);
    assert(state.settled, 'NOT_SETTLED');
    assert(state.sold, 'NOT_SOLD');
    assert(state.winner_index == 1, 'BAD_WINNER');
    assert(state.winner_recipient == recipient_b, 'BAD_WINNER_RECIPIENT');
    assert(state.clearing_price == 3, 'BAD_CLEARING_PRICE');
    assert(state.seller_entitlement == 3, 'BAD_SELLER_ENTITLEMENT');
    assert(nft_dispatcher.owner_of(token_id) == recipient_b, 'NFT_NOT_DELIVERED');

    start_cheat_caller_address(house, seller);
    dispatcher.authorize_seller_proceeds(7, seller_handle, 0x903);
    start_cheat_caller_address(house, pool);
    let safe = IAuctionHouseSafeDispatcher { contract_address: house };
    assert(
        safe.privacy_invoke(3, 7, seller_secret, seller_handle, 0, 0, pool, 0x999).is_err(),
        'SELLER_REDIRECT_ACCEPTED',
    );

    let loser = dispatcher.privacy_invoke(1, 7, secret_a, handle_a, 0, 0, pool, 0x901);
    assert(loser.len() == 1, 'BAD_LOSER_OUTPUTS');
    let loser_deposit = *loser.at(0);
    assert(loser_deposit.note_id == 0x901, 'BAD_LOSER_NOTE');
    assert(loser_deposit.token == token, 'BAD_LOSER_TOKEN');
    assert(loser_deposit.amount == 5, 'BAD_LOSER_AMOUNT');
    assert(token_dispatcher.allowance(house, pool) == 5, 'BAD_LOSER_APPROVAL');
    start_cheat_caller_address(token, pool);
    token_dispatcher.pull(house, pool, 5);
    stop_cheat_caller_address(token);
    assert(
        safe.privacy_invoke(1, 7, secret_a, handle_a, 0, 0, pool, 0x904).is_err(),
        'LOSER_REPLAY_ACCEPTED',
    );

    assert(
        safe.privacy_invoke(1, 7, secret_b, handle_b, 0, 0, pool, 0x902).is_err(),
        'WINNER_AS_LOSER',
    );
    let surplus = dispatcher.privacy_invoke(2, 7, secret_b, handle_b, 0, 0, pool, 0x902);
    assert(surplus.len() == 1, 'BAD_SURPLUS_OUTPUTS');
    let surplus_deposit = *surplus.at(0);
    assert(surplus_deposit.note_id == 0x902, 'BAD_SURPLUS_NOTE');
    assert(surplus_deposit.amount == 2, 'BAD_SURPLUS_AMOUNT');
    assert(token_dispatcher.allowance(house, pool) == 2, 'BAD_SURPLUS_APPROVAL');
    start_cheat_caller_address(token, pool);
    token_dispatcher.pull(house, pool, 2);
    stop_cheat_caller_address(token);

    let proceeds = dispatcher.privacy_invoke(
        3, 7, seller_secret, seller_handle, 0, 0, pool, 0x903,
    );
    assert(proceeds.len() == 1, 'BAD_SELLER_OUTPUTS');
    let proceeds_deposit = *proceeds.at(0);
    assert(proceeds_deposit.note_id == 0x903, 'BAD_SELLER_NOTE');
    assert(proceeds_deposit.amount == 3, 'BAD_SELLER_AMOUNT');
    assert(token_dispatcher.allowance(house, pool) == 3, 'BAD_SELLER_APPROVAL');
    start_cheat_caller_address(token, pool);
    token_dispatcher.pull(house, pool, 3);
    stop_cheat_caller_address(token);
    assert(
        safe.privacy_invoke(3, 7, seller_secret, seller_handle, 0, 0, pool, 0x903).is_err(),
        'SELLER_REPLAY_ACCEPTED',
    );

    assert(token_dispatcher.balance_of(house) == 0, 'COLLATERAL_STRANDED');
    assert(dispatcher.get_accounted_payment_balance() == 0, 'ACCOUNTING_NOT_ZERO');
}

#[test]
fn equal_bids_use_earliest_accepted_index() {
    let seller = address(0x777);
    let pool = address(0x123);
    let token = deploy_token();
    let house = deploy_house(pool, token, 32);
    let token_id: u256 = 100;
    let nft = deploy_nft(seller, token_id);
    let nft_dispatcher = IMockERC721Dispatcher { contract_address: nft };
    start_cheat_caller_address(nft, seller);
    nft_dispatcher.approve(house, token_id);
    stop_cheat_caller_address(nft);
    let dispatcher = IAuctionHouseDispatcher { contract_address: house };
    start_cheat_caller_address(house, seller);
    dispatcher.create_auction(8, compute_claim_handle(0x601), nft, token_id, 2, 5, 100, 200, 2);

    let recipient_a = address(0x891);
    let recipient_b = address(0x892);
    let handle_a = compute_claim_handle(0x611);
    let handle_b = compute_claim_handle(0x612);
    let commitment_a = compute_bid_commitment(
        'SN_SEPOLIA', house, 8, 4, 0x621, handle_a, recipient_a,
    );
    let commitment_b = compute_bid_commitment(
        'SN_SEPOLIA', house, 8, 4, 0x622, handle_b, recipient_b,
    );
    let token_dispatcher = IMockERC20Dispatcher { contract_address: token };
    start_cheat_caller_address(house, pool);
    token_dispatcher.mint(house, 5);
    dispatcher.privacy_invoke(0, 8, commitment_a, handle_a, 0, 0, pool, 0);
    token_dispatcher.mint(house, 5);
    dispatcher.privacy_invoke(0, 8, commitment_b, handle_b, 0, 0, pool, 0);
    start_cheat_block_timestamp(house, 100);
    dispatcher.reveal_bid(8, 0, 4, 0x621, recipient_a);
    dispatcher.reveal_bid(8, 1, 4, 0x622, recipient_b);
    start_cheat_block_timestamp(house, 200);
    dispatcher.settle_auction(8);

    let state = dispatcher.get_auction_state(8);
    assert(state.winner_index == 0, 'TIE_NOT_EARLIEST');
    assert(state.clearing_price == 4, 'BAD_TIE_PRICE');
    assert(nft_dispatcher.owner_of(token_id) == recipient_a, 'TIE_NFT_MISDELIVERED');
}

#[test]
fn no_sale_returns_nft_and_unrevealed_bid_gets_full_cap() {
    let seller = address(0x777);
    let pool = address(0x123);
    let token = deploy_token();
    let house = deploy_house(pool, token, 32);
    let token_id: u256 = 101;
    let nft = deploy_nft(seller, token_id);
    let nft_dispatcher = IMockERC721Dispatcher { contract_address: nft };
    start_cheat_caller_address(nft, seller);
    nft_dispatcher.approve(house, token_id);
    stop_cheat_caller_address(nft);
    let dispatcher = IAuctionHouseDispatcher { contract_address: house };
    start_cheat_caller_address(house, seller);
    dispatcher.create_auction(9, compute_claim_handle(0x701), nft, token_id, 3, 5, 100, 200, 1);

    let secret = 0x711;
    let handle = compute_claim_handle(secret);
    let recipient = address(0x899);
    let commitment = compute_bid_commitment(
        'SN_SEPOLIA', house, 9, 2, 0x721, handle, recipient,
    );
    let token_dispatcher = IMockERC20Dispatcher { contract_address: token };
    token_dispatcher.mint(house, 5);
    start_cheat_caller_address(house, pool);
    dispatcher.privacy_invoke(0, 9, commitment, handle, 0, 0, pool, 0);
    start_cheat_block_timestamp(house, 200);
    dispatcher.settle_auction(9);

    let state = dispatcher.get_auction_state(9);
    assert(state.settled && !state.sold, 'EXPECTED_NO_SALE');
    assert(state.seller_entitlement == 0, 'NO_SALE_SELLER_VALUE');
    assert(nft_dispatcher.owner_of(token_id) == seller, 'NFT_NOT_RETURNED');

    let refund = dispatcher.privacy_invoke(1, 9, secret, handle, 0, 0, pool, 0x909);
    assert(refund.len() == 1, 'BAD_NO_SALE_OUTPUTS');
    assert((*refund.at(0)).amount == 5, 'BAD_NO_SALE_REFUND');
    assert(token_dispatcher.allowance(house, pool) == 5, 'BAD_NO_SALE_APPROVAL');
    start_cheat_caller_address(token, pool);
    token_dispatcher.pull(house, pool, 5);
    stop_cheat_caller_address(token);
    assert(token_dispatcher.balance_of(house) == 0, 'NO_SALE_COLLATERAL_STRANDED');
    assert(dispatcher.get_accounted_payment_balance() == 0, 'NO_SALE_ACCOUNTING');
}
