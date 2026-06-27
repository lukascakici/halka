#![cfg(test)]

use super::*;
use soroban_sdk::{testutils::Address as _, Address, Env};

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
