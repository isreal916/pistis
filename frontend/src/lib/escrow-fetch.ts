import { formatUnits, parseEventLogs, type Address, type PublicClient } from "viem";
import { pistisAbi, PistisStatus, MilestoneStatus as OnChainMilestoneStatus, BRIDGE_DESTINATIONS } from "./pistis";
import type { ActivityEntry, Escrow, Milestone } from "./escrow-types";

function destinationName(dstEid: number): string {
  return BRIDGE_DESTINATIONS.find((d) => d.eid === dstEid)?.label ?? `EID ${dstEid}`;
}

const STATUS_LABEL: Record<number, Escrow["status"]> = {
  [PistisStatus.Created]: "Active",
  [PistisStatus.Funded]: "Active",
  [PistisStatus.Active]: "Active",
  [PistisStatus.Completed]: "Completed",
  [PistisStatus.Cancelled]: "Cancelled",
};

const MILESTONE_STATUS_LABEL: Record<number, Milestone["status"]> = {
  [OnChainMilestoneStatus.Pending]: "queued",
  [OnChainMilestoneStatus.Submitted]: "awaiting",
  [OnChainMilestoneStatus.Approved]: "settled",
};

export function truncateAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function formatDeadline(deadline: bigint): string {
  if (deadline === BigInt(0)) return "No deadline set";
  return new Date(Number(deadline) * 1000).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/** Reads one Pistis escrow's full on-chain state and shapes it into the
 * UI's `Escrow` type. Note: the contract has no fields for a project name
 * or description (only per-milestone titles/amounts) — those are omitted
 * rather than invented. `deadline` is real on-chain data. */
export async function fetchEscrow(
  publicClient: PublicClient,
  address: Address,
  decimals: number
): Promise<Escrow> {
  const [client, freelancer, status, totalAmount, releasedAmount, milestoneCount, deadlineRaw] =
    await Promise.all([
      publicClient.readContract({ address, abi: pistisAbi, functionName: "client" }),
      publicClient.readContract({ address, abi: pistisAbi, functionName: "freelancer" }),
      publicClient.readContract({ address, abi: pistisAbi, functionName: "status" }),
      publicClient.readContract({ address, abi: pistisAbi, functionName: "totalAmount" }),
      publicClient.readContract({ address, abi: pistisAbi, functionName: "releasedAmount" }),
      publicClient.readContract({ address, abi: pistisAbi, functionName: "milestoneCount" }),
      publicClient.readContract({ address, abi: pistisAbi, functionName: "deadline" }),
    ]);

  const rawMilestones = await Promise.all(
    Array.from({ length: Number(milestoneCount) }, (_, i) =>
      publicClient.readContract({
        address,
        abi: pistisAbi,
        functionName: "getMilestone",
        args: [BigInt(i)],
      })
    )
  );

  const milestones: Milestone[] = rawMilestones.map((m, i) => {
    const pct = totalAmount > BigInt(0) ? Number((m.amount * BigInt(100)) / totalAmount) : 0;
    const statusLabel = MILESTONE_STATUS_LABEL[m.status];
    const reviewSuffix = statusLabel === "awaiting" ? "awaiting review" : statusLabel;
    return {
      index: i,
      title: m.title,
      amount: `${formatUnits(m.amount, decimals)} FXRP`,
      progressLabel: `${pct}% · ${reviewSuffix}`,
      status: statusLabel,
      workURI: m.workURI,
    };
  });

  const totalNum = Number(formatUnits(totalAmount, decimals));
  const releasedNum = Number(formatUnits(releasedAmount, decimals));
  const progress = totalNum > 0 ? Math.round((releasedNum / totalNum) * 100) : 0;

  const title =
    milestones.length === 1
      ? milestones[0].title
      : `${milestones.length}-milestone escrow`;

  const deadlineLabel = formatDeadline(deadlineRaw);

  return {
    id: address,
    title,
    description: "",
    client: truncateAddress(client),
    dueDate: deadlineLabel,
    contract: truncateAddress(address),
    amount: `${formatUnits(totalAmount, decimals)} FXRP`,
    status: STATUS_LABEL[status],
    progress,
    clientWallet: client,
    freelancerWallet: freelancer,
    depositAsset: "FXRP",
    budget: `${formatUnits(totalAmount, decimals)} FXRP`,
    deadline: deadlineLabel,
    milestones,
    activity: [],
    needsDeposit: status === PistisStatus.Created,
    totalAmountRaw: totalAmount,
  };
}

/** Coston2's public RPC caps `eth_getLogs` at a small block range (observed:
 * 30) — scanning from a factory's deploy block in one call fails almost
 * immediately as the chain progresses. 25 leaves a safety margin. */
const LOG_CHUNK_SIZE = BigInt(25);

/** Safety valve on total chunked requests a single activity fetch will make,
 * in case a deployment block search ever returns something unexpectedly far
 * back. ~400 chunks covers roughly 10,400 blocks (~5+ hours on Coston2) —
 * comfortably more than any escrow will realistically need, while still
 * bounding the worst case instead of scanning forever. */
const MAX_CHUNKS = 400;

/** Finds the exact block a contract was deployed at via binary search on
 * `eth_getCode` (empty before deployment, non-empty after) — no block-range
 * cap applies to single-block reads, so this is cheap (~log2(range) calls)
 * regardless of how old the contract is. This replaces guessing a fixed
 * lookback window, which was silently missing real activity older than the
 * window and showing "No on-chain activity yet" even when there was some. */
async function findDeploymentBlock(
  publicClient: PublicClient,
  address: Address,
  lowerBound: bigint,
  upperBound: bigint
): Promise<bigint> {
  let lo = lowerBound;
  let hi = upperBound;
  while (lo < hi) {
    const mid = (lo + hi) / BigInt(2);
    const code = await publicClient.getCode({ address, blockNumber: mid });
    if (code && code !== "0x") {
      hi = mid;
    } else {
      lo = mid + BigInt(1);
    }
  }
  return hi;
}

/** Reconstructs an activity feed from the escrow's own event log — real
 * on-chain history, not fabricated copy. Scans from the escrow's actual
 * deployment block (found via findDeploymentBlock) rather than an arbitrary
 * lookback window, so activity from earlier in the escrow's life doesn't
 * silently disappear. Chunks the query to stay under the RPC's block-range
 * limit, bounded by MAX_CHUNKS as a worst-case safety valve. */
export async function fetchActivity(
  publicClient: PublicClient,
  address: Address,
  fromBlock: bigint,
  decimals: number
): Promise<ActivityEntry[]> {
  const latestBlock = await publicClient.getBlockNumber();
  const deployBlock = await findDeploymentBlock(publicClient, address, fromBlock, latestBlock);
  const minStartBlock = latestBlock - BigInt(MAX_CHUNKS) * (LOG_CHUNK_SIZE + BigInt(1));
  const startBlock = deployBlock > minStartBlock ? deployBlock : minStartBlock;

  const chunkStarts: bigint[] = [];
  for (let b = startBlock; b <= latestBlock; b += LOG_CHUNK_SIZE + BigInt(1)) {
    chunkStarts.push(b);
  }

  const chunkedLogs = await Promise.all(
    chunkStarts.map((chunkStart) =>
      publicClient.getContractEvents({
        address,
        abi: pistisAbi,
        fromBlock: chunkStart,
        toBlock: chunkStart + LOG_CHUNK_SIZE > latestBlock ? latestBlock : chunkStart + LOG_CHUNK_SIZE,
      })
    )
  );
  const logs = chunkedLogs.flat();

  const blockNumbers = Array.from(new Set(logs.map((l) => l.blockNumber)));
  const blocks = await Promise.all(
    blockNumbers.map((bn) => publicClient.getBlock({ blockNumber: bn }))
  );
  const timeByBlock = new Map(
    blockNumbers.map((bn, i) => [bn, blocks[i].timestamp])
  );

  const entries = parseEventLogs({ abi: pistisAbi, logs }).map((log) => {
    const time = new Date(
      Number(timeByBlock.get(log.blockNumber) ?? BigInt(0)) * 1000
    ).toLocaleString();

    const fxrp = (wei: bigint) => `${formatUnits(wei, decimals)} FXRP`;

    switch (log.eventName) {
      case "Deposited":
        return { text: `Escrow funded — ${fxrp(log.args.amount)} deposited`, time };
      case "MilestoneSubmitted":
        return { text: `Milestone ${log.args.index} submitted for review`, time };
      case "MilestoneReleasedLocally":
        return {
          text: `Milestone ${log.args.index} approved — ${fxrp(log.args.amount)} released to ${truncateAddress(log.args.to)}`,
          time,
        };
      case "MilestoneReleasedAndBridged":
        return {
          text: `Milestone ${log.args.index} approved — ${fxrp(log.args.amount)} bridged to ${truncateAddress(log.args.to)} on ${destinationName(log.args.dstEid)}`,
          time,
          // Coston2's log only proves the send — this is where to actually
          // check whether LayerZero delivered it on the destination chain.
          link: `https://testnet.layerzeroscan.com/tx/${log.transactionHash}`,
          linkLabel: "Track delivery on LayerZero Scan",
        };
      case "Cancelled":
        return { text: `Escrow cancelled — ${fxrp(log.args.refunded)} refunded`, time };
      default:
        return { text: log.eventName, time };
    }
  });

  return entries.reverse(); // most recent first
}
