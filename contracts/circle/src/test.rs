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

    client.initialize(
        &Address::generate(env),
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
fn test_recipient_is_exempt_and_round_completes() {
    let env = Env::default();
    let s = setup(&env);
    let m1 = member(&env, &s);
    let m2 = member(&env, &s);
    s.client.join(&m1);
    s.client.join(&m2);
    s.client.start();

    // Round 1 recipient is m1 — they must NOT contribute.
    assert_eq!(s.client.get_recipient(&1), m1);
    assert_eq!(s.client.try_contribute(&m1), Err(Ok(Error::IsRecipient)));

    // The other member contributes; the round is now complete (n - 1).
    s.client.contribute(&m2);
    assert_eq!(s.client.get_pot(), CONTRIBUTION);
    assert_eq!(s.rep.get_score(&m2), 1);

    // m1 claims the pot (only the non-recipient's contribution).
    s.client.claim_payout();
    assert_eq!(s.token.balance(&m1), 1000 - COLLATERAL + CONTRIBUTION);
    assert_eq!(s.client.get_pot(), 0);
    assert_eq!(s.client.get_round(), 2);
    assert_eq!(s.client.get_recipient(&2), m2);
}

#[test]
fn test_claim_requires_all_nonrecipients() {
    let env = Env::default();
    let s = setup(&env);
    let m1 = member(&env, &s);
    let m2 = member(&env, &s);
    s.client.join(&m1);
    s.client.join(&m2);
    s.client.start();
    // Nobody has contributed yet → recipient can't claim.
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

    // m2 (non-recipient) defaults — admin slashes; collateral covers it.
    s.client.slash(&m2);
    assert!(s.client.has_contributed(&1, &m2));
    assert_eq!(s.client.get_pot(), CONTRIBUTION);
    assert_eq!(s.rep.get_score(&m2), -3);

    // The round can now complete.
    s.client.claim_payout();
    assert_eq!(s.client.get_round(), 2);
}

#[test]
fn test_cannot_slash_recipient() {
    let env = Env::default();
    let s = setup(&env);
    let m1 = member(&env, &s);
    let m2 = member(&env, &s);
    s.client.join(&m1);
    s.client.join(&m2);
    s.client.start();
    // m1 is the round-1 recipient and is exempt.
    assert_eq!(s.client.try_slash(&m1), Err(Ok(Error::IsRecipient)));
}

#[test]
fn test_non_member_cannot_contribute() {
    let env = Env::default();
    let s = setup(&env);
    let m1 = member(&env, &s);
    let m2 = member(&env, &s);
    s.client.join(&m1);
    s.client.join(&m2);
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
    s.client.contribute(&m2);
    assert_eq!(s.client.try_slash(&m2), Err(Ok(Error::NotDefaulted)));
}

#[test]
fn test_three_member_rotation() {
    let env = Env::default();
    let s = setup(&env);
    let m1 = member(&env, &s);
    let m2 = member(&env, &s);
    let m3 = member(&env, &s);
    s.client.join(&m1);
    s.client.join(&m2);
    s.client.join(&m3);
    s.client.start();

    // Round 1 → m1 receives; m2 and m3 contribute.
    s.client.contribute(&m2);
    s.client.contribute(&m3);
    s.client.claim_payout();
    assert_eq!(s.client.get_round(), 2);
    assert_eq!(s.client.get_recipient(&2), m2);

    // Round 2 → m2 receives; m1 and m3 contribute.
    s.client.contribute(&m1);
    s.client.contribute(&m3);
    assert_eq!(s.client.get_pot(), 2 * CONTRIBUTION);
    s.client.claim_payout();
    assert_eq!(s.client.get_round(), 3);
    assert_eq!(s.client.get_recipient(&3), m3);
}
