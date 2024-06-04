import { Favorites } from "../target/types/favorites";
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import {
  airdropIfRequired,
  getCustomErrorMessage,
} from "@solana-developers/helpers";
import {
  Keypair,
  PublicKey,
  LAMPORTS_PER_SOL,
  TransactionSignature,
} from "@solana/web3.js";
import BN from "bn.js";
import { assert } from "chai";
import { systemProgramErrors } from "./system-program-errors";
import { cloneWithBnCleanup } from "./cleanup-bn";

export const newAccountWithSol = async (
  solAmount: number,
): Promise<Keypair> => {
  const account = Keypair.generate();

  await airdropIfRequired(
    anchor.getProvider().connection,
    account.publicKey,
    solAmount * LAMPORTS_PER_SOL,
    solAmount * LAMPORTS_PER_SOL
  );

  return account;
};

export const createUserFavorites = async (
  program: Program<Favorites>,
  user: Keypair,
  num: number | BN,
  color: string
): Promise<{
  favorites: PublicKey;
  signature: TransactionSignature;
}> => {
  const tx = program.methods
    .setFavorites(new BN(num), color)
    .accounts({
      user: user.publicKey,
    })
    .signers([user]);

  const { pubkeys: { favorites }, signature } = await (async () => {
    try {
      // Send the transaction to the cluster or RPC
      return await tx.rpcAndKeys();
    } catch (thrownObject) {
      // Let's properly log the error, so we can see the program involved
      // and (for well known programs) the full log message.

      const rawError = thrownObject as Error;
      throw new Error(
        getCustomErrorMessage(systemProgramErrors, rawError.message)
      );
    }
  })();

  return {
    favorites,
    signature,
  };
};

type FavoritesAccount = Awaited<
  ReturnType<Program<Favorites>["account"]["favorites"]["fetch"]>
>;

export const assertFavoritesEquals = async (
  program: Program<Favorites>,
  account: PublicKey,
  expected: FavoritesAccount
): Promise<void> => {
  const actual = await program.account.favorites.fetch(account);
  assert.equal(cloneWithBnCleanup(actual), cloneWithBnCleanup(expected));
};

describe("favorites", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.Favorites as Program<Favorites>;

  it("Writes our favorites to the blockchain", async () => {
    const user = await newAccountWithSol(1);

    console.log(`User public key: ${user.publicKey}`);

    // Here's what we want to write to the blockchain
    const favoriteNumber = new BN(23);
    const favoriteColor = "red";

    const { favorites, signature } = await createUserFavorites(
      program,
      user,
      favoriteNumber,
      favoriteColor
    );

    console.log(`Tx: ${signature}`);

    await assertFavoritesEquals(program, favorites, {
      number: favoriteNumber,
      color: favoriteColor,
    });
  });
});
