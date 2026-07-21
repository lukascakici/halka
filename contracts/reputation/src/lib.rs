#![no_std]

//! Halka — Reputation contract (Level 3)
//!
//! A shared, cross-circle trust/credit score. The admin sets a trusted Factory;
//! the Factory authorizes each circle it deploys; only authorized circles may
//! write reputation. This demonstrates inter-contract communication and makes
//! the score impossible to forge.

use soroban_sdk::{
    contract, contracterror, contractevent, contractimpl, contracttype, Address, BytesN, Env,
};

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Admin,
    Factory,
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
    FactoryNotSet = 3,
    NotAuthorized = 4,
}

#[contractevent]
#[derive(Clone)]
pub struct AdminChanged {
    #[topic]
    pub admin: Address,
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
    /// Set the admin account that may configure the Factory.
    pub fn initialize(env: Env, admin: Address) -> Result<(), Error> {
        if env.storage().instance().has(&DataKey::Admin) {
            return Err(Error::AlreadyInitialized);
        }
        admin.require_auth();
        env.storage().instance().set(&DataKey::Admin, &admin);
        Ok(())
    }

    /// Point reputation at the Factory contract that will authorize circles.
    pub fn set_factory(env: Env, factory: Address) -> Result<(), Error> {
        let admin = Self::admin(&env)?;
        admin.require_auth();
        env.storage().instance().set(&DataKey::Factory, &factory);
        Ok(())
    }

    /// Hand the admin role to another account — the route to a multisig or a
    /// timelock once the protocol is live.
    pub fn set_admin(env: Env, new_admin: Address) -> Result<(), Error> {
        Self::admin(&env)?.require_auth();
        env.storage().instance().set(&DataKey::Admin, &new_admin);
        AdminChanged { admin: new_admin }.publish(&env);
        Ok(())
    }

    /// Replace this contract's code. Reputation holds scores rather than funds,
    /// so an upgrade can fix bugs without putting anyone's money at risk.
    pub fn upgrade(env: Env, new_wasm_hash: BytesN<32>) -> Result<(), Error> {
        Self::admin(&env)?.require_auth();
        env.deployer().update_current_contract_wasm(new_wasm_hash);
        Ok(())
    }

    /// Authorize a circle to write reputation. Callable only by the Factory.
    pub fn authorize_circle(env: Env, circle: Address) -> Result<(), Error> {
        let factory: Address = env
            .storage()
            .instance()
            .get(&DataKey::Factory)
            .ok_or(Error::FactoryNotSet)?;
        factory.require_auth();
        env.storage()
            .persistent()
            .set(&DataKey::Authorized(circle), &true);
        Ok(())
    }

    /// Record a reputation change for `member`. Callable only by an authorized
    /// circle; `reporter` is the calling circle (verified via auth).
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
