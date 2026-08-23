use starknet::ContractAddress;

#[derive(Copy, Drop, Serde)]
pub struct OpenNoteDeposit {
    pub note_id: felt252,
    pub token: ContractAddress,
    pub amount: u128,
}

#[starknet::interface]
pub trait IAuctionIngressSpike<TContractState> {
    fn privacy_invoke(
        ref self: TContractState,
        operation: u8,
        auction_id: u64,
        a: felt252,
        b: felt252,
        c: felt252,
        d: felt252,
        pool_address: ContractAddress,
        note_id: felt252,
    ) -> Span<OpenNoteDeposit>;

    fn get_spike_state(self: @TContractState) -> (u8, u64, felt252, felt252);
}

#[starknet::contract]
mod AuctionIngressSpike {
    use starknet::storage::{StoragePointerReadAccess, StoragePointerWriteAccess};
    use starknet::{ContractAddress, get_caller_address};
    use super::{IAuctionIngressSpike, OpenNoteDeposit};

    #[storage]
    struct Storage {
        pool: ContractAddress,
        last_operation: u8,
        last_auction_id: u64,
        last_a: felt252,
        last_b: felt252,
    }

    #[constructor]
    fn constructor(ref self: ContractState, pool: ContractAddress) {
        self.pool.write(pool);
    }

    #[abi(embed_v0)]
    impl AuctionIngressSpikeImpl of IAuctionIngressSpike<ContractState> {
        fn privacy_invoke(
            ref self: ContractState,
            operation: u8,
            auction_id: u64,
            a: felt252,
            b: felt252,
            c: felt252,
            d: felt252,
            pool_address: ContractAddress,
            note_id: felt252,
        ) -> Span<OpenNoteDeposit> {
            let pool = self.pool.read();
            assert(get_caller_address() == pool, 'CALLER_NOT_POOL');
            assert(pool_address == pool, 'BAD_POOL');

            self.last_operation.write(operation);
            self.last_auction_id.write(auction_id);
            self.last_a.write(a);
            self.last_b.write(b);

            let _unused = (c, d, note_id);
            let deposits: Array<OpenNoteDeposit> = array![];
            deposits.span()
        }

        fn get_spike_state(self: @ContractState) -> (u8, u64, felt252, felt252) {
            (
                self.last_operation.read(),
                self.last_auction_id.read(),
                self.last_a.read(),
                self.last_b.read(),
            )
        }
    }
}
