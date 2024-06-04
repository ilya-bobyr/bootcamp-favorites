//! On-chain state for the `Favorites` program.

use anchor_lang::prelude::*;

pub mod change_request;

/// What we will put inside the Favorites PDA.
#[account]
#[derive(InitSpace)]
pub struct Favorites {
    pub number: u64,

    #[max_len(50)]
    pub color: String,
}

