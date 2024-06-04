import { Favorites } from "../target/types/favorites";
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import {
  Keypair,
  PublicKey,
  TransactionSignature,
} from "@solana/web3.js";
import { assert } from "chai";
import BN from "bn.js";
import { newAccountWithSol, createUserFavorites, assertFavoritesEquals } from "./favorites";
import { cloneWithBnCleanup } from "./cleanup-bn";

type ChangeRequestAccount = Awaited<
  ReturnType<Program<Favorites>["account"]["changeRequest"]["fetch"]>
>;
type ChangeRequestTarget = ChangeRequestAccount["target"];

export const createChangeRequest = async (
  program: Program<Favorites>,
  requester: Keypair,
  user: PublicKey,
  changeRequest: ChangeRequestTarget
): Promise<{
  newRequest: PublicKey;
  signature: TransactionSignature;
}> => {
  const methodCall = program.methods
    .createChangeRequest(changeRequest)
    .accounts({
      requester: requester.publicKey,
      user,
    });
    // .signers([requester]);

  const { newRequest } = await methodCall.pubkeys();

  let tx = await methodCall.transaction();
  tx.feePayer = requester.publicKey;

  const signature = await anchor.getProvider().sendAndConfirm(tx, [requester]);

  return {
    newRequest,
    signature,
  };
};

export const assertChangeRequestEquals = async (
  program: Program<Favorites>,
  account: PublicKey,
  expected: ChangeRequestAccount
): Promise<void> => {
  const actual = await program.account.changeRequest.fetch(account);
  assert.equal(cloneWithBnCleanup(actual), cloneWithBnCleanup(expected));
};

describe("favorites/change_requests", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.Favorites as Program<Favorites>;

  it("Allows creation of a change request", async () => {
    const requester = await newAccountWithSol(1);
    const user = await newAccountWithSol(1);

    // Prepare a favorites account.
    const favoriteNumber = new BN(790);
    const favoriteColor = "cerulean";
    const { favorites } = await createUserFavorites(
      program,
      user,
      favoriteNumber,
      favoriteColor
    );

    // Prepare a change request coming from `requester`.
    const changeRequest: ChangeRequestTarget = {
      number: {
        newNumber: new BN(298),
      },
    };

    let { newRequest, signature } = await createChangeRequest(
      program,
      requester,
      user.publicKey,
      changeRequest
    );

    console.log(`Tx ${signature}: Created change reqest at ${newRequest}`);

    await assertChangeRequestEquals(program, newRequest, {
      requester: requester.publicKey,
      user: user.publicKey,
      target: changeRequest,
    });

    // Make sure the account is not changed.
    await assertFavoritesEquals(program, favorites, {
      number: favoriteNumber,
      color: favoriteColor,
    });
  });

  it.only("Accepts a valid change request", async () => {
    const connection = anchor.getProvider().connection;

    const user = await newAccountWithSol(1);
    const requester = await newAccountWithSol(1);

    console.log(`user account: ${user.publicKey}`);
    console.log(`requester account: ${requester.publicKey}`);

    // Prepare a favorites account.
    const favoriteNumber = new BN(528);
    const favoriteColor = "cerulean";
    const { favorites } = await createUserFavorites(
      program,
      user,
      favoriteNumber,
      favoriteColor
    );

    console.log(`Favorites account is at: ${favorites}`);

    const newFavoriteNumber = new BN(690);
    // Prepare a change request coming from `requester`.
    const changeRequest: ChangeRequestTarget = {
      number: {
        newNumber: newFavoriteNumber,
      },
    };

    const requesterBalanceBeforeCreation = await connection.getBalance(
      requester.publicKey
    );
    console.log(`requesterBalanceBeforeCreation: ${requesterBalanceBeforeCreation}`);
    const userBalanceBeforeCreation = await connection.getBalance(
      user.publicKey
    );
    console.log(`userBalanceBeforeCreation: ${userBalanceBeforeCreation}`);

    const newRequest = await (async () => {
      const { newRequest, signature } = await createChangeRequest(
        program,
        requester,
        user.publicKey,
        changeRequest
      );

      console.log(`Tx ${signature}: Created change reqest at ${newRequest}`);

      return newRequest;
    })();

    const requesterBalanceAfterCreation = await connection.getBalance(
      requester.publicKey
    );
    console.log(`requesterBalanceAfterCreation: ${requesterBalanceAfterCreation}`);
    console.log(`  diff: ${requesterBalanceBeforeCreation - requesterBalanceAfterCreation}`);
    const userBalanceAfterCreation = await connection.getBalance(
      user.publicKey
    );
    console.log(`userBalanceAfterCreation: ${userBalanceAfterCreation}`);
    console.log(`  diff: ${userBalanceBeforeCreation - userBalanceAfterCreation}`);

    await assertChangeRequestEquals(program, newRequest, {
      requester: requester.publicKey,
      user: user.publicKey,
      target: changeRequest,
    });

    // This was computed in Rust.  Seems like account sizes are not exported
    // in IDL?
    const expectedRequestRent =
      await connection.getMinimumBalanceForRentExemption(127);
    console.log(`expectedRequestRent: ${expectedRequestRent}`);

    // assert.isBelow(
    //   requesterBalanceAfterCreation,
    //   requesterBalanceBeforeCreation - expectedRequestRent
    // );

    // Make sure the account is not changed.
    await assertFavoritesEquals(program, favorites, {
      number: favoriteNumber,
      color: favoriteColor,
    });

    // type AccountsPartialArgs =
    //  Parameters<ReturnType<Program<Favorites>["methods"]["acceptChangeRequest"]>["accountsPartial"]>;

    const methodCall = program.methods
      .acceptChangeRequest()
      .accountsPartial({
        requester: requester.publicKey,
        user: user.publicKey,
        request: newRequest,
      })
      .signers([user]);

    await (async () => {
      const { pubkeys, signers } = await methodCall.prepare();
      for (let k in pubkeys) {
        console.log(`Account[${k}]: ${pubkeys[k].toBase58()}`);
      }
      for (let i in signers) {
        console.log(`Signer[${i}]: ${signers[i].publicKey}`);
      }
    })();

    let tx = await methodCall.transaction();
    tx.feePayer = user.publicKey;

    console.log(`tx.feePayer: ${tx.feePayer}`);
    console.log(`user: ${user.publicKey}`);

    // TODO `sendAndConfirm()` is failing with the Anchor trying to use the
    // `request` address, instead of the `user` to sign the transaction.  And it
    // fails with the following error.
    //
    //     Account[requester]: 7QgZxNfG3VhKqPweMUAbj7bEoZKtHYFhizj78X4XLyLb
    //     Account[user]: ErafgUTT6Z5vPDwUFie6c3Pbkji2TGQvCcgtfRBvnUSf
    //     Account[request]: i11ddvDmRQCcWUByyEziAgzdVeYF8otpQeidaBJtLaz
    //     Account[systemProgram]: 11111111111111111111111111111111
    //     Account[favorites]: 46szn5Uf5zfitTVxkj6sWv4dqcQFHckc3Wa8UYP3iUGr
    //     Signer[0]: ErafgUTT6Z5vPDwUFie6c3Pbkji2TGQvCcgtfRBvnUSf
    //     tx.feePayer: ErafgUTT6Z5vPDwUFie6c3Pbkji2TGQvCcgtfRBvnUSf
    //     user: ErafgUTT6Z5vPDwUFie6c3Pbkji2TGQvCcgtfRBvnUSf
    //         1) Accepts a valid change request
    //     
    //     
    //       0 passing (27s)
    //       1 failing
    //     
    //       1) favorites/change_requests
    //            Accepts a valid change request:
    //          Error: unknown signer: i11ddvDmRQCcWUByyEziAgzdVeYF8otpQeidaBJtLaz
    //           at Transaction._addSignature (node_modules/@solana/web3.js/src/transaction/legacy.ts:754:13)
    //           at forEach (node_modules/@solana/web3.js/src/transaction/legacy.ts:727:12)
    //           at Array.forEach (<anonymous>)
    //           at Transaction._partialSign (node_modules/@solana/web3.js/src/transaction/legacy.ts:725:13)
    //           at Transaction.partialSign (node_modules/@solana/web3.js/src/transaction/legacy.ts:717:10)
    //           at NodeWallet.signTransaction (node_modules/@coral-xyz/anchor/src/nodewallet.ts:45:10)
    //           at AnchorProvider.sendAndConfirm (node_modules/@coral-xyz/anchor/src/provider.ts:159:28)
    //           at processTicksAndRejections (node:internal/process/task_queues:95:5)
    //
    // It is very confusing, as the transaction explicitly specifies the `user`
    // as the signer.  If I use `tx.rpc()`, the transaction is sent, but it
    // fails at the simulation stage with the following error:
    //
    //     failed to send transaction: Transaction simulation failed: This account may not be used to pay transaction fees
    //
    // I have no idea which account Anchor uses to sign the transaction, but
    // seems to be something other than the `user`.

    // const signature = await tx.rpc();
    const signature = await anchor.getProvider().sendAndConfirm(tx, [user]);


    console.log(`Tx ${signature}: Accepted a change reqest`);

    // Make sure the account has been updated.
    await assertFavoritesEquals(program, favorites, {
      number: newFavoriteNumber,
      color: favoriteColor,
    });

    const requesterBalanceAfterAcceptance = await connection.getBalance(
      requester.publicKey
    );
    console.log(`requesterBalanceAfterAcceptance: ${requesterBalanceAfterAcceptance}`);

    assert.approximately(
      requesterBalanceAfterCreation + expectedRequestRent,
      requesterBalanceAfterAcceptance,
      0.00001
    );
  });
});
