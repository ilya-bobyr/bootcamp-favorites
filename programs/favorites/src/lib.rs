use anchor_lang::prelude::*;

pub mod instructions;
pub mod state;

use instructions::*;

declare_id!("3xqTjo3WNYdvypRa6tWFgCxdi8BWE26wL94q8sLxx3FQ");

/// Anchor data structures use the first 8 bytes to know the type of a value in it's serialized
/// form.
pub const ANCHOR_DISCRIMINATOR_SIZE: usize = 8;

#[program]
/// Our Solana program!
pub mod favorites {
    use super::*;

    /// Sets favorite number and color for the user.
    pub fn set_favorites(context: Context<SetFavorites>, number: u64, color: String) -> Result<()> {
        instructions::set_favorites(context, number, color)
    }

    pub fn create_change_request(
        context: Context<CreateChangeRequest>,
        change_target: state::change_request::ChangeRequestTarget,
    ) -> Result<()> {
        instructions::create_change_request(context, change_target)
    }

    pub fn accept_change_request(context: Context<AcceptChangeRequest>) -> Result<()> {
        instructions::accept_change_request(context)
    }
}
