//! When a user is happy with the suggested [`ChangeRequest`], they can accept it.

use {
    crate::state::{
        change_request::{ChangeRequest, ChangeRequestTarget},
        Favorites,
    },
    anchor_lang::prelude::*,
};

#[derive(Accounts)]
pub struct AcceptChangeRequest<'info> {
    /// Request initiator.  Change request rent will be paid back to this account.
    /// CHECK: `request` needs to be from this account.
    #[account(mut)]
    pub requester: UncheckedAccount<'info>,

    /// User accepting the change request.
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        mut,
        seeds = [b"favorites", user.key().as_ref()],
        bump,
    )]
    /// Account holding the favorites of the [`user`](CreateChangeRequest::user).
    pub favorites: Account<'info, Favorites>,

    #[account(has_one = user, has_one = requester)]
    /// A change request that the user wants to accept.
    pub request: Account<'info, ChangeRequest>,

    pub system_program: Program<'info, System>,
}

pub fn accept_change_request(context: Context<AcceptChangeRequest>) -> Result<()> {
    let user = context.accounts.user.key();
    let request = context.accounts.request.target.clone();

    match request {
        ChangeRequestTarget::Number { new_number } => {
            msg!(
                "Updating user {} to have a new favorite number: {}",
                user,
                new_number
            );

            context.accounts.favorites.number = new_number;
        }
        ChangeRequestTarget::Color { new_color } => {
            msg!(
                "Updating user {} to have a new favorite color: {}",
                user,
                new_color
            );

            context.accounts.favorites.color = new_color;
        }
    }

    // Refund rent SOL to the requester.
    context
        .accounts
        .request
        .close(context.accounts.requester.to_account_info())?;

    Ok(())
}
