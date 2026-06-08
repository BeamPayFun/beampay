# Webhooks (Preview)

[简体中文](./webhooks.zh-CN.md)

> **⚠️ Preview — not yet GA.** Outbound webhook delivery to merchant URLs is **not yet
> implemented**: `POST /v1/webhook/orders` is only an internal indexer→API relay stub (no merchant
> dispatch is wired, and the endpoint is not part of the public contract). The merchant-facing
> signing scheme below is the **planned GA design**; build against it provisionally and expect the
> final secret-provisioning flow to land before GA. Do **not** rely on the internal `proxyAuth` HMAC
> (the
> `timestamp`/`recvWindow`/`salt`/`signature` fields) as a merchant contract — that is a
> service-to-service detail and shares a single secret.

## Model

BeamPay's indexer watches the on-chain `Paid` / `Refunded` events (the canonical source of truth)
and, at GA, will POST a signed JSON callback to each merchant's configured URL. Each merchant gets
its **own** signing secret (`whsec_…`) so one merchant can never forge another's webhooks.

## Planned signature scheme (Standard Webhooks)

Each delivery carries a signature header over `timestamp.rawBody`:

```
Beam-Signature: t=<unixMillis>,v1=<hex-hmac-sha256>
```

Verification (per merchant):

```ts
import { createHmac, timingSafeEqual } from 'node:crypto'

function verify(rawBody: string, header: string, secret: string): boolean {
  const parts = Object.fromEntries(header.split(',').map((kv) => kv.split('=')))
  const t = Number(parts.t)
  if (!t || Math.abs(Date.now() - t) > 5 * 60_000) return false // 5-min replay window
  const expected = createHmac('sha256', secret).update(`${t}.${rawBody}`).digest('hex')
  const a = Buffer.from(expected)
  const b = Buffer.from(parts.v1 ?? '')
  return a.length === b.length && timingSafeEqual(a, b)
}
```

Secret rotation is overlap-friendly: during a rotation, verify against the array of currently-valid
secrets and accept if any matches.

## Event payload

The relay validates each event against a fixed shape (see the
[`OrderWebhookBody`](../api/reference.md#schema-orderwebhookbody) schema):

| Field | Meaning |
|---|---|
| `chain` | `bsc` / `ethereum` / `bsc-testnet` |
| `orderKey` | Global unique key — `keccak256(chainId, merchant, orderId)`. Use it for idempotency. |
| `orderId` | Merchant-side contract order id. |
| `eventType` | `Payment` or `Refund`. |
| `txHash` | The on-chain transaction. |
| `payload` | Indexer event payload (opaque to the API layer). |

## Idempotency

Deliveries may repeat (retries, reorg replays). Deduplicate on `(orderKey, eventType, txHash)` and
treat handlers as idempotent. Reconcile against the on-chain `Paid` / `Refunded` event if a callback
is ever in doubt — the chain is authoritative.
