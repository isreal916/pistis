export type MilestoneStatus = "settled" | "awaiting" | "queued";

export type Milestone = {
  index: number;
  title: string;
  amount: string;
  progressLabel: string;
  status: MilestoneStatus;
  /** Freelancer's submitted proof-of-work link/notes — empty until submitted. */
  workURI: string;
};

export type ActivityEntry = {
  text: string;
  time: string;
  /** External link for verifying this event beyond Pistis's own state — e.g.
   * a LayerZero Scan URL to confirm a bridge actually landed on the
   * destination chain, not just that Coston2 sent it. */
  link?: string;
  linkLabel?: string;
};

export type Escrow = {
  /** The escrow's on-chain address — also used as the route param. */
  id: string;
  title: string;
  description: string;
  client: string;
  dueDate: string;
  contract: string;
  amount: string;
  status: "Active" | "Completed" | "Cancelled";
  progress: number;
  clientWallet: string;
  freelancerWallet: string;
  depositAsset: string;
  budget: string;
  deadline: string;
  milestones: Milestone[];
  activity: ActivityEntry[];
  /** True when the client hasn't deposited FXRP yet (on-chain status Created). */
  needsDeposit: boolean;
  /** Raw totalAmount in FXRP's smallest unit — what `deposit()` pulls. */
  totalAmountRaw: bigint;
};
