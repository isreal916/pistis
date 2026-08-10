// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IFlareContractsRegistry, IAssetManager} from "./interfaces/IFlareContractsRegistry.sol";
import {IOFT, SendParam, MessagingFee, MessagingReceipt, OFTReceipt} from "./interfaces/IOFT.sol";
import {ISwapRouter} from "./interfaces/ISwapRouter.sol";

/// @title Pistis — trustless, milestone-based escrow for freelancers, backed by Flare FAssets (FXRP)
/// @notice One escrow per deployment: a client locks FXRP for a single freelancer,
/// split across one or more milestones, and releases each milestone independently
/// either locally on Flare or cross-chain via a LayerZero OFT. No party but the
/// client and freelancer ever controls the funds; there is no platform custodian
/// and no admin override. Normally deployed via `PistisFactory` so escrows are
/// enumerable per client/freelancer, but the constructor works standalone too.
contract Pistis is ReentrancyGuard {
    using SafeERC20 for IERC20;

    enum Status {
        Created, // deployed, no funds locked yet
        Funded, // client has deposited the full milestone total
        Active, // at least one milestone submitted, escrow in progress
        Completed, // every milestone approved — terminal
        Cancelled // refunded to client before any milestone was submitted — terminal
    }

    enum MilestoneStatus {
        Pending,
        Submitted,
        Approved
    }

    struct Milestone {
        string title;
        uint256 amount;
        string workURI;
        MilestoneStatus status;
    }

    /// @dev Flare's FlareContractsRegistry — identical address on every Flare network.
    address private constant FLARE_CONTRACTS_REGISTRY = 0xaD67FE66660Fb8dFE9d6b1b4240d8650e30F6019;

    address public immutable client;
    address public immutable freelancer;

    /// @notice FXRP token address, resolved once at deploy time via the Flare
    /// registry (FlareContractsRegistry -> AssetManagerFXRP -> fAsset()) rather
    /// than hardcoded, per Flare's guidance that FAssets addresses differ per
    /// network. Safe to cache for the lifetime of a single escrow deal.
    IERC20 public immutable fxrp;

    /// @notice LayerZero OFT Adapter that locks FXRP on Flare and mints it on
    /// the destination chain. Not resolvable via the Flare registry (it's a
    /// LayerZero deployment, not a Flare protocol contract) so it's supplied
    /// at construction — verify the current address against
    /// https://dev.flare.network/fxrp/oft before deploying.
    IOFT public immutable oftAdapter;

    /// @notice Uniswap-V3-style router for swapping a released milestone into
    /// `swapToken` instead of paying it out as FXRP. `address(0)` disables
    /// swap-on-release entirely — set this way on networks with no real DEX
    /// liquidity for FXRP (e.g. Coston2), since a configured-but-unusable
    /// router would just make `approveMilestoneAndSwap` revert on every call.
    ISwapRouter public immutable swapRouter;

    /// @notice Token `approveMilestoneAndSwap` swaps FXRP into. Meaningless
    /// (and unused) when `swapRouter` is `address(0)`.
    address public immutable swapToken;

    /// @dev Fee tier for the FXRP/swapToken pool — matches SparkDEX's
    /// FXRP/USDT0 pool on Flare Mainnet (0.05%). Only relevant when swapping
    /// is enabled; not configurable per-escrow to keep this simple, since
    /// there is currently exactly one supported swap pair.
    uint24 private constant SWAP_FEE_TIER = 500;

    /// @notice Sum of every milestone amount — the total the client deposits.
    uint256 public immutable totalAmount;

    /// @notice Unix timestamp the client expects this deal to be done by, or
    /// `0` if none was set. Purely informational — nothing in this contract
    /// currently enforces it (no auto-cancel, no penalty). Set once at
    /// creation and immutable, same as everything else about the deal terms.
    uint256 public immutable deadline;

    Milestone[] private _milestones;
    uint256 public releasedAmount;
    Status public status;

    event EscrowCreated(
        address indexed client,
        address indexed freelancer,
        address fxrp,
        address oftAdapter,
        uint256 totalAmount,
        uint256 milestoneCount,
        uint256 deadline
    );
    event Deposited(uint256 amount);
    event MilestoneSubmitted(uint256 indexed index, string workURI);
    event MilestoneReleasedLocally(uint256 indexed index, address indexed to, uint256 amount);
    event MilestoneReleasedAndBridged(
        uint256 indexed index, uint32 indexed dstEid, address indexed to, uint256 amount, bytes32 guid
    );
    event MilestoneReleasedAndSwapped(uint256 indexed index, address indexed to, uint256 amountIn, uint256 amountOut);
    event Cancelled(uint256 refunded);

    error OnlyClient();
    error OnlyFreelancer();
    error InvalidFreelancer();
    error InvalidMilestones();
    error WrongStatus(Status expected, Status actual);
    error NotFundedOrActive(Status actual);
    error WrongMilestoneStatus(uint256 index, MilestoneStatus expected, MilestoneStatus actual);
    error MilestoneIndexOutOfRange(uint256 index);
    error CancelWindowClosed();
    error SwapNotConfigured();

    modifier onlyClient() {
        if (msg.sender != client) revert OnlyClient();
        _;
    }

    modifier onlyFreelancer() {
        if (msg.sender != freelancer) revert OnlyFreelancer();
        _;
    }

    modifier atStatus(Status _status) {
        if (status != _status) revert WrongStatus(_status, status);
        _;
    }

    /// @param _client The party who deposits and releases funds. Explicit rather than
    /// `msg.sender` so `PistisFactory` can deploy on a client's behalf and still set
    /// them as the true owner. Every fund-moving function still checks `msg.sender ==
    /// client` at call time, so passing an arbitrary `_client` here (e.g. deploying
    /// directly, bypassing the factory) only ever produces an escrow nobody but that
    /// address can operate — it cannot be used to move anyone's funds without their consent.
    /// @param _freelancer The counterparty who submits work and receives released funds.
    /// @param _oftAdapter LayerZero OFT Adapter for FXRP on this network (see dev.flare.network/fxrp/oft).
    /// @param _swapRouter Uniswap-V3-style router for swap-on-release, or `address(0)` to disable it
    /// on networks with no real FXRP DEX liquidity.
    /// @param _swapToken Token to swap released FXRP into; unused when `_swapRouter` is `address(0)`.
    /// @param _titles Human-readable milestone labels, parallel to `_amounts`.
    /// @param _amounts FXRP amount per milestone, parallel to `_titles`. Must be non-empty and every entry non-zero.
    /// @param _deadline Unix timestamp the deal is expected to complete by, or `0` for none. Informational only.
    constructor(
        address _client,
        address _freelancer,
        address _oftAdapter,
        address _swapRouter,
        address _swapToken,
        string[] memory _titles,
        uint256[] memory _amounts,
        uint256 _deadline
    ) {
        if (_client == address(0) || _freelancer == address(0) || _client == _freelancer) {
            revert InvalidFreelancer();
        }
        if (_titles.length == 0 || _titles.length != _amounts.length) revert InvalidMilestones();

        client = _client;
        freelancer = _freelancer;
        oftAdapter = IOFT(_oftAdapter);
        swapRouter = ISwapRouter(_swapRouter);
        swapToken = _swapToken;
        deadline = _deadline;

        address assetManager =
            IFlareContractsRegistry(FLARE_CONTRACTS_REGISTRY).getContractAddressByName("AssetManagerFXRP");
        fxrp = IERC20(IAssetManager(assetManager).fAsset());

        uint256 sum;
        for (uint256 i = 0; i < _amounts.length; i++) {
            if (_amounts[i] == 0) revert InvalidMilestones();
            sum += _amounts[i];
            _milestones.push(
                Milestone({title: _titles[i], amount: _amounts[i], workURI: "", status: MilestoneStatus.Pending})
            );
        }
        totalAmount = sum;

        emit EscrowCreated(client, freelancer, address(fxrp), _oftAdapter, sum, _amounts.length, _deadline);
    }

    function milestoneCount() external view returns (uint256) {
        return _milestones.length;
    }

    function getMilestone(uint256 _index) external view returns (Milestone memory) {
        if (_index >= _milestones.length) revert MilestoneIndexOutOfRange(_index);
        return _milestones[_index];
    }

    /// @notice Pulls the full milestone total from the client into escrow. Requires a prior ERC-20 `approve`.
    function deposit() external onlyClient atStatus(Status.Created) {
        status = Status.Funded;

        fxrp.safeTransferFrom(msg.sender, address(this), totalAmount);

        emit Deposited(totalAmount);
    }

    /// @notice Freelancer submits proof of work for one milestone (e.g. a link to the deliverable).
    function submitMilestone(uint256 _index, string calldata _workURI) external onlyFreelancer {
        if (status != Status.Funded && status != Status.Active) revert NotFundedOrActive(status);
        if (_index >= _milestones.length) revert MilestoneIndexOutOfRange(_index);

        Milestone storage m = _milestones[_index];
        if (m.status != MilestoneStatus.Pending) {
            revert WrongMilestoneStatus(_index, MilestoneStatus.Pending, m.status);
        }

        m.status = MilestoneStatus.Submitted;
        m.workURI = _workURI;
        if (status == Status.Funded) status = Status.Active;

        emit MilestoneSubmitted(_index, _workURI);
    }

    /// @notice Local release — sends one milestone's FXRP directly to the freelancer on Flare.
    function approveMilestone(uint256 _index) external onlyClient nonReentrant {
        uint256 amount = _releaseMilestone(_index);

        fxrp.safeTransfer(freelancer, amount);

        emit MilestoneReleasedLocally(_index, freelancer, amount);
    }

    /// @notice Cross-chain release — bridges one milestone's FXRP to the freelancer on
    /// another chain via the LayerZero OFT Adapter. Caller must send the native
    /// LayerZero messaging fee as `msg.value` (see `quoteBridgeFee`).
    /// @param _index Milestone to release.
    /// @param _dstEid LayerZero endpoint ID of the destination chain.
    /// @param _to Recipient address on the destination chain.
    /// @param _extraOptions LayerZero executor options (e.g. built with `OptionsBuilder` off-chain).
    function approveMilestoneAndBridge(uint256 _index, uint32 _dstEid, address _to, bytes calldata _extraOptions)
        external
        payable
        onlyClient
        nonReentrant
    {
        uint256 amount = _releaseMilestone(_index);

        SendParam memory sendParam = _buildSendParam(_dstEid, _to, amount, _extraOptions);
        MessagingFee memory fee = oftAdapter.quoteSend(sendParam, false);

        fxrp.forceApprove(address(oftAdapter), amount);
        (MessagingReceipt memory receipt,) = oftAdapter.send{value: fee.nativeFee}(sendParam, fee, client);

        emit MilestoneReleasedAndBridged(_index, _dstEid, _to, amount, receipt.guid);

        // Refund any native token sent beyond the actual LayerZero fee.
        if (msg.value > fee.nativeFee) {
            (bool ok,) = client.call{value: msg.value - fee.nativeFee}("");
            require(ok, "refund failed");
        }
    }

    /// @notice Swap-on-release — releases one milestone by swapping its FXRP into
    /// `swapToken` (via the configured Uniswap-V3-style router) and sending the
    /// result to the freelancer, instead of paying out FXRP directly. Reverts if
    /// this escrow was deployed without a `swapRouter` (`address(0)`).
    /// @param _index Milestone to release.
    /// @param _minAmountOut Minimum acceptable output amount — slippage protection.
    function approveMilestoneAndSwap(uint256 _index, uint256 _minAmountOut) external onlyClient nonReentrant {
        if (address(swapRouter) == address(0)) revert SwapNotConfigured();

        uint256 amountIn = _releaseMilestone(_index);

        fxrp.forceApprove(address(swapRouter), amountIn);
        uint256 amountOut = swapRouter.exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: address(fxrp),
                tokenOut: swapToken,
                fee: SWAP_FEE_TIER,
                recipient: freelancer,
                deadline: block.timestamp + 20 minutes,
                amountIn: amountIn,
                amountOutMinimum: _minAmountOut,
                sqrtPriceLimitX96: 0
            })
        );

        emit MilestoneReleasedAndSwapped(_index, freelancer, amountIn, amountOut);
    }

    /// @notice Refunds the client. Only possible before any milestone has been submitted.
    function cancel() external onlyClient nonReentrant {
        if (status != Status.Created && status != Status.Funded) revert CancelWindowClosed();

        uint256 refund = status == Status.Funded ? totalAmount : 0;
        status = Status.Cancelled;

        if (refund > 0) {
            fxrp.safeTransfer(client, refund);
        }

        emit Cancelled(refund);
    }

    /// @notice View helper — quotes the native LayerZero fee required for `approveMilestoneAndBridge`.
    function quoteBridgeFee(uint256 _index, uint32 _dstEid, address _to, bytes calldata _extraOptions)
        external
        view
        returns (uint256 nativeFee, uint256 lzTokenFee)
    {
        if (_index >= _milestones.length) revert MilestoneIndexOutOfRange(_index);
        SendParam memory sendParam = _buildSendParam(_dstEid, _to, _milestones[_index].amount, _extraOptions);
        MessagingFee memory fee = oftAdapter.quoteSend(sendParam, false);
        return (fee.nativeFee, fee.lzTokenFee);
    }

    /// @dev Validates and marks one milestone Approved, updates the running total, and
    /// flips the escrow to Completed once every milestone has been released. Returns
    /// the milestone's amount for the caller to actually move.
    function _releaseMilestone(uint256 _index) private returns (uint256 amount) {
        if (_index >= _milestones.length) revert MilestoneIndexOutOfRange(_index);

        Milestone storage m = _milestones[_index];
        if (m.status != MilestoneStatus.Submitted) {
            revert WrongMilestoneStatus(_index, MilestoneStatus.Submitted, m.status);
        }

        m.status = MilestoneStatus.Approved;
        amount = m.amount;
        releasedAmount += amount;
        if (releasedAmount == totalAmount) status = Status.Completed;
    }

    function _buildSendParam(uint32 _dstEid, address _to, uint256 _amount, bytes calldata _extraOptions)
        private
        pure
        returns (SendParam memory)
    {
        return SendParam({
            dstEid: _dstEid,
            to: bytes32(uint256(uint160(_to))),
            amountLD: _amount,
            minAmountLD: _amount,
            extraOptions: _extraOptions,
            composeMsg: "",
            oftCmd: ""
        });
    }
}
