//! One can request a change to a user favorites.  Outstanding requests are stored as
//! [`ChangeRequest`]s.

use anchor_lang::prelude::*;

#[cfg(doc)]
use super::Favorites;

/// When someone whats to change a user color, they need to start by creating a [`ChangeRequest`].
/// Target user can then accept or deny the request.
#[account]
#[derive(InitSpace)]
pub struct ChangeRequest {
    /// User who initiated the request.
    pub requester: Pubkey,

    /// Who's number or color [`requester`](ChangeRequest::requester) wants to change.
    pub user: Pubkey,

    /// Which part of [`Favorites`] this request is targeting.
    pub target: ChangeRequestTarget,
}

/// A change request could request either the [`number`], or the [`color`] to be changed.
///
/// [`number`]: Favorites::number
/// [`color`]: Favorites::color
#[derive(Clone, PartialEq, Eq, AnchorSerialize, AnchorDeserialize, InitSpace)]
pub enum ChangeRequestTarget {
    Number {
        new_number: u64,
    },
    Color {
        #[max_len(50)]
        new_color: String,
    },
}
