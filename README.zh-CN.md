<div align="center">

<img src="./assets/logo.svg" width="96" height="96" alt="BeamPay" />

# BeamPay

**无需许可、非托管的链上支付路由 —— 面向稳定币与原生资产。**

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
[![Contracts](https://img.shields.io/badge/contracts-Foundry%20%7C%20solc%200.8.28-orange.svg)](https://github.com/BeamPayFun/beampay-contracts)
[![Chains](https://img.shields.io/badge/chains-Ethereum%20%7C%20BSC-success.svg)](#支持的网络与代币)
[![Verified](https://img.shields.io/badge/bytecode-Etherscan%20verified-brightgreen.svg)](#已部署合约)

[English](./README.md) | 简体中文

[官网](https://beampay.fun)

</div>

---

## BeamPay 是什么?

BeamPay 是一个**可自部署的加密支付网关,核心是单一的链上路由合约**。商户后端对订单签名,付款方将订单提交给路由合约,路由在一笔交易内原子化完成 **付款方 → 商户** 和 **付款方 → 手续费接收方** 的结算,并发出 `Paid` 事件。链下索引器监听该事件,回调商户的 webhook。

全程没有任何中间方托管资金,无需充值,无托管风险。路由合约**永远不持有余额** —— 每笔支付在进入合约的同一笔交易内即离开。

- **非托管。** 资金从付款方直达商户,合约余额始终为 0。
- **无需许可。** 任意商户都可收款,无需注册或审批。
- **硬手续费上限。** 协议费由不可变 `constant` 锁定上限 `0.1%`(10 bps),主网当前为 **0 bps**。
- **全链同址。** 通过 CREATE3 部署,在以太坊、BSC、测试网上为**同一地址**。

## 支持的网络与代币

路由合约在每条链上都是**同一地址**。代币需先加入白名单(只增不减)才可支付。

| 网络 | Chain ID | 路由合约 | 原生资产 | 稳定币 |
|---|---|---|---|---|
| Ethereum 主网 | 1 | `0xBEA93fceFb115b22a3D6c714Ee815B359e2AAbaa` | ETH | USDT、USDC |
| BSC 主网 | 56 | `0xBEA93fceFb115b22a3D6c714Ee815B359e2AAbaa` | BNB | USDT、USDC |
| BSC 测试网 | 97 | `0xBEA93fceFb115b22a3D6c714Ee815B359e2AAbaa` | tBNB | tUSDT、tUSDC |

原生资产(ETH / BNB)用哨兵地址 `0xEeee…EEeE` 表示,与 ERC20 一样需加入白名单。

## 核心特性

- **双轨结算** —— 单一 `pay()` 入口同时处理 ERC20(`SafeERC20`)与原生资产(`.call{value:}`)两条轨道,手续费语义完全一致。
- **签名订单** —— 商户后端对 `(merchant, receiver, token, amount, orderId, signer, createdAt, expiresAt)` 签名;路由校验签名,拒绝过期或重放订单。
- **抗黑名单手续费路径** —— 若手续费 leg 转给协议失败(如被 USDT/USDC 拉黑),手续费改派给商户。不变量:`商户到账 + 协议到账 == 金额`,恒成立。
- **退款** —— 商户可退款至已付金额上限(可累计);手续费不退;付款方从链上订单记录读取,而非调用者。
- **无暂停、无管理员后门。** 代币白名单只增不减;无紧急停机,无特权提款。
- **7 天时间锁治理。** 改费走 `proposeFeeChange` → 等 7 天 → `executeFeeChange`。治理权转移为两步制且可放弃。
- **Webhook 投递** —— 索引器将 `Paid` / `Refunded` 事件转为带签名的 HTTP 回调,通知商户系统。
- **即插即用结账组件** —— 框架无关的可嵌入 widget,配套类型化商户 SDK。

## 工作原理

```
  商户后端                      付款方钱包                 BeamPayRouter(链上)            索引器
  ────────                      ─────────                 ───────────────────            ──────
  1. 创建订单
  2. 订单签名 ───────────────▶ 3. 提交 pay(...)  ───────▶ 4. 校验签名
                                                          5. 转账 付款方 → 商户
                                                          6. 转账 付款方 → 手续费接收方
                                                             (被拦截则改派给商户)
                                                          7. 发出 Paid 事件 ─────────────▶ 8. webhook → 商户
```

合约在任何环节都不持有资金。结算与手续费转账在 `pay()` 内原子完成;任一步 revert,整笔支付回滚。`Paid` 事件是唯一可信源 —— 索引器与商户据此对账。

## 已部署合约

所有链共用地址 `0xBEA93fceFb115b22a3D6c714Ee815B359e2AAbaa`(CREATE3 靓号部署,`v1.4-create3-vanity`,字节码已验证)。部署者 / 初始治理地址:`0x6bc3C40F13eF073E10dF0647Af5672d79b79f5C0`。

完整部署记录、构造参数、历史地址见 [`beampay-contracts/deployments/`](https://github.com/BeamPayFun/beampay-contracts/tree/main/deployments)。

## 仓库结构

BeamPay 由若干自包含仓库组成,本地开发时并排 clone。每个仓库有独立 `package.json`、lockfile 与 CI。

| 仓库 | 作用 | 技术栈 | 部署 |
|---|---|---|---|
| [beampay-contracts](https://github.com/BeamPayFun/beampay-contracts) | `BeamPayRouter` 合约 + 测试 | Foundry、solc 0.8.28、viaIR、Slither | Etherscan 验证 |
| [beampay-libs](https://github.com/BeamPayFun/beampay-libs) | `@beampay/*` 包 —— ABI、schemas、SDK、common | pnpm + Turborepo | npm |
| [beampay-checkout](https://github.com/BeamPayFun/beampay-checkout) | 可嵌入结账组件 | Vite 6 + Lit 3 + `@wagmi/core` | npm + CDN IIFE |

### npm 包

| 包 | 用途 |
|---|---|
| `@beampay/contracts-abi` | `BeamPayRouter` 的类型化 viem ABI + 部署地址 |
| `@beampay/sdk` | 商户 SDK —— 类型化路由调用、webhook 校验、签名工具 |
| `@beampay/schemas` | API 与 UI 共享的 Zod 边界 schema |
| `@beampay/common` | 共享错误码、响应结构、签名工具、链元数据 |
| `@beampay/checkout` | 框架无关的可嵌入结账组件 |

## 文档

完整接入文档在 [`docs/`](./docs/) —— 从源码生成，可在 GitHub 上直接阅读。

- **合约** —— [参考](./docs/contracts/reference.md) · [部署地址](./docs/contracts/addresses.md) · [安全不变量](./docs/contracts/invariants.md)
- **API** —— [HTTP API 参考](./docs/api/reference.md) · [`openapi.json`](./docs/api/openapi.json)
- **接入指南** —— [订单签名（EIP-712）](./docs/integration/signing.zh-CN.md) · [原生资产支付](./docs/integration/native-asset.zh-CN.md) · [Webhook（预览）](./docs/integration/webhooks.zh-CN.md)
- **SDK 与组件** —— [`@beampay/sdk`](https://github.com/BeamPayFun/beampay-libs) · [`@beampay/checkout`](https://github.com/BeamPayFun/beampay-checkout)

## 安全与设计不变量

路由围绕一组承重不变量构建,未经审计不得更改:

1. **资金永不留存合约** —— 合约余额始终为 0。
2. **硬手续费上限** —— `FEE_RATE_HARD_LIMIT = 10` bps 为 `constant`,任何治理操作都无法超过。
3. **无暂停、无紧急、无管理员后门** —— 代币白名单只增不减。
4. **所有参数变更经 7 天时间锁。**
5. **抗黑名单手续费路径** —— `商户到账 + 协议到账 == 金额`。
6. **CEI + `nonReentrant`** —— 任何外部调用前先写订单状态。
7. **双轨安全** —— ERC20 与原生路径采用相同的 try/改派/主 leg 语义。
8. **两步治理权转移 + `renounceGovernance`。**
9. **无 `receive` / `fallback`** —— 裸原生转账会 revert。

## 许可证

MIT,见 [LICENSE](./LICENSE)。

> BeamPay 按现状提供。运营方需自行遵守所在司法辖区的相关法律法规。
