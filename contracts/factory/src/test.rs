#![cfg(test)]

use super::*;
use reputation::{ReputationContract, ReputationContractClient};
use soroban_sdk::{testutils::Address as _, Address, Env};

// The Circle wasm the factory deploys. Requires `stellar contract build` first.
mod circle_wasm {
    soroban_sdk::contractimport!(file = "../../target/wasm32v1-none/release/circle.wasm");
}

// This contract's own wasm, so the upgrade path can be exercised for real.
mod factory_wasm {
    soroban_sdk::contractimport!(file = "../../target/wasm32v1-none/release/factory.wasm");
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
    let circle_addr = factory.create_circle(&creator, &100i128, &200i128, &3u32, &1000u32);

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
fn test_set_circle_wasm_leaves_existing_circles_alone() {
    let env = Env::default();
    env.mock_all_auths();

    let token_admin = Address::generate(&env);
    let token_id = env
        .register_stellar_asset_contract_v2(token_admin)
        .address();
    let rep_id = env.register(ReputationContract, ());
    let rep = ReputationContractClient::new(&env, &rep_id);
    rep.initialize(&Address::generate(&env));

    let factory_id = env.register(FactoryContract, ());
    let factory = FactoryContractClient::new(&env, &factory_id);
    rep.set_factory(&factory_id);
    let wasm_hash = env.deployer().upload_contract_wasm(circle_wasm::WASM);
    factory.initialize(&Address::generate(&env), &rep_id, &token_id, &wasm_hash);

    let creator = Address::generate(&env);
    let existing = factory.create_circle(&creator, &100i128, &200i128, &3u32, &1000u32);

    // Swapping the wasm is how fixes ship — but a circle members already
    // committed funds to keeps running the code they agreed to.
    let other = soroban_sdk::BytesN::from_array(&env, &[9u8; 32]);
    factory.set_circle_wasm(&other);
    assert_eq!(factory.get_circle_wasm(), other);
    assert_eq!(
        circle_wasm::Client::new(&env, &existing).get_config().admin,
        creator
    );
}

#[test]
fn test_upgrade_preserves_the_circle_registry() {
    let env = Env::default();
    env.mock_all_auths();

    let token_admin = Address::generate(&env);
    let token_id = env
        .register_stellar_asset_contract_v2(token_admin)
        .address();
    let rep_id = env.register(ReputationContract, ());
    let rep = ReputationContractClient::new(&env, &rep_id);
    rep.initialize(&Address::generate(&env));

    let factory_id = env.register(factory_wasm::WASM, ());
    let factory = FactoryContractClient::new(&env, &factory_id);
    rep.set_factory(&factory_id);
    let circle_hash = env.deployer().upload_contract_wasm(circle_wasm::WASM);
    factory.initialize(&Address::generate(&env), &rep_id, &token_id, &circle_hash);

    let creator = Address::generate(&env);
    let circle = factory.create_circle(&creator, &100i128, &200i128, &3u32, &1000u32);

    let factory_hash = env.deployer().upload_contract_wasm(factory_wasm::WASM);
    factory.upgrade(&factory_hash);

    // The registry — and the ability to keep deploying — survives the swap.
    assert_eq!(factory.get_circle_count(), 1);
    assert_eq!(factory.list_circles(), soroban_sdk::vec![&env, circle]);
    factory.create_circle(&creator, &100i128, &200i128, &3u32, &1000u32);
    assert_eq!(factory.get_circle_count(), 2);
}

#[test]
fn test_admin_transfer_and_gating() {
    let env = Env::default();
    let admin = Address::generate(&env);
    let factory_id = env.register(FactoryContract, ());
    let factory = FactoryContractClient::new(&env, &factory_id);
    let wasm = soroban_sdk::BytesN::from_array(&env, &[0u8; 32]);

    env.mock_all_auths();
    factory.initialize(&admin, &admin, &admin, &wasm);
    let new_admin = Address::generate(&env);
    factory.set_admin(&new_admin);
    assert_eq!(factory.get_admin(), new_admin);

    // Admin-gated calls need authorization; nothing goes through without it.
    env.set_auths(&[]);
    assert!(factory.try_upgrade(&wasm).is_err());
    assert!(factory.try_set_circle_wasm(&wasm).is_err());
    assert!(factory.try_set_admin(&admin).is_err());
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
