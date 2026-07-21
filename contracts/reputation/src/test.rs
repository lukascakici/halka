#![cfg(test)]

use super::*;
use soroban_sdk::{testutils::Address as _, Address, Env};

// This contract's own wasm, so the upgrade path can be exercised for real.
// Requires `stellar contract build` first.
mod rep_wasm {
    soroban_sdk::contractimport!(file = "../../target/wasm32v1-none/release/reputation.wasm");
}

struct Setup<'a> {
    client: ReputationContractClient<'a>,
    factory: Address,
}

fn setup(env: &Env) -> Setup<'_> {
    env.mock_all_auths();
    let admin = Address::generate(env);
    let factory = Address::generate(env);
    let id = env.register(ReputationContract, ());
    let client = ReputationContractClient::new(env, &id);
    client.initialize(&admin);
    client.set_factory(&factory);
    Setup { client, factory }
}

#[test]
fn test_initialize_set_factory_authorize() {
    let env = Env::default();
    let s = setup(&env);
    let circle = Address::generate(&env);
    assert!(!s.client.is_authorized(&circle));
    s.client.authorize_circle(&circle);
    assert!(s.client.is_authorized(&circle));
}

#[test]
fn test_double_initialize_fails() {
    let env = Env::default();
    let s = setup(&env);
    let other = Address::generate(&env);
    assert_eq!(
        s.client.try_initialize(&other),
        Err(Ok(Error::AlreadyInitialized))
    );
}

#[test]
fn test_record_updates_and_accumulates() {
    let env = Env::default();
    let s = setup(&env);
    let circle = Address::generate(&env);
    let member = Address::generate(&env);
    s.client.authorize_circle(&circle);

    assert_eq!(s.client.record(&circle, &member, &10), 10);
    assert_eq!(s.client.record(&circle, &member, &5), 15);
    assert_eq!(s.client.record(&circle, &member, &-3), 12);
    assert_eq!(s.client.get_score(&member), 12);
}

#[test]
fn test_upgrade_preserves_scores() {
    let env = Env::default();
    env.mock_all_auths();

    let wasm_hash = env.deployer().upload_contract_wasm(rep_wasm::WASM);
    let id = env.register(rep_wasm::WASM, ());
    let client = ReputationContractClient::new(&env, &id);
    let admin = Address::generate(&env);
    let circle = Address::generate(&env);
    let member = Address::generate(&env);
    client.initialize(&admin);
    client.set_factory(&Address::generate(&env));
    client.authorize_circle(&circle);
    client.record(&circle, &member, &7);

    client.upgrade(&wasm_hash);

    // Scores and authorizations survive the code swap.
    assert_eq!(client.get_score(&member), 7);
    assert!(client.is_authorized(&circle));
    assert_eq!(client.record(&circle, &member, &1), 8);
}

#[test]
fn test_only_admin_can_upgrade_or_reassign() {
    let env = Env::default();
    let admin = Address::generate(&env);
    let id = env.register(ReputationContract, ());
    let client = ReputationContractClient::new(&env, &id);
    env.mock_all_auths();
    client.initialize(&admin);

    // With no authorization granted, admin-gated calls must not go through.
    env.set_auths(&[]);
    let hash = soroban_sdk::BytesN::from_array(&env, &[0u8; 32]);
    assert!(client.try_upgrade(&hash).is_err());
    assert!(client.try_set_admin(&Address::generate(&env)).is_err());
}

#[test]
fn test_set_admin_transfers_control() {
    let env = Env::default();
    let s = setup(&env);
    let new_admin = Address::generate(&env);
    s.client.set_admin(&new_admin);

    // The new admin can still configure the contract.
    let other_factory = Address::generate(&env);
    s.client.set_factory(&other_factory);
    let circle = Address::generate(&env);
    s.client.authorize_circle(&circle);
    assert!(s.client.is_authorized(&circle));
}

#[test]
fn test_unauthorized_reporter_fails() {
    let env = Env::default();
    let s = setup(&env);
    let stranger = Address::generate(&env);
    let member = Address::generate(&env);
    let _ = s.factory; // factory set in setup
    assert_eq!(
        s.client.try_record(&stranger, &member, &10),
        Err(Ok(Error::NotAuthorized))
    );
    assert_eq!(s.client.get_score(&member), 0);
}
