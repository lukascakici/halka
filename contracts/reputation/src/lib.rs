#![no_std]

//! Halka — Reputation contract (Level 3)
//!
//! A shared, cross-circle trust/credit score. Only circle contracts that the
//! admin (the Factory) has authorized may write to it, so reputation can't be
//! forged. Each `Circle` calls `record` on payout (positive) or default
//! (negative), demonstrating inter-contract communication.

use soroban_sdk::{
    contract, contracterror, contractevent, contractimpl, contracttype, Address, Env,
};

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Admin,
    /// Whether `circle` is allowed to write reputation.
    Authorized(Address),
    /// A member's accumulated score.
    Score(Address),
}

#[contracterror]
#[derive(Copy, Clone, PartialEq, Eq, Debug)]
#[repr(u32)]
pub enum Error {
    AlreadyInitialized = 1,
    NotInitialized = 2,
    NotAuthorized = 3,
}

#[contractevent]
#[derive(Clone)]
pub struct Recorded {
    #[topic]
    pub member: Address,
    pub delta: i64,
    pub score: i64,
}

#[contract]
pub struct ReputationContract;

#[contractimpl]
impl ReputationContract {
    /// Set the admin (the Factory) that may authorize circles.
    pub fn initialize(env: Env, admin: Address) -> Result<(), Error> {
        if env.storage().instance().has(&DataKey::Admin) {
            return Err(Error::AlreadyInitialized);
        }
        admin.require_auth();
        env.storage().instance().set(&DataKey::Admin, &admin);
        Ok(())
    }

    /// Authorize a circle contract to write reputation. Admin only.
    pub fn authorize_circle(env: Env, circle: Address) -> Result<(), Error> {
        let admin = Self::admin(&env)?;
        admin.require_auth();
        env.storage()
            .persistent()
            .set(&DataKey::Authorized(circle), &true);
        Ok(())
    }

    /// Record a reputation change for `member`. Callable only by an authorized
    /// circle; `reporter` must be the calling circle (verified via auth).
    pub fn record(env: Env, reporter: Address, member: Address, delta: i64) -> Result<i64, Error> {
        reporter.require_auth();
        let authorized: bool = env
            .storage()
            .persistent()
            .get(&DataKey::Authorized(reporter))
            .unwrap_or(false);
        if !authorized {
            return Err(Error::NotAuthorized);
        }

        let key = DataKey::Score(member.clone());
        let updated = env.storage().persistent().get(&key).unwrap_or(0i64) + delta;
        env.storage().persistent().set(&key, &updated);

        Recorded {
            member,
            delta,
            score: updated,
        }
        .publish(&env);
        Ok(updated)
    }

    pub fn get_score(env: Env, member: Address) -> i64 {
        env.storage()
            .persistent()
            .get(&DataKey::Score(member))
            .unwrap_or(0)
    }

    pub fn is_authorized(env: Env, circle: Address) -> bool {
        env.storage()
            .persistent()
            .get(&DataKey::Authorized(circle))
            .unwrap_or(false)
    }

    fn admin(env: &Env) -> Result<Address, Error> {
        env.storage()
            .instance()
            .get(&DataKey::Admin)
            .ok_or(Error::NotInitialized)
    }
}

mod test;
