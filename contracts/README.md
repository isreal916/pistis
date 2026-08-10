# Pistis Contracts

Foundry project for `Pistis.sol` and `PistisFactory.sol` — see [../ARCHITECTURE.md](../ARCHITECTURE.md) for the full design.

## Setup

```bash
forge install
cp .env.example .env   # fill in PRIVATE_KEY and OFT_ADAPTER_ADDRESS
```

Note: compilation uses `via_ir = true` (see `foundry.toml`) — required once the contract grew enough immutables/params to hit Solidity's legacy stack-depth limit. Slower to compile, functionally identical.

## Test

```bash
forge test -vv
```

40 tests across `Pistis.t.sol` (27), `PistisFactory.t.sol` (7), and `PistisSwap.t.sol` (6) cover the full state machine (deposit → per-milestone submit/approve, approve+bridge, or approve+swap, and cancel before any milestone is submitted) plus factory deployment/indexing and swap-on-release — all against mocked FXRP, FlareContractsRegistry, LayerZero OFT Adapter, and a Uniswap-V3-style swap router.

## Deploy (Coston2)

Deploy the factory once per network:

```bash
forge script script/Deploy.s.sol:Deploy --rpc-url coston2 --broadcast --private-key $PRIVATE_KEY
```

After that, every deal is created by calling `factory.createEscrow(freelancer, titles[], amounts[])` — no more deploy scripts needed. See `deployments/coston2.json` for the current live factory address.

Verify the current `OFT_ADAPTER_ADDRESS` for the target network at https://dev.flare.network/fxrp/oft before deploying the factory — it's baked into every escrow the factory creates and can't be changed after the fact.

`SWAP_ROUTER_ADDRESS`/`SWAP_TOKEN_ADDRESS` are optional and default to disabled (`address(0)`). **Leave them unset on Coston2** — SparkDEX's FXRP/USDT0 pool (`0x8a1E35F5...` / `0xe7cd86e1...`) only exists on **Flare Mainnet**; those addresses have no code on Coston2 (verified directly on-chain, not just from docs). Only set them when deploying to a network where the router is real.

## Design notes

- **Milestone-based, one escrow per deal.** `PistisFactory.createEscrow` deploys a fresh `Pistis` with an array of `(title, amount)` milestones. The client deposits the full total up front; each milestone is then submitted and approved (or approved-and-bridged) independently. The escrow completes once every milestone is released.
- **Enumerable via the factory, not an off-chain indexer.** `PistisFactory` tracks every escrow it deploys by both `client` and `freelancer` address (`escrowsByClient`, `escrowsByFreelancer`), so a dashboard can list "my escrows" with plain `eth_call`s — no subgraph or backend needed for the MVP.
- **`client` is explicit, not `msg.sender`.** Since the factory deploys on the client's behalf, `Pistis`'s constructor takes `_client` directly rather than deriving it from the deployer. Every fund-moving function still enforces `msg.sender == client` at call time, so this can't be used to move funds without the real client's consent — see the constructor's natspec for the full reasoning.
- **FXRP address is never hardcoded.** Resolved live via `FlareContractsRegistry.getContractAddressByName("AssetManagerFXRP")` → `AssetManager.fAsset()`, per Flare's own guidance that FAssets addresses differ per network and can change.
- **Cancel only before any milestone is submitted.** Once the freelancer submits milestone work, the deal can no longer be unilaterally cancelled by the client — matches the original single-milestone MVP's rule, generalized.
- **No admin, no platform key, no upgradability** — anywhere. Not in `Pistis`, not in `PistisFactory`. `client`/`freelancer` are `immutable` per escrow, set once at creation.
- **Swap-on-release (`approveMilestoneAndSwap`) is real, tested, and network-gated — not hardcoded to a network that doesn't have it.** It swaps a released milestone's FXRP into `swapToken` via a Uniswap-V3-style router (matches SparkDEX's interface on Flare Mainnet) and pays the freelancer directly in that token. `swapRouter`/`swapToken` are constructor params, not hardcoded — a network with no real FXRP DEX liquidity (Coston2, today) deploys with both as `address(0)`, which makes the function revert with `SwapNotConfigured()` rather than silently failing against a router with no pool. The frontend checks `swapRouter() != address(0)` before ever showing the swap option, so the UI never offers a capability that isn't actually live for the connected network.

## Frontend integration

`../frontend/src/lib/pistis.ts` holds the generated ABI + bytecode for both contracts, kept in sync via a small generator script run from this directory after any contract change (see git history for `gen-frontend-pistis.js` if it needs restoring — it's a one-off, not checked in).
