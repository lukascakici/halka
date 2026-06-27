#![cfg(test)]

use super::*;
use soroban_sdk::{testutils::Address as _, token, Address, Env};

struct Setup<'a> {
    client: CircleContractClient<'a>,
    mint: token::StellarAssetClient<'a>,
    token: token::Client<'a>,
}

/// Initialize a circle with contribution_amount=100 and max_members=3,
/// plus a Stellar Asset (token) used for contributions.
fn setup(env: &Env) -> Setup<'_> {
    env.mock_all_auths();

    let admin = Address::generate(env);
    let token_admin = Address::generate(env);
    let sac = env.register_stellar_asset_contract_v2(token_admin);
    let token_id = sac.address();

    let contract_id = env.register(CircleContract, ());
    let client = CircleContractClient::new(env, &contract_id);
    client.initialize(&admin, &token_id, &100i128, &3u32);

    Setup {
        client,
        mint: token::StellarAssetClient::new(env, &token_id),
        token: token::Client::new(env, &token_id),
    }
}

#[test]
fn test_initialize_and_join() {
    let env = Env::default();
    let s = setup(&env);
    let m1 = Address::generate(&env);
    let m2 = Address::generate(&env);

    s.client.join(&m1);
    s.client.join(&m2);

    assert_eq!(s.client.get_members().len(), 2);
    assert_eq!(s.client.get_round(), 0);
    assert_eq!(s.client.get_pot(), 0);
}

#[test]
fn test_double_initialize_fails() {
    let env = Env::default();
    let s = setup(&env);
    let admin = Address::generate(&env);
    let token = Address::generate(&env);
    assert_eq!(
        s.client.try_initialize(&admin, &token, &100i128, &3u32),
        Err(Ok(Error::AlreadyInitialized))
    );
}

#[test]
fn test_double_join_fails() {
    let env = Env::default();
    let s = setup(&env);
    let m1 = Address::generate(&env);
    s.client.join(&m1);
    assert_eq!(s.client.try_join(&m1), Err(Ok(Error::AlreadyMember)));
}

#[test]
fn test_circle_full() {
    let env = Env::default();
    let s = setup(&env);
    for _ in 0..3 {
        s.client.join(&Address::generate(&env));
    }
    assert_eq!(
        s.client.try_join(&Address::generate(&env)),
        Err(Ok(Error::CircleFull))
    );
}

#[test]
fn test_cannot_join_after_start() {
    let env = Env::default();
    let s = setup(&env);
    s.client.join(&Address::generate(&env));
    s.client.start();
    assert_eq!(
        s.client.try_join(&Address::generate(&env)),
        Err(Ok(Error::AlreadyStarted))
    );
}

#[test]
fn test_contribute_moves_tokens_and_pot() {
    let env = Env::default();
    let s = setup(&env);
    let m1 = Address::generate(&env);
    let m2 = Address::generate(&env);
    s.client.join(&m1);
    s.client.join(&m2);
    s.mint.mint(&m1, &500);
    s.mint.mint(&m2, &500);

    s.client.start();
    assert_eq!(s.client.get_round(), 1);

    s.client.contribute(&m1);
    assert_eq!(s.client.get_pot(), 100);
    assert_eq!(s.token.balance(&m1), 400);
    assert_eq!(s.token.balance(&s.client.address), 100);
    assert!(s.client.has_contributed(&1, &m1));

    s.client.contribute(&m2);
    assert_eq!(s.client.get_pot(), 200);
}

#[test]
fn test_double_contribute_fails() {
    let env = Env::default();
    let s = setup(&env);
    let m1 = Address::generate(&env);
    s.client.join(&m1);
    s.mint.mint(&m1, &500);
    s.client.start();
    s.client.contribute(&m1);
    assert_eq!(
        s.client.try_contribute(&m1),
        Err(Ok(Error::AlreadyContributed))
    );
}

#[test]
fn test_non_member_cannot_contribute() {
    let env = Env::default();
    let s = setup(&env);
    s.client.join(&Address::generate(&env));
    s.client.start();
    let stranger = Address::generate(&env);
    assert_eq!(
        s.client.try_contribute(&stranger),
        Err(Ok(Error::NotMember))
    );
}

#[test]
fn test_contribute_before_start_fails() {
    let env = Env::default();
    let s = setup(&env);
    let m1 = Address::generate(&env);
    s.client.join(&m1);
    s.mint.mint(&m1, &500);
    assert_eq!(s.client.try_contribute(&m1), Err(Ok(Error::NotStarted)));
}
