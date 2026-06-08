# 订单签名（EIP-712）

[English](./signing.md)

BeamPay 的一笔支付是一个**由商户签名的订单**，由付款人提交上链。商户后端用 EIP-712 对 `Order`
结构体签名；路由合约在 `pay()` 内恢复签名者，并拒绝任何被篡改、已过期或由未授权密钥签名的订单。

## EIP-712 域（domain）

```
name              = "BeamPayRouter"
version           = "1"
chainId           = <目标链 id>             // 1、56 或 97
verifyingContract = 0xBEA93fceFb115b22a3D6c714Ee815B359e2AAbaa
```

`verifyingContract` 即路由合约地址——**每条链都相同**（见
[contracts/addresses.md](../contracts/addresses.md)）。域把签名绑定到单一链，因此为 BSC 签名的订单
无法在 Ethereum 上重放。如有疑问，可对照链上 `DOMAIN_SEPARATOR()` 视图校验你的域。

## `Order` 类型

字段顺序至关重要——必须与合约的 `ORDER_TYPEHASH` 完全一致：

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

| 字段 | 含义 |
|---|---|
| `merchant` | 订单所有者（事件索引、退款调用者）。**不是**收款地址。 |
| `receiver` | 收款地址，签名时即固定。必须非零。 |
| `signer` | 签名所用密钥——必须等于 `merchant`，或链上通过 `setSigner` 设置的 `merchantSigner[merchant]` 委托方。 |
| `token` | 已加入白名单的代币地址，或原生资产用 `0xEeee…EEeE`。 |
| `amount` | **原始整数代币单位（wei）**——税前。无小数；Ethereum 上 10 USDT（6 位精度）为 `"10000000"`。 |
| `orderId` | 商户维度唯一 id（`bytes32`）。重复使用会触发 `DuplicateOrder` 回滚。 |
| `createdAt` | 签名时的 Unix 秒。 |
| `expiresAt` | Unix 秒；必须 `> createdAt`。过期后签名失效（`OrderExpired`）。 |

## 签名示例（viem + `@beampay/schemas`）

`@beampay/schemas` 导出了合约期望的 typed-data 构造器，无需手写字段顺序：

```ts
import { buildOrderTypedData, CHAIN_IDS } from '@beampay/schemas'
import { keccak256, toBytes } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'

const ROUTER = '0xBEA93fceFb115b22a3D6c714Ee815B359e2AAbaa'
const account = privateKeyToAccount(process.env.MERCHANT_KEY as `0x${string}`)

const now = Math.floor(Date.now() / 1000)
const orderId = keccak256(toBytes('merchant-order-1001')) // 任意唯一 bytes32
const typedData = buildOrderTypedData({
  chainId: CHAIN_IDS.ethereum, // 1
  verifyingContract: ROUTER,
  merchant: account.address,
  receiver: account.address, // 资金落点
  signer: account.address, // 自签名（或通过 setSigner 设置的委托方）
  token: '0xdAC17F958D2ee523a2206206994597C13D831ec7', // USDT
  amount: 10_000_000n, // 10 USDT（6 位精度），原始单位
  orderId,
  createdAt: BigInt(now),
  expiresAt: BigInt(now + 15 * 60), // 15 分钟有效窗口
})

const signature = await account.signTypedData(typedData)
```

## 签名的去向

- **链上：** 付款人调用 `pay(merchant, receiver, token, amount, orderId, signer, createdAt,
  expiresAt, signature)`。路由合约恢复签名者并执行上述全部校验。见
  [合约参考](../contracts/reference.md#pay)。
- **链下（可选）：** 通过 [`POST /v1/orders`](../api/reference.md#post-v1orders) 把已签名的 envelope
  注册到 dashboard API，订单在被支付前即出现在商户后台。API 会在转发给索引器前重新校验签名。

## 委托签名

商户可授权一个热钱包代为签名，而无需暴露商户主密钥：

1. 商户在路由合约上调用 `setSigner(delegateAddress)`（一次性，自主权）。
2. 委托方以 `signer = delegateAddress`、`merchant = merchantAddress` 签名订单。
3. `pay()` 接受该订单，因为 `signer == merchantSigner[merchant]`。

调用 `setSigner(address(0))` 撤销。轮换委托方不会让尚未过期的已签名订单失效。
