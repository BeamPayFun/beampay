# Webhook（预览）

[English](./webhooks.md)

> **⚠️ 预览——尚未 GA。** 向商户 URL 的出站 webhook 投递**尚未实现**：`POST /v1/webhook/orders`
> 目前只是一个内部 索引器→API 的中继桩（未接入任何商户分发，该端点不属于公开契约）。下文的商户侧签名方案是
> **规划中的 GA 设计**；可据此预先开发，但最终的密钥发放流程会在 GA 前落地。**不要**把内部 `proxyAuth`
> HMAC（
> `timestamp`/`recvWindow`/`salt`/`signature` 字段）当作商户契约——那是服务间细节且共用单一密钥。

## 模型

BeamPay 的索引器监听链上 `Paid` / `Refunded` 事件（唯一真相来源），并在 GA 时向每个商户配置的 URL
POST 一个签名的 JSON 回调。每个商户拥有**自己的**签名密钥（`whsec_…`），因此任何商户都无法伪造他人的
webhook。

## 规划中的签名方案（Standard Webhooks）

每次投递携带一个对 `timestamp.rawBody` 的签名头：

```
Beam-Signature: t=<unixMillis>,v1=<hex-hmac-sha256>
```

校验（按商户）：

```ts
import { createHmac, timingSafeEqual } from 'node:crypto'

function verify(rawBody: string, header: string, secret: string): boolean {
  const parts = Object.fromEntries(header.split(',').map((kv) => kv.split('=')))
  const t = Number(parts.t)
  if (!t || Math.abs(Date.now() - t) > 5 * 60_000) return false // 5 分钟防重放窗口
  const expected = createHmac('sha256', secret).update(`${t}.${rawBody}`).digest('hex')
  const a = Buffer.from(expected)
  const b = Buffer.from(parts.v1 ?? '')
  return a.length === b.length && timingSafeEqual(a, b)
}
```

密钥轮换支持重叠期：轮换期间对一组当前有效的密钥逐一校验，任一匹配即接受。

## 事件载荷

中继会按固定结构校验每个事件（见
[`OrderWebhookBody`](../api/reference.md#schema-orderwebhookbody) schema）：

| 字段 | 含义 |
|---|---|
| `chain` | `bsc` / `ethereum` / `bsc-testnet` |
| `orderKey` | 全局唯一键——`keccak256(chainId, merchant, orderId)`。用于幂等。 |
| `orderId` | 商户侧合约订单 id。 |
| `eventType` | `Payment` 或 `Refund`。 |
| `txHash` | 链上交易。 |
| `payload` | 索引器事件载荷（对 API 层不透明）。 |

## 幂等

投递可能重复（重试、reorg 重放）。按 `(orderKey, eventType, txHash)` 去重，并把处理器写成幂等。若对某次
回调存疑，对照链上 `Paid` / `Refunded` 事件核对——链是权威来源。
