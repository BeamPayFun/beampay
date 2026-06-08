# Security & Design Invariants

These are **load-bearing product properties**, not style preferences. They do not change
without an audit. Audit-fix sites are tagged `H-0x` / `M-0x` / `L-0x` in `BeamPayRouter.sol`.

As an integrator you can rely on every one of these holding for the life of the contract.

1. **Funds are never held in the contract.** `pay()` transfers payer → receiver and
   payer → feeRecipient directly, in the same transaction. The contract balance is always 0; there
   is no withdrawal path because there is nothing to withdraw.

2. **Hard fee ceiling.** `FEE_RATE_HARD_LIMIT = 10` bps (0.1%) is an immutable `constant`. No
   governance action can raise the fee above it. Fee is linear: `fee = amount * rate / 10000`.

3. **No pause, no emergency, no admin backdoor.** There is no `pause`, `emergency*`, `removeToken`,
   or privileged withdrawal. The token whitelist is **add-only**. Once you integrate, BeamPay cannot
   cut you off.

4. **Fee-rate changes flow through a 7-day timelock.** The fee rate is the only timelocked
   parameter: `proposeFeeChange` → wait `TIMELOCK_DELAY` (7 days) → `executeFeeChange`
   (permissionless once matured, so governance cannot indefinitely stall an approved change). Other
   governance actions (`addToken`, `addFeeRecipient`/`removeFeeRecipient`, `transferGovernance`) are
   immediate `onlyGov` calls — but each is constrained by the other invariants here (add-only
   whitelist, fee ceiling, two-step transfer).

5. **Blacklist-resistant fee path (H-06).** If the fee leg to the protocol recipient reverts (e.g. a
   USDT/USDC blacklist), the fee is redirected to the order's `receiver`. The invariant
   `receiver_received + protocol_received == amount` always holds. The event is named
   `FeeRedirectedToMerchant` for indexer backward-compatibility, but in v1.4+ the redirected fee
   lands at `receiver` (the payout destination), not at `merchant`.

6. **CEI + `nonReentrant`.** Order state (`orders[key]`) is written before any external call, and
   `pay()`/`refund()` are guarded against reentrancy (ERC777/ERC20 callbacks and native receivers).

7. **Dual-rail safety.** The ERC20 path uses `SafeERC20` (tolerates non-standard tokens like
   mainnet USDT); the native path uses `.call{value:}` with the same try / redirect / main-leg
   semantics. Both rails preserve the H-06 invariant.

8. **Refund constraints.** `refund(orderId, amount)` reads the token and payer from the stored
   `OrderRecord` — the caller cannot specify a different token (the merchant is the implicit caller,
   keyed into the order) and refunds always flow to the **original payer** (H-03), never to the
   order's `receiver`. Cumulative refunds are capped at the order amount; the protocol fee is never
   refunded.

9. **Two-step governance handoff.** `transferGovernance` → `acceptGovernance` (M-03 prevents losing
   governance to a typo), plus `renounceGovernance` to permanently freeze all parameters.

10. **No `receive` / `fallback`.** Bare native transfers revert. Native value enters only via
    `pay()` / `refund()` and leaves in the same call.

11. **Native asset support.** The sentinel `NATIVE_TOKEN = 0xEeee…EEeE` represents the chain's
    native asset and must be whitelisted via `addToken()`. `pay`/`refund` are `payable`:
    `msg.value == amount` on the native path, `msg.value == 0` on the ERC20 path.

See [reference.md](./reference.md) for the full function/event/error surface and
[addresses.md](./addresses.md) for deployed addresses.
