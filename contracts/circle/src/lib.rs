#![no_std]

//! Halka — Circle contract (Level 3)
//!
//! A rotating savings circle. Members join (posting collateral), the admin
//! starts it, and each round every member contributes a fixed amount. When all
//! have contributed, the round's recipient claims the pot and the circle rotates
//! to the next member. Reliability and defaults are reported to a shared
//! [`reputation`] contract (inter-contract communication).

use interfaces::ReputationClient;
use soroban_sdk::{
    contract, contracterror, contractevent, contractimpl, contracttype, token, Address, Env, Vec,
};

const REP_CONTRIBUTE: i64 = 1;
const REP_DEFAULT: i64 = -3;

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Config,
    Members,
    Round,
    Pot,
    /// Whether `member` has contributed in a given `round`.
    Contributed(u32, Address),
    /// Collateral still held for `member`. Posted on join, drawn down by
    /// `slash`, and returned when the member exits.
    Collateral(Address),
}

#[contracttype]
#[derive(Clone)]
pub struct CircleConfig {
    pub admin: Address,
    pub token: Address,
    pub reputation: Address,
    pub contribution_amount: i128,
    pub collateral_amount: i128,
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
    RoundIncomplete = 10,
    NotRecipient = 11,
    NotDefaulted = 12,
    /// This round's recipient is exempt — they receive the pot, so they don't
    /// contribute (and can't be slashed) this round.
    IsRecipient = 13,
    /// The member's remaining collateral can't cover another missed
    /// contribution, so slashing would pay the pot out of *other* members'
    /// collateral. The circle is stuck and must be wound down instead.
    InsufficientCollateral = 14,
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

#[contractevent]
#[derive(Clone)]
pub struct PaidOut {
    #[topic]
    pub recipient: Address,
    pub amount: i128,
    pub round: u32,
}

#[contractevent]
#[derive(Clone)]
pub struct Slashed {
    #[topic]
    pub member: Address,
    pub round: u32,
}

#[contract]
pub struct CircleContract;

#[contractimpl]
impl CircleContract {
    /// Create the circle. Called once (by the admin, or by the Factory on the
    /// admin's behalf).
    pub fn initialize(
        env: Env,
        admin: Address,
        token: Address,
        reputation: Address,
        contribution_amount: i128,
        collateral_amount: i128,
        max_members: u32,
    ) -> Result<(), Error> {
        if env.storage().instance().has(&DataKey::Config) {
            return Err(Error::AlreadyInitialized);
        }
        // Collateral must cover a missed contribution so `slash` stays solvent.
        if contribution_amount <= 0 || collateral_amount < contribution_amount || max_members < 2 {
            return Err(Error::InvalidParams);
        }
        admin.require_auth();

        let config = CircleConfig {
            admin,
            token,
            reputation,
            contribution_amount,
            collateral_amount,
            max_members,
            started: false,
        };
        env.storage().instance().set(&DataKey::Config, &config);
        env.storage()
            .instance()
            .set(&DataKey::Members, &Vec::<Address>::new(&env));
        env.storage().instance().set(&DataKey::Round, &0u32);
        env.storage().instance().set(&DataKey::Pot, &0i128);
        Ok(())
    }

    /// Join the circle (before it starts), posting collateral.
    pub fn join(env: Env, member: Address) -> Result<(), Error> {
        member.require_auth();
        let config = Self::load_config(&env)?;
        if config.started {
            return Err(Error::AlreadyStarted);
        }

        let mut members = Self::members(&env);
        if members.contains(&member) {
            return Err(Error::AlreadyMember);
        }
        if members.len() >= config.max_members {
            return Err(Error::CircleFull);
        }

        if config.collateral_amount > 0 {
            let this = env.current_contract_address();
            token::Client::new(&env, &config.token).transfer(
                &member,
                &this,
                &config.collateral_amount,
            );
        }
        env.storage().instance().set(
            &DataKey::Collateral(member.clone()),
            &config.collateral_amount,
        );

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

    /// Contribute the fixed amount for the current round. Rewards reputation.
    pub fn contribute(env: Env, member: Address) -> Result<(), Error> {
        member.require_auth();
        let config = Self::load_config(&env)?;
        if !config.started {
            return Err(Error::NotStarted);
        }
        let members = Self::members(&env);
        if !members.contains(&member) {
            return Err(Error::NotMember);
        }

        let round = Self::round(&env);
        // The round's recipient is exempt — they receive the pot, so there's no
        // point contributing what they'd get straight back.
        if Self::recipient_at(&members, round) == Some(member.clone()) {
            return Err(Error::IsRecipient);
        }
        let key = DataKey::Contributed(round, member.clone());
        if Self::has(&env, &key) {
            return Err(Error::AlreadyContributed);
        }

        let this = env.current_contract_address();
        token::Client::new(&env, &config.token).transfer(
            &member,
            &this,
            &config.contribution_amount,
        );
        env.storage().instance().set(&key, &true);
        Self::add_pot(&env, config.contribution_amount);

        // Inter-contract: reward reliability in the shared reputation contract.
        ReputationClient::new(&env, &config.reputation).record(&this, &member, &REP_CONTRIBUTE);

        Contributed {
            member,
            amount: config.contribution_amount,
            round,
        }
        .publish(&env);
        Ok(())
    }

    /// The current round's recipient claims the pot, rotating to the next round.
    pub fn claim_payout(env: Env) -> Result<(), Error> {
        let config = Self::load_config(&env)?;
        if !config.started {
            return Err(Error::NotStarted);
        }
        let members = Self::members(&env);
        let n = members.len();
        if n == 0 {
            return Err(Error::NotRecipient);
        }
        let round = Self::round(&env);
        let recipient = members.get((round - 1) % n).ok_or(Error::NotRecipient)?;
        recipient.require_auth();

        // Everyone except the recipient contributes, so the round completes at
        // n - 1 contributions.
        if Self::contributed_count(&env, round, &members) != n - 1 {
            return Err(Error::RoundIncomplete);
        }

        let pot = Self::pot(&env);
        let this = env.current_contract_address();
        token::Client::new(&env, &config.token).transfer(&this, &recipient, &pot);
        env.storage().instance().set(&DataKey::Pot, &0i128);
        env.storage().instance().set(&DataKey::Round, &(round + 1));

        PaidOut {
            recipient,
            amount: pot,
            round,
        }
        .publish(&env);
        Ok(())
    }

    /// Admin slashes a member who didn't contribute this round: their collateral
    /// covers the missed contribution and their reputation drops.
    pub fn slash(env: Env, member: Address) -> Result<(), Error> {
        let config = Self::load_config(&env)?;
        config.admin.require_auth();
        if !config.started {
            return Err(Error::NotStarted);
        }
        let members = Self::members(&env);
        if !members.contains(&member) {
            return Err(Error::NotMember);
        }
        let round = Self::round(&env);
        // The recipient is exempt this round, so they can't be a defaulter.
        if Self::recipient_at(&members, round) == Some(member.clone()) {
            return Err(Error::IsRecipient);
        }
        let key = DataKey::Contributed(round, member.clone());
        if Self::has(&env, &key) {
            return Err(Error::NotDefaulted);
        }

        // Draw the missed contribution from *this member's* collateral. Without
        // this check a repeat defaulter's slashes would be funded by everyone
        // else's collateral and the contract could not honour the payouts.
        let held = Self::collateral_of(&env, &member);
        if held < config.contribution_amount {
            return Err(Error::InsufficientCollateral);
        }
        env.storage().instance().set(
            &DataKey::Collateral(member.clone()),
            &(held - config.contribution_amount),
        );

        env.storage().instance().set(&key, &true);
        Self::add_pot(&env, config.contribution_amount);

        let this = env.current_contract_address();
        ReputationClient::new(&env, &config.reputation).record(&this, &member, &REP_DEFAULT);

        Slashed { member, round }.publish(&env);
        Ok(())
    }

    /* ----------------------------- reads ----------------------------- */

    pub fn get_config(env: Env) -> Result<CircleConfig, Error> {
        Self::load_config(&env)
    }

    pub fn get_members(env: Env) -> Vec<Address> {
        Self::members(&env)
    }

    pub fn get_round(env: Env) -> u32 {
        Self::round(&env)
    }

    pub fn get_pot(env: Env) -> i128 {
        Self::pot(&env)
    }

    pub fn has_contributed(env: Env, round: u32, member: Address) -> bool {
        Self::has(&env, &DataKey::Contributed(round, member))
    }

    /// Collateral still held for a member (posted on join, reduced by slashes).
    pub fn get_collateral(env: Env, member: Address) -> i128 {
        Self::collateral_of(&env, &member)
    }

    /// The member who receives the pot in the given round.
    pub fn get_recipient(env: Env, round: u32) -> Result<Address, Error> {
        Self::recipient_at(&Self::members(&env), round).ok_or(Error::NotRecipient)
    }

    /* ----------------------------- internal ----------------------------- */

    fn load_config(env: &Env) -> Result<CircleConfig, Error> {
        env.storage()
            .instance()
            .get(&DataKey::Config)
            .ok_or(Error::NotInitialized)
    }

    fn members(env: &Env) -> Vec<Address> {
        env.storage()
            .instance()
            .get(&DataKey::Members)
            .unwrap_or(Vec::new(env))
    }

    fn round(env: &Env) -> u32 {
        env.storage().instance().get(&DataKey::Round).unwrap_or(0)
    }

    fn pot(env: &Env) -> i128 {
        env.storage().instance().get(&DataKey::Pot).unwrap_or(0)
    }

    fn collateral_of(env: &Env, member: &Address) -> i128 {
        env.storage()
            .instance()
            .get(&DataKey::Collateral(member.clone()))
            .unwrap_or(0)
    }

    fn add_pot(env: &Env, amount: i128) {
        let pot = Self::pot(env) + amount;
        env.storage().instance().set(&DataKey::Pot, &pot);
    }

    fn has(env: &Env, key: &DataKey) -> bool {
        env.storage()
            .instance()
            .get::<DataKey, bool>(key)
            .unwrap_or(false)
    }

    /// The recipient for a round: members rotate, one per round.
    fn recipient_at(members: &Vec<Address>, round: u32) -> Option<Address> {
        let n = members.len();
        if n == 0 || round == 0 {
            return None;
        }
        members.get((round - 1) % n)
    }

    fn contributed_count(env: &Env, round: u32, members: &Vec<Address>) -> u32 {
        let mut count = 0u32;
        for m in members.iter() {
            if Self::has(env, &DataKey::Contributed(round, m)) {
                count += 1;
            }
        }
        count
    }
}

mod test;
