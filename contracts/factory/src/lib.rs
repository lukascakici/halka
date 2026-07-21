#![no_std]

//! Halka — Factory contract (Level 3)
//!
//! Deploys and registers `Circle` instances and authorizes each one in the
//! shared `Reputation` contract. This is the inter-contract backbone:
//! Factory → deploy Circle, Factory → Reputation.authorize_circle.

use interfaces::{CircleClient, ReputationClient};
use soroban_sdk::{
    contract, contracterror, contractevent, contractimpl, contracttype, Address, BytesN, Env, Vec,
};

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Admin,
    Reputation,
    Token,
    CircleWasm,
    Count,
    Circles,
}

#[contracterror]
#[derive(Copy, Clone, PartialEq, Eq, Debug)]
#[repr(u32)]
pub enum Error {
    AlreadyInitialized = 1,
    NotInitialized = 2,
    InvalidParams = 3,
}

#[contractevent]
#[derive(Clone)]
pub struct CircleCreated {
    #[topic]
    pub creator: Address,
    #[topic]
    pub circle: Address,
}

#[contractevent]
#[derive(Clone)]
pub struct AdminChanged {
    #[topic]
    pub admin: Address,
}

#[contractevent]
#[derive(Clone)]
pub struct CircleWasmChanged {
    pub wasm: BytesN<32>,
}

#[contract]
pub struct FactoryContract;

#[contractimpl]
impl FactoryContract {
    /// Configure the factory with the shared reputation contract, the
    /// contribution token, and the Circle wasm hash to deploy.
    pub fn initialize(
        env: Env,
        admin: Address,
        reputation: Address,
        token: Address,
        circle_wasm: BytesN<32>,
    ) -> Result<(), Error> {
        if env.storage().instance().has(&DataKey::Admin) {
            return Err(Error::AlreadyInitialized);
        }
        admin.require_auth();

        let s = env.storage().instance();
        s.set(&DataKey::Admin, &admin);
        s.set(&DataKey::Reputation, &reputation);
        s.set(&DataKey::Token, &token);
        s.set(&DataKey::CircleWasm, &circle_wasm);
        s.set(&DataKey::Count, &0u32);
        s.set(&DataKey::Circles, &Vec::<Address>::new(&env));
        Ok(())
    }

    /// Deploy a new circle, initialize it, and authorize it in reputation.
    pub fn create_circle(
        env: Env,
        creator: Address,
        contribution_amount: i128,
        collateral_amount: i128,
        max_members: u32,
        round_timeout_ledgers: u32,
    ) -> Result<Address, Error> {
        creator.require_auth();
        let s = env.storage().instance();
        let reputation: Address = s.get(&DataKey::Reputation).ok_or(Error::NotInitialized)?;
        let token: Address = s.get(&DataKey::Token).ok_or(Error::NotInitialized)?;
        let wasm: BytesN<32> = s.get(&DataKey::CircleWasm).ok_or(Error::NotInitialized)?;
        let count: u32 = s.get(&DataKey::Count).unwrap_or(0);

        // Deploy a fresh Circle instance with a deterministic salt.
        let circle = env
            .deployer()
            .with_current_contract(salt_from_count(&env, count))
            .deploy_v2(wasm, ());

        // Initialize it and authorize it to write reputation.
        CircleClient::new(&env, &circle).initialize(
            &creator,
            &token,
            &reputation,
            &contribution_amount,
            &collateral_amount,
            &max_members,
            &round_timeout_ledgers,
        );
        ReputationClient::new(&env, &reputation).authorize_circle(&circle);

        let mut circles: Vec<Address> = s.get(&DataKey::Circles).unwrap_or(Vec::new(&env));
        circles.push_back(circle.clone());
        s.set(&DataKey::Circles, &circles);
        s.set(&DataKey::Count, &(count + 1));

        CircleCreated {
            creator,
            circle: circle.clone(),
        }
        .publish(&env);
        Ok(circle)
    }

    /// Hand the admin role to another account — the route to a multisig or a
    /// timelock once the protocol is live.
    pub fn set_admin(env: Env, new_admin: Address) -> Result<(), Error> {
        Self::admin(&env)?.require_auth();
        env.storage().instance().set(&DataKey::Admin, &new_admin);
        AdminChanged { admin: new_admin }.publish(&env);
        Ok(())
    }

    /// Point the factory at a new Circle wasm. Circles already deployed keep
    /// running the code their members agreed to — this only affects circles
    /// created from here on.
    pub fn set_circle_wasm(env: Env, wasm: BytesN<32>) -> Result<(), Error> {
        Self::admin(&env)?.require_auth();
        env.storage().instance().set(&DataKey::CircleWasm, &wasm);
        CircleWasmChanged { wasm }.publish(&env);
        Ok(())
    }

    /// Replace this contract's code. The factory only deploys and indexes
    /// circles — it never custodies member funds — so upgrading it cannot
    /// touch money already committed to a circle.
    pub fn upgrade(env: Env, new_wasm_hash: BytesN<32>) -> Result<(), Error> {
        Self::admin(&env)?.require_auth();
        env.deployer().update_current_contract_wasm(new_wasm_hash);
        Ok(())
    }

    pub fn get_admin(env: Env) -> Result<Address, Error> {
        Self::admin(&env)
    }

    pub fn get_circle_wasm(env: Env) -> Result<BytesN<32>, Error> {
        env.storage()
            .instance()
            .get(&DataKey::CircleWasm)
            .ok_or(Error::NotInitialized)
    }

    pub fn list_circles(env: Env) -> Vec<Address> {
        env.storage()
            .instance()
            .get(&DataKey::Circles)
            .unwrap_or(Vec::new(&env))
    }

    pub fn get_circle_count(env: Env) -> u32 {
        env.storage().instance().get(&DataKey::Count).unwrap_or(0)
    }

    fn admin(env: &Env) -> Result<Address, Error> {
        env.storage()
            .instance()
            .get(&DataKey::Admin)
            .ok_or(Error::NotInitialized)
    }
}

fn salt_from_count(env: &Env, count: u32) -> BytesN<32> {
    let mut bytes = [0u8; 32];
    let c = count.to_be_bytes();
    bytes[0] = c[0];
    bytes[1] = c[1];
    bytes[2] = c[2];
    bytes[3] = c[3];
    BytesN::from_array(env, &bytes)
}

mod test;
