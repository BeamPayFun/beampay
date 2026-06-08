# 原生资产支付（ETH / BNB）

[English](./native-asset.md)

BeamPay 通过与 ERC20 **相同的 `pay()` 入口**结算链上原生资产（Ethereum 上的 ETH、BSC 上的 BNB、
测试网的 tBNB）。没有单独的原生支付函数。

## 原生哨兵地址

原生资产用一个哨兵地址表示（1inch/Curve 惯例）：

```
NATIVE_TOKEN = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE
```

在签名订单（见 [signing.md](./signing.md)）和调用 `pay()` 时把它作为 `token` 字段传入。它必须像任何
ERC20 一样通过 `addToken()` 加入白名单——在所有已部署的链上都已加入（见
[contracts/addresses.md](../contracts/addresses.md)）。

## `msg.value` 规则

路由合约严格校验链上转入的 value 与订单金额一致：

| 路径 | `token` | 要求的 `msg.value` |
|---|---|---|
| 原生 | `0xEeee…EEeE` | **`== amount`**（否则 `IncorrectNativeValue`） |
| ERC20 | 其他任何白名单代币 | **`== 0`**（否则 `UnexpectedNativeValue`） |

所以原生支付要把恰好等于订单 `amount` 的金额作为 `msg.value` 附上；ERC20 支付不附 value，依赖事先的
`approve`。

## 为原生订单调用 `pay()`（viem）

```ts
import { createWalletClient, custom } from 'viem'

const NATIVE = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'
const ROUTER = '0xBEA93fceFb115b22a3D6c714Ee815B359e2AAbaa'

await walletClient.writeContract({
  address: ROUTER,
  abi: beamPayRouterAbi, // 来自 @beampay/contracts-abi
  functionName: 'pay',
  args: [merchant, receiver, NATIVE, amount, orderId, signer, createdAt, expiresAt, signature],
  value: amount, // 原生路径下必须等于订单金额
})
```

## 结算与手续费行为

原生结算使用 `.call{value:}`，与 ERC20 路径具有相同的 try / 重定向 / 主腿语义：

- payer → receiver 和 payer → feeRecipient 在 `pay()` 内原子发生；
- 若发往协议收款方的手续费腿失败，手续费会重定向到 `receiver`（`FeeRedirectedToMerchant`），从而保持
  `receiver_received + protocol_received == amount`；
- 合约从不留存余额——没有 `receive`/`fallback`，裸转账会回滚。

原生订单的退款同样是 `payable`：商户对 `refund(orderId, amount)` 附上 `msg.value == amount`，资金退回
原始付款人。

底层保证见 [invariants.md](../contracts/invariants.md)（第 7、10、11 条）。
