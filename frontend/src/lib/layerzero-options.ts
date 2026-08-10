/** Minimal LayerZero V2 "Type 3" executor-options encoder — just enough to
 * build an `addExecutorLzReceiveOption(gasLimit)` payload without pulling in
 * the full `@layerzerolabs/lz-v2-utilities` package. Format (all big-endian):
 *   0x0003 (type 3 header)
 *   + workerId  (1 byte,  0x01 = executor)
 *   + optionLen (2 bytes, length of optionType + params that follow)
 *   + optionType (1 byte, 0x01 = LZRECEIVE)
 *   + gasLimit  (16 bytes, uint128)
 * Reference: https://docs.layerzero.network/v2/concepts/technical-standards/options-reference
 */
export function buildLzReceiveOptions(gasLimit: bigint): `0x${string}` {
  const TYPE_3 = "0003";
  const WORKER_ID_EXECUTOR = "01";
  const OPTION_TYPE_LZRECEIVE = "01";

  const gasHex = gasLimit.toString(16).padStart(32, "0"); // uint128 = 16 bytes
  const optionLen = (1 + gasHex.length / 2).toString(16).padStart(4, "0"); // optionType + gas

  return `0x${TYPE_3}${WORKER_ID_EXECUTOR}${optionLen}${OPTION_TYPE_LZRECEIVE}${gasHex}` as `0x${string}`;
}

/** Default lzReceive gas limit for a plain OFT credit on the destination
 * chain — generous margin over the ~80k typical floor. */
export const DEFAULT_LZ_RECEIVE_GAS = BigInt(200_000);
