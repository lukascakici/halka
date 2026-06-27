#![cfg(test)]

use super::*;
use reputation::{ReputationContract, ReputationContractClient};
use soroban_sdk::{testutils::Address as _, Address, Env};

// The Circle wasm the factory deploys. Requires `stellar contract build` first.
mod circle_wasm {
    soroban_sdk::contractimport!(file = "../../target/wasm32v1-none/release/circle.wasm");
}

#[test]
fn test_create_circle_full_flow() {
    let env = Env::default();
    env.mock_all_auths();

    let token_admin = Address::generate(&env);
    let sac = env.register_stellar_asset_contract_v2(token_admin);
    let token_id = sac.address();

    // Reputation, with the factory set as the authorizer.
    let rep_id = env.register(ReputationContract, ());
    let rep = ReputationContractClient::new(&env, &rep_id);
    rep.initialize(&Address::generate(&env));

    let factory_id = env.register(FactoryContract, ());
    let factory = FactoryContractClient::new(&env, &factory_id);
    rep.set_factory(&factory_id);

    let wasm_hash = env.deployer().upload_contract_wasm(circle_wasm::WASM);
    factory.initialize(&Address::generate(&env), &rep_id, &token_id, &wasm_hash);

    // Create a circle through the factory.
    let creator = Address::generate(&env);
    let circle_addr = factory.create_circle(&creator, &100i128, &200i128, &3u32);

    assert_eq!(factory.get_circle_count(), 1);
    assert_eq!(
        factory.list_circles(),
        soroban_sdk::vec![&env, circle_addr.clone()]
    );
    assert!(rep.is_authorized(&circle_addr));

    // The deployed circle is initialized and ready.
    let circle = circle_wasm::Client::new(&env, &circle_addr);
    let cfg = circle.get_config();
    assert_eq!(cfg.admin, creator);
    assert_eq!(cfg.contribution_amount, 100);
    assert_eq!(cfg.max_members, 3);
}

#[test]
fn test_double_initialize_fails() {
    let env = Env::default();
    env.mock_all_auths();

    let factory_id = env.register(FactoryContract, ());
    let factory = FactoryContractClient::new(&env, &factory_id);
    let a = Address::generate(&env);
    let wasm = soroban_sdk::BytesN::from_array(&env, &[0u8; 32]);
    factory.initialize(&a, &a, &a, &wasm);
    assert_eq!(
        factory.try_initialize(&a, &a, &a, &wasm),
        Err(Ok(Error::AlreadyInitialized))
    );
}
