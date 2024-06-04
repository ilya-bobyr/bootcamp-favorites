//! When someone wants to change other person's favorites, they can do so by creating a
//! [`ChangeRequest`].

use {
    crate::{
        state::{
            change_request::{ChangeRequest, ChangeRequestTarget},
            Favorites,
        },
        ANCHOR_DISCRIMINATOR_SIZE,
    },
    anchor_lang::prelude::*,
};

#[derive(Accounts)]
pub struct CreateChangeRequest<'info> {
    /// Request initiator.  Will be stored in the [`ChangeRequest::requester`].
    #[account(mut)]
    pub requester: Signer<'info>,

    /// User, who's favorites this request is targeting.  [`ChangeRequest::user`].
    /// CHECK: `new_request` will reference this `user`.
    pub user: UncheckedAccount<'info>,

    #[account(
        seeds = [b"favorites", user.key().as_ref()],
        bump,
    )]
    /// Account holding the favorites of the [`user`](CreateChangeRequest::user).
    pub favorites: Account<'info, Favorites>,

    #[account(
        init,
        payer = requester,
        space = ANCHOR_DISCRIMINATOR_SIZE + ChangeRequest::INIT_SPACE,
    )]
    pub new_request: Account<'info, ChangeRequest>,

    pub system_program: Program<'info, System>,
}

pub fn create_change_request(
    context: Context<CreateChangeRequest>,
    change_target: ChangeRequestTarget,
) -> Result<()> {
    let requester = context.accounts.requester.key();
    let user = context.accounts.user.key();

    match &change_target {
        ChangeRequestTarget::Number { new_number } => {
            msg!(
                "Request for user {} to change number to {}",
                user,
                new_number
            )
        }
        ChangeRequestTarget::Color { new_color } => {
            msg!(
                "Request for user {} to change color to \"{}\"",
                user,
                new_color
            )
        }
    }

    context.accounts.new_request.set_inner(ChangeRequest {
        requester,
        user,
        target: change_target,
    });

    Ok(())
}
