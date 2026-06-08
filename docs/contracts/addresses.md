# Deployed Addresses

`BeamPayRouter` is deployed to the **same address on every chain** via CREATE3
(`v1.4-create3-vanity`, bytecode verified on each explorer):

```
0xBEA93fceFb115b22a3D6c714Ee815B359e2AAbaa
```

- **Deployer / initial governance:** `0x6bc3C40F13eF073E10dF0647Af5672d79b79f5C0`
- **Native sentinel:** `0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE` — represents the chain's native
  asset (ETH / BNB / tBNB). It must be whitelisted like any ERC20 to be payable.
- **Fee rate:** mainnet runs at **0 bps**; testnet at **10 bps** (the hard ceiling). The ceiling
  `FEE_RATE_HARD_LIMIT = 10` bps (0.1%) is an immutable `constant`.

> Source of truth: [`beampay-contracts/deployments/`](https://github.com/BeamPayFun/beampay-contracts/tree/main/deployments).
> The whitelist is **add-only** — tokens may be added through governance but never removed.

## Ethereum Mainnet — chain ID `1`

Router: [`0xBEA9…AAbaa`](https://etherscan.io/address/0xBEA93fceFb115b22a3D6c714Ee815B359e2AAbaa)

| Token | Address | Decimals |
|---|---|---|
| ETH (native) | `0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE` | 18 |
| USDT | [`0xdAC1…1ec7`](https://etherscan.io/token/0xdAC17F958D2ee523a2206206994597C13D831ec7) | 6 |
| USDC | [`0xA0b8…eB48`](https://etherscan.io/token/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48) | 6 |

## BSC Mainnet — chain ID `56`

Router: [`0xBEA9…AAbaa`](https://bscscan.com/address/0xBEA93fceFb115b22a3D6c714Ee815B359e2AAbaa)

| Token | Address | Decimals |
|---|---|---|
| BNB (native) | `0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE` | 18 |
| USDT | [`0x55d3…7955`](https://bscscan.com/token/0x55d398326f99059fF775485246999027B3197955) | 18 |
| USDC | [`0x8AC7…580d`](https://bscscan.com/token/0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d) | 18 |

## BSC Testnet — chain ID `97`

Router: [`0xBEA9…AAbaa`](https://testnet.bscscan.com/address/0xBEA93fceFb115b22a3D6c714Ee815B359e2AAbaa)

| Token | Address | Decimals |
|---|---|---|
| tBNB (native) | `0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE` | 18 |
| tUSDT | [`0x0c6D…951c`](https://testnet.bscscan.com/token/0x0c6DfFCbb941d2fDec9c8107e8128dcb6651951c) | 6 |
| tUSDC | [`0x44a2…653fC`](https://testnet.bscscan.com/token/0x44a25C4cbe72a249866B6750F8594ba170a653fC) | 6 |
