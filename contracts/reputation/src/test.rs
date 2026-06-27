#![cfg(test)]

use super::*;
use soroban_sdk::{testutils::Address as _, Address, Env};

fn setup(env: &Env) -> (ReputationContractClient<'_>, Address) {
    env.mock_all_auths();
    let admin = Address::generate(env);
    let id = env.register(ReputationContract, ());
    let client = ReputationContractClient::new(env, &id);
    client.initialize(&admin);
    (client, admin)
}

#[test]
fn test_initialize_and_authorize() {
    let env = Env::default();
    let (client, _admin) = setup(&env);
    let circle = Address::generate(&env);
    assert!(!client.is_authorized(&circle));
    client.authorize_circle(&circle);
    assert!(client.is_authorized(&circle));
}

#[test]
fn test_double_initialize_fails() {
    let env = Env::default();
    let (client, _admin) = setup(&env);
    let other = Address::generate(&env);
    assert_eq!(
        client.try_initialize(&other),
        Err(Ok(Error::AlreadyInitialized))
    );
}

#[test]
fn test_record_updates_and_accumulates() {
    let env = Env::default();
    let (client, _admin) = setup(&env);
    let circle = Address::generate(&env);
    let member = Address::generate(&env);
    client.authorize_circle(&circle);

    assert_eq!(client.record(&circle, &member, &10), 10);
    assert_eq!(client.record(&circle, &member, &5), 15);
    assert_eq!(client.record(&circle, &member, &-3), 12);
    assert_eq!(client.get_score(&member), 12);
}

#[test]
fn test_unauthorized_reporter_fails() {
    let env = Env::default();
    let (client, _admin) = setup(&env);
    let stranger = Address::generate(&env);
    let member = Address::generate(&env);
    assert_eq!(
        client.try_record(&stranger, &member, &10),
        Err(Ok(Error::NotAuthorized))
    );
    assert_eq!(client.get_score(&member), 0);
}
