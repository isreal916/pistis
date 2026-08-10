# Pistis Architecture

**Trustless Escrow for Freelancers — powered by Flare FAssets + LayerZero OFT**

---

## 1. Overview

**Pistis** is a trustless escrow smart contract built on Flare Testnet (Coston2).

It allows a client to lock **FXRP** (Flare’s XRP-backed FAsset) and release it to a freelancer only after work is submitted and approved. Release can happen in two ways:

1. **Local release** — FXRP is sent directly to the freelancer on Flare
2. **Cross-chain release** — FXRP is bridged to another chain via **LayerZero OFT**

No centralized platform ever holds the funds.

---

## 2. What Has Been Implemented

| Component | Status | Description |
|-----------|--------|-------------|
| Core Escrow | ✅ Done | Client + Freelancer roles, deposit, submit, release, cancel |
| FAssets (FXRP) | ✅ Done | Real FXRP token integration on Coston2 |
| Local Release | ✅ Done | `approve()` sends FXRP to freelancer on Flare |
| Cross-Chain Release | ✅ Done | `approveAndBridge()` uses LayerZero OFT Adapter |
| Fee Quoting | ✅ Done | `quoteBridgeFee()` for LayerZero messaging fee |
| Events | ✅ Done | Full event coverage for indexing & demo |
| Access Control | ✅ Done | `onlyClient` / `onlyFreelancer` modifiers |
| State Machine | ✅ Done | Prevents invalid transitions |
| Frontend | ⏳ Pending | Thin demo UI not yet built |
| Smart Accounts | 📋 Planned | XRPL users triggering actions without MetaMask |
| Multi-milestone | 📋 Planned | Future extension |
| Dispute module | 📋 Planned | Future extension |

---

## 3. High-Level Architecture (Current)

```
┌─────────────────────────────────────────────────────────────┐
│                     Client / Freelancer                      │
│                    (MetaMask on Coston2)                     │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                    Pistis Smart Contract                     │
│                      (Flare Coston2)                         │
│                                                             │
│  • deposit(amount)          ← pulls FXRP from client        │
│  • submitWork(uri)          ← freelancer delivers proof     │
│  • approve()                ← local release on Flare        │
│  • approveAndBridge(...)    ← cross-chain via LayerZero     │
│  • cancel()                 ← refund before work submitted  │
│  • quoteBridgeFee(...)      ← view LayerZero fee            │
└─────────────┬───────────────────────────────┬───────────────┘
              │                               │
              ▼                               ▼
┌─────────────────────────┐     ┌─────────────────────────────┐
│   FXRP (FTestXRP)       │     │  LayerZero OFT Adapter      │
│   FAssets Token         │     │  0xCd3d2127...              │
│   0x0b6A3645...         │     │  Locks FXRP + sends message │
└─────────────────────────┘     └──────────────┬──────────────┘
                                               │
                                               ▼
                                    Destination Chain
                                    (e.g. Hyperliquid Testnet)
                                    FXRP minted to recipient
```

---

## 4. Smart Contract Design

**Contract:** `Pistis.sol`  
**Network:** Flare Testnet Coston2 (Chain ID 114)

### 4.1 Core Addresses (Coston2)

| Name | Address |
|------|---------|
| FXRP (FTestXRP) | `0x0b6A3645c240605887a5532109323A3E12273dc7` |
| LayerZero OFT Adapter | `0xCd3d2127935Ae82Af54Fc31cCD9D3440dbF46639` |
| Default Destination EID | `40362` (Hyperliquid Testnet) |

### 4.2 State Variables

- `client` / `freelancer` — parties
- `amount` — locked FXRP amount
- `workURI` — proof of work (link)
- `workSubmitted` / `released` / `cancelled` / `bridged`
- `bridgedToEid` / `bridgedTo` — cross-chain destination info

### 4.3 Core Functions

| Function | Caller | Purpose |
|----------|--------|---------|
| `deposit(uint256)` | Client | Pull FXRP into escrow (requires prior ERC-20 approve) |
| `submitWork(string)` | Freelancer | Submit delivery proof |
| `approve()` | Client | **Local release** — send FXRP to freelancer on Flare |
| `approveAndBridge(uint32, address, bytes)` | Client | **Cross-chain release** via LayerZero OFT |
| `cancel()` | Client | Refund FXRP (only before work is submitted) |
| `quoteBridgeFee(...)` | Anyone | View required native fee for bridging |

### 4.4 Events

- `EscrowCreated`
- `Deposited`
- `WorkSubmitted`
- `ReleasedLocally` — local path
- `ReleasedAndBridged` — cross-chain path
- `Cancelled`

### 4.5 State Machine

```
Created
   │
   ▼
Funded (after deposit)
   │
   ▼
Work Submitted
   │
   ├──► approve()            → Released (local)
   │
   └──► approveAndBridge()   → Released + Bridged (cross-chain)

Cancel is only possible before Work Submitted.
```

---

## 5. Flare Integration Details

### 5.1 FAssets (FXRP)

- Client locks real **FXRP** (XRP-backed asset on Flare)
- Standard ERC-20 `transferFrom` / `transfer` pattern
- Demonstrates genuine FAssets usage (not just “deployed on Flare”)

### 5.2 LayerZero OFT

- On `approveAndBridge()` the contract:
  1. Approves the official OFT Adapter to spend the locked FXRP
  2. Quotes the LayerZero messaging fee
  3. Calls `OFT Adapter.send()` with the fee
- Tokens are locked on Flare and minted on the destination chain
- Default test destination: Hyperliquid Testnet (`dstEid = 40362`)

### 5.3 Future: Flare Smart Accounts

Planned path (not yet implemented):

- XRPL users trigger Pistis actions via XRPL payments + Custom Instructions
- No need for MetaMask or C2FLR in the user’s wallet
- Strong alignment with Flare’s account abstraction vision

---

## 6. User Flows

### Local Release Flow (Demo Path)

```
Client                    Pistis                     Freelancer
  │                         │                            │
  │── deploy(freelancer) ──►│                            │
  │── approve FXRP ────────►│                            │
  │── deposit(amount) ─────►│                            │
  │                         │◄── submitWork(uri) ────────│
  │── approve() ───────────►│                            │
  │                         │── FXRP transfer ──────────►│
```

### Cross-Chain Release Flow (Core Differentiator)

```
Client                    Pistis                 OFT Adapter          Destination
  │                         │                         │                    │
  │── deposit + submit ────►│                         │                    │
  │── approveAndBridge ────►│                         │                    │
  │                         │── approve + send ──────►│                    │
  │                         │                         │── LayerZero msg ──►│
  │                         │                         │                    │── mint FXRP
```

---

## 7. Security Model (Current)

- Only client can deposit, approve, bridge, or cancel
- Only freelancer can submit work
- Funds cannot be withdrawn freely by either party
- State flags prevent double-release and invalid transitions
- Cancel only allowed before work is submitted
- LayerZero fee must be supplied by client (`msg.value`)

**Note:** This is an MVP. Production would require audit, re-entrancy guards review, and possibly a factory pattern.

---

## 8. Evolution History

| Version | Name | Focus |
|---------|------|-------|
| v0 | LedgerlockEscrow | Original multi-milestone vision |
| v1 | PactlockMinimal | Absolute minimal native-token escrow |
| v2 | PactlockFXRP | Switched to real FXRP (FAssets) |
| v3 | PactlockOFT | Added LayerZero OFT path |
| **v4** | **Pistis** | **Current — cleaned UX, dual release paths, fee quoting** |

---

## 9. Hackathon Positioning

**What judges should see immediately:**

> Clients lock real XRP-backed assets (FXRP) in a trustless escrow.  
> When work is approved, funds can be released on Flare **or** bridged cross-chain using LayerZero OFT — with no centralized custodian.

**Core demo flow (≤ 2 minutes):**
1. Create escrow
2. Deposit FXRP
3. Submit work
4. Show both buttons: **Approve** (local) and **Approve & Bridge** (cross-chain)
5. Execute one path and show the event on Coston2 Explorer

---

## 10. Next Steps

| Priority | Item | Status |
|----------|------|--------|
| 1 | Fully test local + bridge paths on Coston2 | In progress |
| 2 | Thin frontend (Connect → Create → Deposit → Submit → Approve/Bridge) | Pending |
| 3 | Demo video + README + submission materials | Pending |
| 4 | Optional: Flare Smart Accounts custom instruction | Future |
| 5 | Optional: Multi-milestone + dispute module | Future |

---

*Document updated to reflect the implemented Pistis contract (FXRP + LayerZero OFT dual-release architecture).*
