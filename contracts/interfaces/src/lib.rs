#![no_std]

//! Halka — shared contract interfaces.
//!
//! These `#[contractclient]` traits generate typed clients (`ReputationClient`,
//! `CircleClient`) for cross-contract calls WITHOUT pulling another contract's
//! implementation or spec into the caller's wasm. This is how the contracts talk
//! to each other (Factory → Circle, Circle/Factory → Reputation).

use soroban_sdk::{contractclient, Address, Env};

#[contractclient(name = "ReputationClient")]
pub trait Reputation {
    fn record(env: Env, reporter: Address, member: Address, delta: i64) -> i64;
    fn authorize_circle(env: Env, circle: Address);
}

#[contractclient(name = "CircleClient")]
pub trait Circle {
    fn initialize(
        env: Env,
        admin: Address,
        token: Address,
        reputation: Address,
        contribution_amount: i128,
        collateral_amount: i128,
        max_members: u32,
    );
}
