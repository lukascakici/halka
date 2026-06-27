#![no_std]

//! Halka — Circle contract (Level 2)
//!
//! A single rotating savings circle. Members join while the circle is open,
//! the admin starts it (locking membership), and each round every member
//! contributes a fixed amount of a token into the shared pot.
//!
//! Levels 3+ extend this with payout rotation, collateral, defaults, and a
//! separate Factory/Reputation system.

use soroban_sdk::{
    contract, contracterror, contractevent, contractimpl, contracttype, token, Address, Env, Vec,
};

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Config,
    Members,
    Round,
    Pot,
    /// Whether `member` has contributed in a given `round`.
    Contributed(u32, Address),
}

#[contracttype]
#[derive(Clone)]
pub struct CircleConfig {
    pub admin: Address,
    pub token: Address,
    pub contribution_amount: i128,
    pub max_members: u32,
    pub started: bool,
}

#[contracterror]
#[derive(Copy, Clone, PartialEq, Eq, Debug)]
#[repr(u32)]
pub enum Error {
    AlreadyInitialized = 1,
    NotInitialized = 2,
    InvalidParams = 3,
    CircleFull = 4,
    AlreadyMember = 5,
    NotMember = 6,
    NotStarted = 7,
    AlreadyStarted = 8,
    AlreadyContributed = 9,
}

/* ------------------------------ events ------------------------------ */

#[contractevent]
#[derive(Clone)]
pub struct Initialized {
    #[topic]
    pub admin: Address,
}

#[contractevent]
#[derive(Clone)]
pub struct Joined {
    #[topic]
    pub member: Address,
}

#[contractevent]
#[derive(Clone)]
pub struct Started {
    pub round: u32,
}

#[contractevent]
#[derive(Clone)]
pub struct Contributed {
    #[topic]
    pub member: Address,
    pub amount: i128,
    pub round: u32,
}

#[contract]
pub struct CircleContract;

#[contractimpl]
impl CircleContract {
    /// Create the circle. Must be called once by the admin.
    pub fn initialize(
        env: Env,
        admin: Address,
        token: Address,
        contribution_amount: i128,
        max_members: u32,
    ) -> Result<(), Error> {
        if env.storage().instance().has(&DataKey::Config) {
            return Err(Error::AlreadyInitialized);
        }
        if contribution_amount <= 0 || max_members == 0 {
            return Err(Error::InvalidParams);
        }
        admin.require_auth();

        let config = CircleConfig {
            admin: admin.clone(),
            token,
            contribution_amount,
            max_members,
            started: false,
        };
        env.storage().instance().set(&DataKey::Config, &config);
        env.storage()
            .instance()
            .set(&DataKey::Members, &Vec::<Address>::new(&env));
        env.storage().instance().set(&DataKey::Round, &0u32);
        env.storage().instance().set(&DataKey::Pot, &0i128);

        Initialized { admin }.publish(&env);
        Ok(())
    }

    /// Join the circle while it is still open (before it starts).
    pub fn join(env: Env, member: Address) -> Result<(), Error> {
        member.require_auth();
        let config = Self::load_config(&env)?;
        if config.started {
            return Err(Error::AlreadyStarted);
        }

        let mut members: Vec<Address> = env
            .storage()
            .instance()
            .get(&DataKey::Members)
            .unwrap_or(Vec::new(&env));
        if members.contains(&member) {
            return Err(Error::AlreadyMember);
        }
        if members.len() >= config.max_members {
            return Err(Error::CircleFull);
        }
        members.push_back(member.clone());
        env.storage().instance().set(&DataKey::Members, &members);

        Joined { member }.publish(&env);
        Ok(())
    }

    /// Lock membership and begin round 1. Admin only.
    pub fn start(env: Env) -> Result<(), Error> {
        let mut config = Self::load_config(&env)?;
        config.admin.require_auth();
        if config.started {
            return Err(Error::AlreadyStarted);
        }
        config.started = true;
        env.storage().instance().set(&DataKey::Config, &config);
        env.storage().instance().set(&DataKey::Round, &1u32);

        Started { round: 1 }.publish(&env);
        Ok(())
    }

    /// Contribute the fixed amount for the current round.
    /// Transfers tokens from the member into the contract's pot.
    pub fn contribute(env: Env, member: Address) -> Result<(), Error> {
        member.require_auth();
        let config = Self::load_config(&env)?;
        if !config.started {
            return Err(Error::NotStarted);
        }

        let members: Vec<Address> = env
            .storage()
            .instance()
            .get(&DataKey::Members)
            .unwrap_or(Vec::new(&env));
        if !members.contains(&member) {
            return Err(Error::NotMember);
        }

        let round: u32 = env.storage().instance().get(&DataKey::Round).unwrap_or(0);
        let contributed_key = DataKey::Contributed(round, member.clone());
        if env
            .storage()
            .instance()
            .get::<DataKey, bool>(&contributed_key)
            .unwrap_or(false)
        {
            return Err(Error::AlreadyContributed);
        }

        // Move the contribution into the pot (requires the member's auth,
        // covered by the transaction source signature).
        let token_client = token::Client::new(&env, &config.token);
        let pot_address = env.current_contract_address();
        token_client.transfer(&member, &pot_address, &config.contribution_amount);

        env.storage().instance().set(&contributed_key, &true);
        let pot: i128 = env.storage().instance().get(&DataKey::Pot).unwrap_or(0);
        env.storage()
            .instance()
            .set(&DataKey::Pot, &(pot + config.contribution_amount));

        Contributed {
            member,
            amount: config.contribution_amount,
            round,
        }
        .publish(&env);
        Ok(())
    }

    /* ----------------------------- reads ----------------------------- */

    pub fn get_config(env: Env) -> Result<CircleConfig, Error> {
        Self::load_config(&env)
    }

    pub fn get_members(env: Env) -> Vec<Address> {
        env.storage()
            .instance()
            .get(&DataKey::Members)
            .unwrap_or(Vec::new(&env))
    }

    pub fn get_round(env: Env) -> u32 {
        env.storage().instance().get(&DataKey::Round).unwrap_or(0)
    }

    pub fn get_pot(env: Env) -> i128 {
        env.storage().instance().get(&DataKey::Pot).unwrap_or(0)
    }

    pub fn has_contributed(env: Env, round: u32, member: Address) -> bool {
        env.storage()
            .instance()
            .get(&DataKey::Contributed(round, member))
            .unwrap_or(false)
    }

    /* ----------------------------- internal ----------------------------- */

    fn load_config(env: &Env) -> Result<CircleConfig, Error> {
        env.storage()
            .instance()
            .get(&DataKey::Config)
            .ok_or(Error::NotInitialized)
    }
}

mod test;
