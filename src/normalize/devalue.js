const { unflatten } = require('devalue');

/**
 * Safely decodes a SvelteKit devalue-flattened payload.
 * SvelteKit __data.json files represent object graphs as an array of referenced tokens.
 * @param {any[]} rawArray
 * @returns {any}
 */
function decodeDevaluePayload(rawArray) {
  if (!Array.isArray(rawArray)) {
    return rawArray;
  }
  try {
    return unflatten(rawArray);
  } catch (err) {
    // If already decoded or unflatten fails, return the first item or raw
    return rawArray[0] || rawArray;
  }
}

module.exports = { decodeDevaluePayload };
