// https://github.com/hypercerts-org/hypercerts/blob/7671d06762c929bc2890a31e5dc392f8a30065c6/contracts/test/foundry/protocol/Bitshifting.t.sol

/**
 * The maximum value that can be represented as an uint256.
 * @type {BigInt}
 */
const MAX = BigInt("0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF");

/**
 * A mask that represents the base id of the token. It is created by shifting the maximum uint256 value left by 128 bits.
 * @type {BigInt}
 */
const TYPE_MASK = MAX << BigInt(128);

/**
 * A mask that represents the index of a non-fungible token. It is created by shifting the maximum uint256 value right by 128 bits.
 * @type {BigInt}
 */
const NF_INDEX_MASK = MAX >> BigInt(128);

/**
 * Checks if a token ID represents a base type token.
 *
 * A token ID is considered to represent a base type token if:
 * - The bitwise AND of the token ID and the TYPE_MASK equals the token ID.
 * - The bitwise AND of the token ID and the NF_INDEX_MASK equals 0.
 *
 * @param {BigInt} id - The token ID to check.
 * @returns {boolean} - Returns true if the token ID represents a base type token, false otherwise.
 */
const isBaseType = (id: bigint) => {
  return (id & TYPE_MASK) === id && (id & NF_INDEX_MASK) === BigInt(0);
};

/**
 * Checks if a token ID represents a claim token.
 *
 * A token ID is considered to represent a claim token if it is not null and it represents a base type token.
 *
 * @param {BigInt} tokenId - The token ID to check. It can be undefined.
 * @returns {boolean} - Returns true if the token ID represents a claim token, false otherwise.
 */
export const isHypercertToken = (tokenId?: bigint) => {
  if (!tokenId) {
    return false;
  }
  return isBaseType(tokenId);
};

/**
 * Gets the claim token ID from a given token ID.
 *
 * The claim token ID is obtained by applying the TYPE_MASK to the given token ID using the bitwise AND operator.
 * The result is logged to the console for debugging purposes.
 *
 * @param {BigInt} tokenId - The token ID to get the claim token ID from.
 * @returns {BigInt} - Returns the claim token ID.
 */
export const getHypercertTokenId = (tokenId: bigint) => {
  return tokenId & TYPE_MASK;
};
