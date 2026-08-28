pub mod commitment;
pub mod demo_erc721;
use starknet::ContractAddress;

#[derive(Copy, Drop, Serde, starknet::Store)]
pub struct AuctionConfig {
    pub auction_id: u64,
    pub seller: ContractAddress,
    pub seller_claim_handle: felt252,
    pub nft_contract: ContractAddress,
    pub token_id: u256,
    pub reserve_price: u128,
    pub cap: u128,
    pub bidding_deadline: u64,
    pub reveal_deadline: u64,
    pub bidder_limit: u32,
}

#[derive(Copy, Drop, Serde)]
pub struct OpenNoteDeposit {
    pub note_id: felt252,
    pub token: ContractAddress,
    pub amount: u128,
}

#[derive(Copy, Drop, Serde, starknet::Store)]
pub struct BidRecord {
    pub commitment: felt252,
    pub claim_handle: felt252,
    pub revealed: bool,
    pub amount: u128,
    pub asset_recipient: ContractAddress,
}

#[derive(Copy, Drop, Serde, starknet::Store)]
pub struct AuctionState {
    pub settled: bool,
    pub sold: bool,
    pub winner_index: u32,
    pub winner_commitment: felt252,
    pub winner_recipient: ContractAddress,
    pub clearing_price: u128,
    pub seller_entitlement: u128,
    pub seller_authorized_note: felt252,
    pub seller_claim_consumed: bool,
}

#[starknet::interface]
pub trait IERC721<TContractState> {
    fn transfer_from(
        ref self: TContractState,
        from: ContractAddress,
        to: ContractAddress,
        token_id: u256,
    );
    fn owner_of(self: @TContractState, token_id: u256) -> ContractAddress;
}

#[starknet::interface]
pub trait IERC20<TContractState> {
    fn approve(ref self: TContractState, spender: ContractAddress, amount: u256) -> bool;
    fn balance_of(self: @TContractState, account: ContractAddress) -> u256;
}

#[starknet::interface]
pub trait IAuctionHouse<TContractState> {
    fn get_house_config(self: @TContractState) -> (ContractAddress, ContractAddress, u32);
    fn create_auction(
        ref self: TContractState,
        auction_id: u64,
        seller_claim_handle: felt252,
        nft_contract: ContractAddress,
        token_id: u256,
        reserve_price: u128,
        cap: u128,
        bidding_deadline: u64,
        reveal_deadline: u64,
        bidder_limit: u32,
    );
    fn get_auction_config(self: @TContractState, auction_id: u64) -> AuctionConfig;
    fn privacy_invoke(
        ref self: TContractState,
        operation: u8,
        auction_id: u64,
        primary_value: felt252,
        claim_handle: felt252,
        reserved_0: felt252,
        reserved_1: felt252,
        pool_address: ContractAddress,
        open_note_id: felt252,
    ) -> Span<OpenNoteDeposit>;
    fn get_bid_count(self: @TContractState, auction_id: u64) -> u32;
    fn get_bid(self: @TContractState, auction_id: u64, accepted_index: u32) -> BidRecord;
    fn reveal_bid(
        ref self: TContractState,
        auction_id: u64,
        accepted_index: u32,
        amount: u128,
        bid_nonce: felt252,
        asset_recipient: ContractAddress,
    );
    fn settle_auction(ref self: TContractState, auction_id: u64);
    fn get_auction_state(self: @TContractState, auction_id: u64) -> AuctionState;
    fn authorize_seller_proceeds(
        ref self: TContractState,
        auction_id: u64,
        seller_claim_handle: felt252,
        open_note_id: felt252,
    );
    fn get_accounted_payment_balance(self: @TContractState) -> u128;
}

#[starknet::contract]
mod AuctionHouse {
    use core::poseidon::poseidon_hash_span;
    use starknet::storage::{
        Map, StorageMapReadAccess, StorageMapWriteAccess, StoragePointerReadAccess,
        StoragePointerWriteAccess,
    };
    use starknet::{
        ContractAddress, get_block_timestamp, get_caller_address, get_contract_address,
        get_tx_info,
    };
    use super::{
        AuctionConfig, AuctionState, BidRecord, IAuctionHouse, IERC20Dispatcher,
        IERC20DispatcherTrait, IERC721Dispatcher, IERC721DispatcherTrait, OpenNoteDeposit,
    };
    use crate::commitment::{compute_bid_commitment, compute_claim_handle};

    const MAX_SUPPORTED_BIDDERS: u32 = 32;
    const BID_SLOT_DOMAIN: felt252 = 'CIPHERBID_SLOT_V1';
    const COMMITMENT_KEY_DOMAIN: felt252 = 'CIPHERBID_COMMIT_KEY_V1';
    const CLAIM_KEY_DOMAIN: felt252 = 'CIPHERBID_CLAIM_KEY_V1';

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        AuctionCreated: AuctionCreated,
        BidCommitted: BidCommitted,
        BidRevealed: BidRevealed,
        AuctionSettled: AuctionSettled,
        SellerProceedsAuthorized: SellerProceedsAuthorized,
        LoserRefundClaimed: LoserRefundClaimed,
        WinnerSurplusClaimed: WinnerSurplusClaimed,
        SellerProceedsClaimed: SellerProceedsClaimed,
    }

    #[derive(Drop, starknet::Event)]
    struct AuctionCreated {
        #[key]
        auction_id: u64,
        #[key]
        seller: ContractAddress,
        seller_claim_handle: felt252,
        nft_contract: ContractAddress,
        token_id: u256,
        reserve_price: u128,
        cap: u128,
        bidding_deadline: u64,
        reveal_deadline: u64,
        bidder_limit: u32,
    }

    #[derive(Drop, starknet::Event)]
    struct BidCommitted {
        #[key]
        auction_id: u64,
        #[key]
        accepted_index: u32,
        commitment: felt252,
        claim_handle: felt252,
        cap: u128,
    }

    #[derive(Drop, starknet::Event)]
    struct BidRevealed {
        #[key]
        auction_id: u64,
        #[key]
        accepted_index: u32,
        amount: u128,
        asset_recipient: ContractAddress,
    }

    #[derive(Drop, starknet::Event)]
    struct AuctionSettled {
        #[key]
        auction_id: u64,
        sold: bool,
        winner_index: u32,
        winner_commitment: felt252,
        winner_recipient: ContractAddress,
        clearing_price: u128,
        seller_entitlement: u128,
    }

    #[derive(Drop, starknet::Event)]
    struct SellerProceedsAuthorized {
        #[key]
        auction_id: u64,
        seller_claim_handle: felt252,
        open_note_id: felt252,
    }

    #[derive(Drop, starknet::Event)]
    struct LoserRefundClaimed {
        #[key]
        auction_id: u64,
        claim_handle: felt252,
        open_note_id: felt252,
        amount: u128,
    }

    #[derive(Drop, starknet::Event)]
    struct WinnerSurplusClaimed {
        #[key]
        auction_id: u64,
        claim_handle: felt252,
        open_note_id: felt252,
        amount: u128,
    }

    #[derive(Drop, starknet::Event)]
    struct SellerProceedsClaimed {
        #[key]
        auction_id: u64,
        seller_claim_handle: felt252,
        open_note_id: felt252,
        amount: u128,
    }

    #[storage]
    struct Storage {
        pool: ContractAddress,
        payment_token: ContractAddress,
        max_bidders: u32,
        auction_exists: Map<u64, bool>,
        auctions: Map<u64, AuctionConfig>,
        bid_counts: Map<u64, u32>,
        bids: Map<felt252, BidRecord>,
        commitment_seen: Map<felt252, bool>,
        claim_handle_seen: Map<felt252, bool>,
        claim_handle_index_plus_one: Map<felt252, u32>,
        bidder_claim_consumed: Map<felt252, bool>,
        accounted_payment_balance: u128,
        auction_states: Map<u64, AuctionState>,
    }

    #[constructor]
    fn constructor(
        ref self: ContractState,
        pool: ContractAddress,
        payment_token: ContractAddress,
        max_bidders: u32,
    ) {
        let pool_felt: felt252 = pool.into();
        let payment_token_felt: felt252 = payment_token.into();
        assert(pool_felt != 0, 'ZERO_POOL');
        assert(payment_token_felt != 0, 'ZERO_TOKEN');
        assert(pool != payment_token, 'POOL_IS_TOKEN');
        assert(max_bidders != 0, 'ZERO_MAX_BIDDERS');
        assert(max_bidders <= MAX_SUPPORTED_BIDDERS, 'MAX_BIDDERS_TOO_HIGH');

        self.pool.write(pool);
        self.payment_token.write(payment_token);
        self.max_bidders.write(max_bidders);
    }

    #[abi(embed_v0)]
    impl AuctionHouseImpl of IAuctionHouse<ContractState> {
        fn get_house_config(self: @ContractState) -> (ContractAddress, ContractAddress, u32) {
            (self.pool.read(), self.payment_token.read(), self.max_bidders.read())
        }

        fn create_auction(
            ref self: ContractState,
            auction_id: u64,
            seller_claim_handle: felt252,
            nft_contract: ContractAddress,
            token_id: u256,
            reserve_price: u128,
            cap: u128,
            bidding_deadline: u64,
            reveal_deadline: u64,
            bidder_limit: u32,
        ) {
            let seller = get_caller_address();
            let seller_felt: felt252 = seller.into();
            let nft_felt: felt252 = nft_contract.into();
            assert(auction_id != 0, 'ZERO_AUCTION_ID');
            assert(seller_felt != 0, 'ZERO_SELLER');
            assert(seller_claim_handle != 0, 'ZERO_SELLER_CLAIM');
            assert(nft_felt != 0, 'ZERO_NFT');
            assert(reserve_price != 0, 'ZERO_RESERVE');
            assert(cap != 0, 'ZERO_CAP');
            assert(reserve_price <= cap, 'RESERVE_ABOVE_CAP');
            assert(get_block_timestamp() < bidding_deadline, 'BIDDING_NOT_FUTURE');
            assert(bidding_deadline < reveal_deadline, 'BAD_DEADLINES');
            assert(bidder_limit != 0, 'ZERO_BIDDER_LIMIT');
            assert(bidder_limit <= self.max_bidders.read(), 'BIDDER_LIMIT_TOO_HIGH');
            assert(!self.auction_exists.read(auction_id), 'AUCTION_EXISTS');

            let config = AuctionConfig {
                auction_id,
                seller,
                seller_claim_handle,
                nft_contract,
                token_id,
                reserve_price,
                cap,
                bidding_deadline,
                reveal_deadline,
                bidder_limit,
            };
            self.auction_exists.write(auction_id, true);
            self.auctions.write(auction_id, config);
            self.emit(
                AuctionCreated {
                    auction_id,
                    seller,
                    seller_claim_handle,
                    nft_contract,
                    token_id,
                    reserve_price,
                    cap,
                    bidding_deadline,
                    reveal_deadline,
                    bidder_limit,
                },
            );

            let house = get_contract_address();
            let nft = IERC721Dispatcher { contract_address: nft_contract };
            nft.transfer_from(seller, house, token_id);
            assert(nft.owner_of(token_id) == house, 'NFT_NOT_CUSTODIED');
        }

        fn get_auction_config(self: @ContractState, auction_id: u64) -> AuctionConfig {
            assert(self.auction_exists.read(auction_id), 'AUCTION_NOT_FOUND');
            self.auctions.read(auction_id)
        }

        fn privacy_invoke(
            ref self: ContractState,
            operation: u8,
            auction_id: u64,
            primary_value: felt252,
            claim_handle: felt252,
            reserved_0: felt252,
            reserved_1: felt252,
            pool_address: ContractAddress,
            open_note_id: felt252,
        ) -> Span<OpenNoteDeposit> {
            let configured_pool = self.pool.read();
            assert(get_caller_address() == configured_pool, 'CALLER_NOT_POOL');
            assert(pool_address == configured_pool, 'BAD_POOL');
            assert(reserved_0 == 0 && reserved_1 == 0, 'RESERVED_NOT_ZERO');
            assert(self.auction_exists.read(auction_id), 'AUCTION_NOT_FOUND');
            let config = self.auctions.read(auction_id);

            if operation == 0 {
                assert(open_note_id == 0, 'BID_NOTE_NOT_ZERO');
                assert(primary_value != 0, 'ZERO_COMMITMENT');
                assert(claim_handle != 0, 'ZERO_CLAIM_HANDLE');
                assert(claim_handle != config.seller_claim_handle, 'SELLER_HANDLE_REUSED');
                assert(get_block_timestamp() < config.bidding_deadline, 'BIDDING_CLOSED');
                let accepted_index = self.bid_counts.read(auction_id);
                assert(accepted_index < config.bidder_limit, 'BIDDER_LIMIT_REACHED');

                let commitment_key = value_key(COMMITMENT_KEY_DOMAIN, auction_id, primary_value);
                let claim_key = value_key(CLAIM_KEY_DOMAIN, auction_id, claim_handle);
                assert(!self.commitment_seen.read(commitment_key), 'DUPLICATE_COMMITMENT');
                assert(!self.claim_handle_seen.read(claim_key), 'DUPLICATE_CLAIM_HANDLE');

                let previous_balance = self.accounted_payment_balance.read();
                let next_balance = previous_balance + config.cap;
                let actual_balance = IERC20Dispatcher {
                    contract_address: self.payment_token.read(),
                }
                    .balance_of(get_contract_address());
                let expected_balance: u256 = next_balance.into();
                assert(actual_balance == expected_balance, 'BAD_COLLATERAL_DELTA');

                let zero_address: ContractAddress = 0.try_into().unwrap();
                self.bids.write(
                    bid_key(auction_id, accepted_index),
                    BidRecord {
                        commitment: primary_value,
                        claim_handle,
                        revealed: false,
                        amount: 0,
                        asset_recipient: zero_address,
                    },
                );
                self.commitment_seen.write(commitment_key, true);
                self.claim_handle_seen.write(claim_key, true);
                self.claim_handle_index_plus_one.write(claim_key, accepted_index + 1);
                self.bid_counts.write(auction_id, accepted_index + 1);
                self.accounted_payment_balance.write(next_balance);
                self.emit(
                    BidCommitted {
                        auction_id,
                        accepted_index,
                        commitment: primary_value,
                        claim_handle,
                        cap: config.cap,
                    },
                );

                let deposits: Array<OpenNoteDeposit> = array![];
                return deposits.span();
            }

            assert(operation == 1 || operation == 2 || operation == 3, 'BAD_OPERATION');
            assert(open_note_id != 0, 'ZERO_OPEN_NOTE');
            assert(primary_value != 0, 'ZERO_CLAIM_SECRET');
            assert(claim_handle != 0, 'ZERO_CLAIM_HANDLE');
            assert(compute_claim_handle(primary_value) == claim_handle, 'BAD_CLAIM_SECRET');
            let mut state = self.auction_states.read(auction_id);
            assert(state.settled, 'AUCTION_NOT_SETTLED');

            let amount = if operation == 3 {
                assert(state.sold, 'NO_SELLER_PROCEEDS');
                assert(claim_handle == config.seller_claim_handle, 'BAD_SELLER_HANDLE');
                assert(!state.seller_claim_consumed, 'SELLER_CLAIM_CONSUMED');
                assert(state.seller_authorized_note == open_note_id, 'UNAUTHORIZED_SELLER_NOTE');
                assert(state.seller_entitlement != 0, 'ZERO_SELLER_PROCEEDS');
                state.seller_claim_consumed = true;
                self.auction_states.write(auction_id, state);
                state.seller_entitlement
            } else {
                let claim_key = value_key(CLAIM_KEY_DOMAIN, auction_id, claim_handle);
                let index_plus_one = self.claim_handle_index_plus_one.read(claim_key);
                assert(index_plus_one != 0, 'CLAIM_NOT_FOUND');
                assert(!self.bidder_claim_consumed.read(claim_key), 'BIDDER_CLAIM_CONSUMED');
                let accepted_index = index_plus_one - 1;
                let bid = self.bids.read(bid_key(auction_id, accepted_index));
                assert(bid.claim_handle == claim_handle, 'CLAIM_HANDLE_MISMATCH');
                let claim_amount = if operation == 1 {
                    assert(!state.sold || accepted_index != state.winner_index, 'WINNER_NOT_LOSER');
                    config.cap
                } else {
                    assert(state.sold && accepted_index == state.winner_index, 'NOT_WINNER');
                    assert(config.cap > state.clearing_price, 'NO_WINNER_SURPLUS');
                    config.cap - state.clearing_price
                };
                self.bidder_claim_consumed.write(claim_key, true);
                claim_amount
            };

            let previous_balance = self.accounted_payment_balance.read();
            assert(previous_balance >= amount, 'ACCOUNTING_UNDERFLOW');
            let payment_token = self.payment_token.read();
            let actual_balance = IERC20Dispatcher { contract_address: payment_token }
                .balance_of(get_contract_address());
            let expected_balance: u256 = previous_balance.into();
            assert(actual_balance == expected_balance, 'PAYMENT_BALANCE_DRIFT');
            self.accounted_payment_balance.write(previous_balance - amount);
            assert(
                IERC20Dispatcher { contract_address: payment_token }
                    .approve(configured_pool, amount.into()),
                'POOL_APPROVAL_FAILED',
            );
            if operation == 1 {
                self.emit(LoserRefundClaimed { auction_id, claim_handle, open_note_id, amount });
            } else if operation == 2 {
                self.emit(WinnerSurplusClaimed { auction_id, claim_handle, open_note_id, amount });
            } else {
                self.emit(
                    SellerProceedsClaimed {
                        auction_id,
                        seller_claim_handle: claim_handle,
                        open_note_id,
                        amount,
                    },
                );
            }

            let deposits = array![OpenNoteDeposit { note_id: open_note_id, token: payment_token, amount }];
            deposits.span()
        }

        fn get_bid_count(self: @ContractState, auction_id: u64) -> u32 {
            assert(self.auction_exists.read(auction_id), 'AUCTION_NOT_FOUND');
            self.bid_counts.read(auction_id)
        }

        fn get_bid(self: @ContractState, auction_id: u64, accepted_index: u32) -> BidRecord {
            assert(accepted_index < self.bid_counts.read(auction_id), 'BID_NOT_FOUND');
            self.bids.read(bid_key(auction_id, accepted_index))
        }

        fn reveal_bid(
            ref self: ContractState,
            auction_id: u64,
            accepted_index: u32,
            amount: u128,
            bid_nonce: felt252,
            asset_recipient: ContractAddress,
        ) {
            assert(self.auction_exists.read(auction_id), 'AUCTION_NOT_FOUND');
            let config = self.auctions.read(auction_id);
            let now = get_block_timestamp();
            assert(now >= config.bidding_deadline, 'REVEAL_NOT_OPEN');
            assert(now < config.reveal_deadline, 'REVEAL_CLOSED');
            assert(accepted_index < self.bid_counts.read(auction_id), 'BID_NOT_FOUND');
            assert(amount != 0 && amount <= config.cap, 'BAD_REVEAL_AMOUNT');
            assert(bid_nonce != 0, 'ZERO_BID_NONCE');
            let recipient_felt: felt252 = asset_recipient.into();
            assert(recipient_felt != 0, 'ZERO_RECIPIENT');

            let key = bid_key(auction_id, accepted_index);
            let mut bid = self.bids.read(key);
            assert(!bid.revealed, 'BID_ALREADY_REVEALED');
            let expected = compute_bid_commitment(
                get_tx_info().chain_id,
                get_contract_address(),
                auction_id,
                amount,
                bid_nonce,
                bid.claim_handle,
                asset_recipient,
            );
            assert(expected == bid.commitment, 'COMMITMENT_MISMATCH');

            bid.revealed = true;
            bid.amount = amount;
            bid.asset_recipient = asset_recipient;
            self.bids.write(key, bid);
            self.emit(BidRevealed { auction_id, accepted_index, amount, asset_recipient });
        }

        fn settle_auction(ref self: ContractState, auction_id: u64) {
            assert(self.auction_exists.read(auction_id), 'AUCTION_NOT_FOUND');
            let config = self.auctions.read(auction_id);
            assert(get_block_timestamp() >= config.reveal_deadline, 'SETTLEMENT_NOT_READY');
            let previous_state = self.auction_states.read(auction_id);
            assert(!previous_state.settled, 'ALREADY_SETTLED');

            let count = self.bid_counts.read(auction_id);
            let zero_address: ContractAddress = 0.try_into().unwrap();
            let mut highest: u128 = 0;
            let mut second_highest: u128 = 0;
            let mut winner_index: u32 = 0;
            let mut winner_commitment: felt252 = 0;
            let mut winner_recipient = zero_address;
            let mut index: u32 = 0;
            loop {
                if index == count {
                    break;
                }
                let bid = self.bids.read(bid_key(auction_id, index));
                if bid.revealed {
                    if bid.amount > highest {
                        second_highest = highest;
                        highest = bid.amount;
                        winner_index = index;
                        winner_commitment = bid.commitment;
                        winner_recipient = bid.asset_recipient;
                    } else if bid.amount > second_highest {
                        second_highest = bid.amount;
                    }
                }
                index += 1;
            };

            let sold = highest >= config.reserve_price;
            let clearing_price = if sold {
                if second_highest > config.reserve_price {
                    second_highest
                } else {
                    config.reserve_price
                }
            } else {
                0
            };
            let nft_recipient = if sold { winner_recipient } else { config.seller };
            self.auction_states.write(
                auction_id,
                AuctionState {
                    settled: true,
                    sold,
                    winner_index,
                    winner_commitment,
                    winner_recipient,
                    clearing_price,
                    seller_entitlement: clearing_price,
                    seller_authorized_note: 0,
                    seller_claim_consumed: !sold,
                },
            );
            self.emit(
                AuctionSettled {
                    auction_id,
                    sold,
                    winner_index,
                    winner_commitment,
                    winner_recipient,
                    clearing_price,
                    seller_entitlement: clearing_price,
                },
            );

            let nft = IERC721Dispatcher { contract_address: config.nft_contract };
            nft.transfer_from(get_contract_address(), nft_recipient, config.token_id);
            assert(nft.owner_of(config.token_id) == nft_recipient, 'NFT_DELIVERY_FAILED');
        }

        fn get_auction_state(self: @ContractState, auction_id: u64) -> AuctionState {
            assert(self.auction_exists.read(auction_id), 'AUCTION_NOT_FOUND');
            self.auction_states.read(auction_id)
        }

        fn authorize_seller_proceeds(
            ref self: ContractState,
            auction_id: u64,
            seller_claim_handle: felt252,
            open_note_id: felt252,
        ) {
            assert(self.auction_exists.read(auction_id), 'AUCTION_NOT_FOUND');
            let config = self.auctions.read(auction_id);
            assert(get_caller_address() == config.seller, 'CALLER_NOT_SELLER');
            assert(seller_claim_handle == config.seller_claim_handle, 'BAD_SELLER_HANDLE');
            assert(open_note_id != 0, 'ZERO_OPEN_NOTE');
            let mut state = self.auction_states.read(auction_id);
            assert(state.settled && state.sold, 'NO_SELLER_PROCEEDS');
            assert(!state.seller_claim_consumed, 'SELLER_CLAIM_CONSUMED');
            state.seller_authorized_note = open_note_id;
            self.auction_states.write(auction_id, state);
            self.emit(
                SellerProceedsAuthorized { auction_id, seller_claim_handle, open_note_id },
            );
        }

        fn get_accounted_payment_balance(self: @ContractState) -> u128 {
            self.accounted_payment_balance.read()
        }
    }

    fn bid_key(auction_id: u64, accepted_index: u32) -> felt252 {
        poseidon_hash_span(array![BID_SLOT_DOMAIN, auction_id.into(), accepted_index.into()].span())
    }

    fn value_key(domain: felt252, auction_id: u64, value: felt252) -> felt252 {
        poseidon_hash_span(array![domain, auction_id.into(), value].span())
    }
}
