# Order Signing (EIP-712)

[简体中文](./signing.zh-CN.md)

A BeamPay payment is a **merchant-signed order** that the payer submits on-chain. The merchant's
backend signs an `Order` struct with EIP-712; the router recovers the signer inside `pay()` and
rejects anything tampered, expired, or signed by an unauthorized key.

## The EIP-712 domain

```
name              = "BeamPayRouter"
version           = "1"
chainId           = <target chain id>        // 1, 56, or 97
verifyingContract = 0xBEA93fceFb115b22a3D6c714Ee815B359e2AAbaa
```

`verifyingContract` is the router address — the **same on every chain** (see
[contracts/addresses.md](../contracts/addresses.md)). The domain binds a signature to one chain, so
an order signed for BSC cannot be replayed on Ethereum. Verify your domain against the on-chain
`DOMAIN_SEPARATOR()` view if in doubt.

## The `Order` type

Field order is load-bearing — it must match the contract's `ORDER_TYPEHASH` exactly:

```
Order(
  address merchant,
  address receiver,
  address signer,
  address token,
  uint256 amount,
  bytes32 orderId,
  uint64  createdAt,
  uint64  expiresAt
)
```

| Field | Meaning |
|---|---|
| `merchant` | Order owner (event-indexed, refund caller). **Not** the payout destination. |
| `receiver` | Payout destination, fixed at signing time. Must be non-zero. |
| `signer` | Key that signed the order — must equal `merchant`, or `merchantSigner[merchant]` if a delegate is set on-chain via `setSigner`. |
| `token` | Whitelisted token address, or `0xEeee…EEeE` for the native asset. |
| `amount` | **Raw integer token units (wei)** — pre-fee. No decimals; a 10 USDT order on Ethereum (6 dp) is `"10000000"`. |
| `orderId` | Merchant-scoped unique id (`bytes32`). Reused = `DuplicateOrder` revert. |
| `createdAt` | Unix seconds when signed. |
| `expiresAt` | Unix seconds; must be `> createdAt`. After this the signature is dead (`OrderExpired`). |

## Signing example (viem + `@beampay/schemas`)

`@beampay/schemas` exports the exact typed-data builder the contract expects, so you never hand-roll
the field order:

```ts
import { buildOrderTypedData, CHAIN_IDS } from '@beampay/schemas'
import { keccak256, toBytes } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'

const ROUTER = '0xBEA93fceFb115b22a3D6c714Ee815B359e2AAbaa'
const account = privateKeyToAccount(process.env.MERCHANT_KEY as `0x${string}`)

const now = Math.floor(Date.now() / 1000)
const orderId = keccak256(toBytes('merchant-order-1001')) // any unique bytes32
const typedData = buildOrderTypedData({
  chainId: CHAIN_IDS.ethereum, // 1
  verifyingContract: ROUTER,
  merchant: account.address,
  receiver: account.address, // where funds land
  signer: account.address, // self-signed (or a delegate set via setSigner)
  token: '0xdAC17F958D2ee523a2206206994597C13D831ec7', // USDT
  amount: 10_000_000n, // 10 USDT (6 dp), raw units
  orderId,
  createdAt: BigInt(now),
  expiresAt: BigInt(now + 15 * 60), // 15-minute window
})

const signature = await account.signTypedData(typedData)
```

## Where the signature goes

- **On-chain:** the payer calls `pay(merchant, receiver, token, amount, orderId, signer, createdAt,
  expiresAt, signature)`. The router recovers the signer and enforces every check above. See the
  [contract reference](../contracts/reference.md#pay).
- **Off-chain (optional):** register the signed envelope with the dashboard API via
  [`POST /v1/orders`](../api/reference.md#post-v1orders) so the order shows up in the merchant
  dashboard before it is paid. The API re-verifies the signature before forwarding it to the indexer.

## Delegated signing

A merchant can authorize a hot key to sign on its behalf without exposing the merchant key:

1. Merchant calls `setSigner(delegateAddress)` on the router (one-time, self-sovereign).
2. The delegate signs orders with `signer = delegateAddress` and `merchant = merchantAddress`.
3. `pay()` accepts the order because `signer == merchantSigner[merchant]`.

Call `setSigner(address(0))` to revoke. Rotating the delegate never invalidates already-signed
orders that have not yet expired.
