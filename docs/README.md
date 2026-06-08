# BeamPay Documentation

Integration docs for [BeamPay](../README.md) — a permissionless, non-custodial on-chain payment
router. Written for **external integrators** (merchants, wallets, SDK consumers).

## Contracts

- [Contract reference](./contracts/reference.md) — full `BeamPayRouter` surface (functions, events,
  errors, constants), generated from the on-chain NatSpec.
- [Deployed addresses](./contracts/addresses.md) — router + token addresses per chain.
- [Security & design invariants](./contracts/invariants.md) — the load-bearing guarantees you can
  rely on.

## API

- [API reference](./api/reference.md) — the public HTTP API (auth, orders, dashboard, webhook
  relay), generated from the live Zod schemas.
- [`openapi.json`](./api/openapi.json) — the machine-consumable OpenAPI 3.1 spec.

## Integration guides

- [Order signing (EIP-712)](./integration/signing.md) · [中文](./integration/signing.zh-CN.md)
- [Native asset payments](./integration/native-asset.md) · [中文](./integration/native-asset.zh-CN.md)
- [Webhooks (preview)](./integration/webhooks.md) · [中文](./integration/webhooks.zh-CN.md)

---

> The contract and API references are **generated from source** — see [`scripts/`](../scripts/).
> Run `npm run docs:sync` (with the sibling `beampay-contracts` / `beampay-api` checkouts present)
> to regenerate; do not edit the generated files by hand.
