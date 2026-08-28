use starknet::ContractAddress;

#[starknet::interface]
pub trait IDemoERC721<TContractState> {
    fn balance_of(self: @TContractState, account: ContractAddress) -> u256;
    fn owner_of(self: @TContractState, token_id: u256) -> ContractAddress;
    fn approve(ref self: TContractState, spender: ContractAddress, token_id: u256);
    fn get_approved(self: @TContractState, token_id: u256) -> ContractAddress;
    fn transfer_from(
        ref self: TContractState,
        from: ContractAddress,
        to: ContractAddress,
        token_id: u256,
    );
}

#[starknet::contract]
pub mod DemoERC721 {
    use starknet::storage::{Map, StorageMapReadAccess, StorageMapWriteAccess};
    use starknet::{ContractAddress, get_caller_address};
    use super::IDemoERC721;

    #[storage]
    struct Storage {
        owners: Map<u256, ContractAddress>,
        balances: Map<ContractAddress, u256>,
        approvals: Map<u256, ContractAddress>,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        Transfer: Transfer,
        Approval: Approval,
    }

    #[derive(Drop, starknet::Event)]
    struct Transfer {
        #[key]
        from: ContractAddress,
        #[key]
        to: ContractAddress,
        token_id: u256,
    }

    #[derive(Drop, starknet::Event)]
    struct Approval {
        #[key]
        owner: ContractAddress,
        #[key]
        approved: ContractAddress,
        token_id: u256,
    }

    #[constructor]
    fn constructor(ref self: ContractState, owner: ContractAddress, token_id: u256) {
        let zero: ContractAddress = 0.try_into().unwrap();
        assert(owner != zero, 'ZERO_OWNER');
        self.owners.write(token_id, owner);
        self.balances.write(owner, 1);
        self.emit(Transfer { from: zero, to: owner, token_id });
    }

    #[abi(embed_v0)]
    impl DemoERC721Impl of IDemoERC721<ContractState> {
        fn balance_of(self: @ContractState, account: ContractAddress) -> u256 {
            self.balances.read(account)
        }

        fn owner_of(self: @ContractState, token_id: u256) -> ContractAddress {
            self.owners.read(token_id)
        }

        fn approve(ref self: ContractState, spender: ContractAddress, token_id: u256) {
            let owner = self.owners.read(token_id);
            assert(owner == get_caller_address(), 'NOT_OWNER');
            self.approvals.write(token_id, spender);
            self.emit(Approval { owner, approved: spender, token_id });
        }

        fn get_approved(self: @ContractState, token_id: u256) -> ContractAddress {
            self.approvals.read(token_id)
        }

        fn transfer_from(
            ref self: ContractState,
            from: ContractAddress,
            to: ContractAddress,
            token_id: u256,
        ) {
            let zero: ContractAddress = 0.try_into().unwrap();
            assert(to != zero, 'ZERO_RECIPIENT');
            let owner = self.owners.read(token_id);
            let caller = get_caller_address();
            assert(owner == from, 'BAD_FROM');
            assert(caller == owner || caller == self.approvals.read(token_id), 'NOT_AUTHORIZED');

            self.owners.write(token_id, to);
            self.approvals.write(token_id, zero);
            self.balances.write(from, self.balances.read(from) - 1);
            self.balances.write(to, self.balances.read(to) + 1);
            self.emit(Transfer { from, to, token_id });
        }
    }
}
