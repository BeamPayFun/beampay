<div align="center">

<img src="./assets/logo.svg" width="96" height="96" alt="BeamPay" />

# BeamPay

**Permissionless, non-custodial on-chain payment router for stablecoins and native assets.**

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
[![Contracts](https://img.shields.io/badge/contracts-Foundry%20%7C%20solc%200.8.28-orange.svg)](https://github.com/BeamPayFun/beampay-contracts)
[![Chains](https://img.shields.io/badge/chains-Ethereum%20%7C%20BSC-success.svg)](#supported-networks--tokens)
[![Verified](https://img.shields.io/badge/bytecode-Etherscan%20verified-brightgreen.svg)](#deployed-contracts)

English | [简体中文](./README.zh-CN.md)

[Website](https://beampay.fun)

</div>

---

## What is BeamPay?

BeamPay is a **self-hostable crypto payment gateway built around a single on-chain router contract**. A merchant's backend signs an order; the payer submits it to the router; the router atomically settles **payer → merchant** and **payer → fee recipient** in one transaction and emits a `Paid` event. An off-chain indexer watches that event and fires a webhook back to the merchant.

There is no intermediary holding funds, no platform deposit, and no custody risk. The router contract **never holds a balance** — every payment leaves the contract in the same transaction it entered.

- **Non-custodial.** Funds move payer → merchant directly. Contract balance is always 0.
- **Permissionless.** Any merchant can accept payments; no onboarding or approval.
- **Hard fee ceiling.** Protocol fee is capped at `0.1%` (10 bps) by an immutable `constant`. Mainnet currently runs at **0 bps**.
- **One address, every chain.** Deployed via CREATE3 to the **same address** on Ethereum, BSC, and testnet.

## Supported Networks & Tokens

The router is deployed at the **same address** on every chain. Tokens must be whitelisted (add-only) to be payable.

| Network | Chain ID | Router | Native | Stablecoins |
|---|---|---|---|---|
| Ethereum Mainnet | 1 | `0xBEA93fceFb115b22a3D6c714Ee815B359e2AAbaa` | ETH | USDT, USDC |
| BSC Mainnet | 56 | `0xBEA93fceFb115b22a3D6c714Ee815B359e2AAbaa` | BNB | USDT, USDC |
| BSC Testnet | 97 | `0xBEA93fceFb115b22a3D6c714Ee815B359e2AAbaa` | tBNB | tUSDT, tUSDC |

Native assets (ETH / BNB) are represented by the sentinel `0xEeee…EEeE` and must be whitelisted like any ERC20.

## Core Features

- **Dual-rail settlement** — one `pay()` entrypoint handles both ERC20 (`SafeERC20`) and native (`.call{value:}`) rails with identical fee semantics.
- **Signed orders** — merchant backend signs `(merchant, receiver, token, amount, orderId, signer, createdAt, expiresAt)`; the router verifies the signature and rejects expired or replayed orders.
- **Blacklist-resistant fee path** — if the fee leg to the protocol reverts (e.g. a USDT/USDC blacklist), the fee is redirected to the merchant. Invariant: `merchant_received + protocol_received == amount`, always.
- **Refunds** — merchants can refund up to the paid amount (cumulative); the fee is never refunded; payer is read from the on-chain order record, not the caller.
- **No pause, no admin backdoor.** Token whitelist is add-only; there is no emergency stop and no privileged withdrawal.
- **7-day timelocked governance.** Fee changes flow through `proposeFeeChange` → wait 7 days → `executeFeeChange`. Governance transfer is two-step and renounceable.
- **Webhook delivery** — an indexer turns `Paid` / `Refunded` events into signed HTTP callbacks to merchant systems.
- **Drop-in checkout widget** — a framework-agnostic embeddable widget plus a typed merchant SDK.

## How It Works

```
  Merchant backend                Payer wallet              BeamPayRouter (on-chain)         Indexer
  ────────────────                ────────────              ────────────────────────         ───────
  1. create order
  2. sign order  ───────────────▶ 3. submit pay(...)  ────▶ 4. verify signature
                                                            5. transfer payer → merchant
                                                            6. transfer payer → feeRecipient
                                                               (redirect to merchant if blocked)
                                                            7. emit Paid event  ─────────────▶ 8. webhook → merchant
```

The contract holds no funds at any step. Settlement and fee transfer happen atomically inside `pay()`; if anything reverts, the whole payment reverts. The `Paid` event is the canonical source of truth — the indexer and merchant reconcile against it.

## Deployed Contracts

All chains share the address `0xBEA93fceFb115b22a3D6c714Ee815B359e2AAbaa` (CREATE3 vanity deploy, `v1.4-create3-vanity`, bytecode verified). Deployer / initial governance: `0x6bc3C40F13eF073E10dF0647Af5672d79b79f5C0`.

See [`beampay-contracts/deployments/`](https://github.com/BeamPayFun/beampay-contracts/tree/main/deployments) for full deployment records, constructor args, and historical addresses.

## Repositories

BeamPay is a set of self-contained repos, cloned side-by-side for local development. Each has its own `package.json`, lockfile, and CI.

| Repo | What it is | Stack | Deploy |
|---|---|---|---|
| [beampay-contracts](https://github.com/BeamPayFun/beampay-contracts) | The `BeamPayRouter` contract + tests | Foundry, solc 0.8.28, viaIR, Slither | Etherscan-verified |
| [beampay-libs](https://github.com/BeamPayFun/beampay-libs) | `@beampay/*` packages — ABI, schemas, SDK, common | pnpm + Turborepo | npm |
| [beampay-checkout](https://github.com/BeamPayFun/beampay-checkout) | Embeddable checkout widget | Vite 6 + Lit 3 + `@wagmi/core` | npm + CDN IIFE |

### npm packages

| Package | Purpose |
|---|---|
| `@beampay/contracts-abi` | Typed viem ABI + deployment addresses for `BeamPayRouter` |
| `@beampay/sdk` | Merchant SDK — typed router calls, webhook verification, signature helpers |
| `@beampay/schemas` | Zod boundary schemas shared by API and UI |
| `@beampay/common` | Shared error codes, response shape, signature helpers, chain metadata |
| `@beampay/checkout` | Framework-agnostic embeddable checkout widget |

## Documentation

- **Contract design & invariants:** [beampay-contracts/CLAUDE.md](https://github.com/BeamPayFun/beampay-contracts/blob/main/CLAUDE.md)
- **Merchant integration:** see [`@beampay/sdk`](https://github.com/BeamPayFun/beampay-libs) and [`@beampay/checkout`](https://github.com/BeamPayFun/beampay-checkout)

## Security & Design Invariants

The router is built around load-bearing invariants that may not change without an audit:

1. **Funds never held in the contract** — contract balance is always 0.
2. **Hard fee ceiling** — `FEE_RATE_HARD_LIMIT = 10` bps is `constant`; no governance op can exceed it.
3. **No pause, no emergency, no admin backdoor** — token whitelist is add-only.
4. **All parameter changes go through a 7-day timelock.**
5. **Blacklist-resistant fee path** — `merchant_received + protocol_received == amount`.
6. **CEI + `nonReentrant`** — order state is written before any external call.
7. **Dual-rail safety** — same try/redirect/main-leg semantics on the ERC20 and native paths.
8. **Two-step governance transfer + `renounceGovernance`.**
9. **No `receive` / `fallback`** — bare native transfers revert.

## License

MIT. See [LICENSE](./LICENSE).

> BeamPay is provided as-is. Operators are responsible for compliance with applicable laws and regulations in their jurisdiction.
