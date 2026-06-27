#![cfg(test)]

use super::*;
use reputation::{ReputationContract, ReputationContractClient};
use soroban_sdk::{testutils::Address as _, token, Address, Env};

const CONTRIBUTION: i128 = 100;
const COLLATERAL: i128 = 200;

struct Setup<'a> {
    client: CircleContractClient<'a>,
    rep: ReputationContractClient<'a>,
    mint: token::StellarAssetClient<'a>,
    token: token::Client<'a>,
}

fn setup(env: &Env) -> Setup<'_> {
    env.mock_all_auths();

    let token_admin = Address::generate(env);
    let sac = env.register_stellar_asset_contract_v2(token_admin);
    let token_id = sac.address();

    let rep_id = env.register(ReputationContract, ());
    let rep = ReputationContractClient::new(env, &rep_id);
    rep.initialize(&Address::generate(env));
    rep.set_factory(&Address::generate(env));

    let circle_id = env.register(CircleContract, ());
    let client = CircleContractClient::new(env, &circle_id);
    rep.authorize_circle(&circle_id);

    let admin = Address::generate(env);
    client.initialize(
        &admin,
        &token_id,
        &rep_id,
        &CONTRIBUTION,
        &COLLATERAL,
        &3u32,
    );

    Setup {
        client,
        rep,
        mint: token::StellarAssetClient::new(env, &token_id),
        token: token::Client::new(env, &token_id),
    }
}

fn member(env: &Env, s: &Setup) -> Address {
    let m = Address::generate(env);
    s.mint.mint(&m, &1000);
    m
}

#[test]
fn test_join_posts_collateral() {
    let env = Env::default();
    let s = setup(&env);
    let m = member(&env, &s);
    s.client.join(&m);
    assert_eq!(s.token.balance(&m), 1000 - COLLATERAL);
    assert_eq!(s.token.balance(&s.client.address), COLLATERAL);
    assert_eq!(s.client.get_members().len(), 1);
}

#[test]
fn test_double_initialize_fails() {
    let env = Env::default();
    let s = setup(&env);
    let a = Address::generate(&env);
    assert_eq!(
        s.client
            .try_initialize(&a, &a, &a, &CONTRIBUTION, &COLLATERAL, &3u32),
        Err(Ok(Error::AlreadyInitialized))
    );
}

#[test]
fn test_contribute_rewards_reputation() {
    let env = Env::default();
    let s = setup(&env);
    let m1 = member(&env, &s);
    let m2 = member(&env, &s);
    s.client.join(&m1);
    s.client.join(&m2);
    s.client.start();

    s.client.contribute(&m1);
    assert_eq!(s.client.get_pot(), CONTRIBUTION);
    assert_eq!(s.rep.get_score(&m1), 1);
    assert!(s.client.has_contributed(&1, &m1));
}

#[test]
fn test_full_round_payout_rotates() {
    let env = Env::default();
    let s = setup(&env);
    let m1 = member(&env, &s);
    let m2 = member(&env, &s);
    s.client.join(&m1);
    s.client.join(&m2);
    s.client.start();
    s.client.contribute(&m1);
    s.client.contribute(&m2);

    // round 1 recipient is m1
    assert_eq!(s.client.get_recipient(&1), m1);
    s.client.claim_payout();

    // m1: -collateral -contribution +pot(2*contribution)
    assert_eq!(
        s.token.balance(&m1),
        1000 - COLLATERAL - CONTRIBUTION + 2 * CONTRIBUTION
    );
    assert_eq!(s.client.get_pot(), 0);
    assert_eq!(s.client.get_round(), 2);
    assert_eq!(s.client.get_recipient(&2), m2);
}

#[test]
fn test_claim_requires_all_contributed() {
    let env = Env::default();
    let s = setup(&env);
    let m1 = member(&env, &s);
    let m2 = member(&env, &s);
    s.client.join(&m1);
    s.client.join(&m2);
    s.client.start();
    s.client.contribute(&m1);
    assert_eq!(s.client.try_claim_payout(), Err(Ok(Error::RoundIncomplete)));
}

#[test]
fn test_slash_default_covers_round() {
    let env = Env::default();
    let s = setup(&env);
    let m1 = member(&env, &s);
    let m2 = member(&env, &s);
    s.client.join(&m1);
    s.client.join(&m2);
    s.client.start();
    s.client.contribute(&m1);

    // m2 defaults — admin slashes; collateral covers the contribution
    s.client.slash(&m2);
    assert!(s.client.has_contributed(&1, &m2));
    assert_eq!(s.client.get_pot(), 2 * CONTRIBUTION);
    assert_eq!(s.rep.get_score(&m2), -3);

    // round can now complete
    s.client.claim_payout();
    assert_eq!(s.client.get_round(), 2);
}

#[test]
fn test_non_member_cannot_contribute() {
    let env = Env::default();
    let s = setup(&env);
    let m1 = member(&env, &s);
    s.client.join(&m1);
    s.client.start();
    let stranger = member(&env, &s);
    assert_eq!(
        s.client.try_contribute(&stranger),
        Err(Ok(Error::NotMember))
    );
}

#[test]
fn test_slash_fails_if_contributed() {
    let env = Env::default();
    let s = setup(&env);
    let m1 = member(&env, &s);
    let m2 = member(&env, &s);
    s.client.join(&m1);
    s.client.join(&m2);
    s.client.start();
    s.client.contribute(&m1);
    assert_eq!(s.client.try_slash(&m1), Err(Ok(Error::NotDefaulted)));
}
