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
    setup_with(env, 3)
}

fn setup_with(env: &Env, max_members: u32) -> Setup<'_> {
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
        &max_members,
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
fn test_leave_before_start_returns_collateral() {
    let env = Env::default();
    let s = setup(&env);
    let m1 = member(&env, &s);
    let m2 = member(&env, &s);
    s.client.join(&m1);
    s.client.join(&m2);

    s.client.leave(&m1);
    assert_eq!(s.token.balance(&m1), 1000);
    assert_eq!(s.client.get_collateral(&m1), 0);
    assert_eq!(s.client.get_members().len(), 1);
    assert_eq!(s.token.balance(&s.client.address), COLLATERAL);

    // Leaving isn't a way to keep drawing from the contract.
    assert_eq!(s.client.try_leave(&m1), Err(Ok(Error::NotMember)));
}

#[test]
fn test_cannot_leave_after_start() {
    let env = Env::default();
    let s = setup(&env);
    let m1 = member(&env, &s);
    let m2 = member(&env, &s);
    s.client.join(&m1);
    s.client.join(&m2);
    s.client.start();
    assert_eq!(s.client.try_leave(&m2), Err(Ok(Error::AlreadyStarted)));
}

#[test]
fn test_circle_finishes_and_returns_collateral() {
    let env = Env::default();
    let s = setup(&env);
    let m1 = member(&env, &s);
    let m2 = member(&env, &s);
    s.client.join(&m1);
    s.client.join(&m2);
    s.client.start();

    // Collateral is locked while the circle runs.
    assert_eq!(
        s.client.try_withdraw_collateral(&m1),
        Err(Ok(Error::NotWithdrawable))
    );

    // Round 1 → m1 paid, round 2 → m2 paid. Two members, two rounds.
    s.client.contribute(&m2);
    s.client.claim_payout();
    s.client.contribute(&m1);
    s.client.claim_payout();
    assert_eq!(s.client.get_config().status, CircleStatus::Finished);

    s.client.withdraw_collateral(&m1);
    s.client.withdraw_collateral(&m2);

    // Everyone contributed and everyone was paid, so everyone is square.
    assert_eq!(s.token.balance(&m1), 1000);
    assert_eq!(s.token.balance(&m2), 1000);
    assert_eq!(s.token.balance(&s.client.address), 0);
    assert_eq!(
        s.client.try_withdraw_collateral(&m1),
        Err(Ok(Error::NothingToWithdraw))
    );
}

#[test]
fn test_slash_keeps_the_circle_whole_and_costs_only_reputation() {
    let env = Env::default();
    let s = setup(&env);
    let m1 = member(&env, &s);
    let m2 = member(&env, &s);
    s.client.join(&m1);
    s.client.join(&m2);
    s.client.start();

    // m2 defaults in round 1 — their collateral covers the contribution, so the
    // other members are made whole and the round still completes.
    s.client.slash(&m2);
    s.client.claim_payout();
    s.client.contribute(&m1);
    s.client.claim_payout();
    assert_eq!(s.client.get_config().status, CircleStatus::Finished);

    s.client.withdraw_collateral(&m1);
    s.client.withdraw_collateral(&m2);

    // Everyone ends square in tokens: slashing substitutes for the payment, it
    // does not confiscate on top of it. The default is priced in reputation.
    assert_eq!(s.token.balance(&m1), 1000);
    assert_eq!(s.token.balance(&m2), 1000);
    assert_eq!(s.token.balance(&s.client.address), 0);
    assert_eq!(s.rep.get_score(&m2), -3);
}

#[test]
fn test_slash_draws_down_collateral() {
    let env = Env::default();
    let s = setup(&env);
    let m1 = member(&env, &s);
    let m2 = member(&env, &s);
    s.client.join(&m1);
    s.client.join(&m2);
    assert_eq!(s.client.get_collateral(&m2), COLLATERAL);

    s.client.start();
    s.client.slash(&m2);
    assert_eq!(s.client.get_collateral(&m2), COLLATERAL - CONTRIBUTION);
}

#[test]
fn test_repeat_defaulter_cannot_exceed_own_collateral() {
    let env = Env::default();
    let s = setup_with(&env, 4);
    let m1 = member(&env, &s);
    let m2 = member(&env, &s);
    let m3 = member(&env, &s);
    let m4 = member(&env, &s);
    for m in [&m1, &m2, &m3, &m4] {
        s.client.join(m);
    }
    s.client.start();

    // COLLATERAL covers exactly two missed contributions, so m4 can default in
    // rounds 1 and 2 — the other members are still paid in full.
    s.client.contribute(&m2);
    s.client.contribute(&m3);
    s.client.slash(&m4);
    s.client.claim_payout();

    s.client.contribute(&m1);
    s.client.contribute(&m3);
    s.client.slash(&m4);
    s.client.claim_payout();
    assert_eq!(s.client.get_collateral(&m4), 0);

    // Round 3: m4's collateral is spent, so a third slash would pay m3's pot
    // out of the other members' collateral. It must be refused.
    s.client.contribute(&m1);
    s.client.contribute(&m2);
    assert_eq!(
        s.client.try_slash(&m4),
        Err(Ok(Error::InsufficientCollateral))
    );

    // The contract never owes more than it holds.
    assert_eq!(
        s.token.balance(&s.client.address),
        s.client.get_pot()
            + s.client.get_collateral(&m1)
            + s.client.get_collateral(&m2)
            + s.client.get_collateral(&m3)
            + s.client.get_collateral(&m4)
    );
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
