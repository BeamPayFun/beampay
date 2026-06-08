# Native Asset Payments (ETH / BNB)

[简体中文](./native-asset.zh-CN.md)

BeamPay settles the chain's native asset (ETH on Ethereum, BNB on BSC, tBNB on testnet) through the
**same `pay()` entrypoint** as ERC20s. There is no separate native function.

## The native sentinel

The native asset is represented by a sentinel address (1inch/Curve convention):

```
NATIVE_TOKEN = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE
```

Pass this as the `token` field when signing the order (see [signing.md](./signing.md)) and when
calling `pay()`. It must be whitelisted via `addToken()` like any ERC20 — it already is on all
deployed chains (see [contracts/addresses.md](../contracts/addresses.md)).

## `msg.value` rules

The router enforces a strict match between the on-chain value and the order amount:

| Path | `token` | Required `msg.value` |
|---|---|---|
| Native | `0xEeee…EEeE` | **`== amount`** (else `IncorrectNativeValue`) |
| ERC20 | any other whitelisted token | **`== 0`** (else `UnexpectedNativeValue`) |

So a native payment attaches exactly the order `amount` as `msg.value`; an ERC20 payment attaches no
value and relies on a prior `approve`.

## Calling `pay()` for a native order (viem)

```ts
import { createWalletClient, custom } from 'viem'

const NATIVE = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'
const ROUTER = '0xBEA93fceFb115b22a3D6c714Ee815B359e2AAbaa'

await walletClient.writeContract({
  address: ROUTER,
  abi: beamPayRouterAbi, // from @beampay/contracts-abi
  functionName: 'pay',
  args: [merchant, receiver, NATIVE, amount, orderId, signer, createdAt, expiresAt, signature],
  value: amount, // MUST equal the order amount on the native path
})
```

## Settlement & fee behaviour

Native settlement uses `.call{value:}` with the same try / redirect / main-leg semantics as the
ERC20 rail:

- payer → receiver and payer → feeRecipient happen atomically inside `pay()`;
- if the fee leg to the protocol recipient fails, the fee is redirected to `receiver`
  (`FeeRedirectedToMerchant`), preserving `receiver_received + protocol_received == amount`;
- the contract never retains a balance — there is no `receive`/`fallback`, so bare transfers revert.

Refunds of native orders are also `payable`: the merchant attaches `msg.value == amount` to
`refund(orderId, amount)`, and the funds flow back to the original payer.

See [invariants.md](../contracts/invariants.md) (items 7, 10, 11) for the underlying guarantees.
