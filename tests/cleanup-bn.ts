/***
 * `BN` values may have multiple representations for the same value.  In
 * particular, they hold a buffer, but store the length of the "active" part of
 * the buffer separately from the buffer.
 *
 * For example, the following two `BN` values are supposed to be equal, but they
 * are not, when Chai runs deep comparison on them :(
 *
 * { negative: 0, words: [ 23, 0, 0 ], length: 1, red: null }
 *
 * { negative: 0, words: [ 23 ], length: 1, red: null }
 *
 * There are probably a few ways to fix it, ideally, just use the `eq()` method,
 * but I was not able to persuade Chai to use `eq()` when performing deep
 * comparison.  So the next approach is to cleanup `BN` values before the
 * comparison.
 */

// @ts-ignore
import mapValuesDeep from "deepdash/mapValuesDeep";
import BN from "bn.js";

export const cloneWithBnCleanup = <T>(v: T): T => {
  return mapValuesDeep(v, (v: any) => {
    v instanceof BN ? v.clone() : undefined;
  });
};
