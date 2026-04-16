# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Abyss is a fully on-chain roguelite slot machine game built on Starknet using the Dojo Engine framework. Players spin a 5x3 grid, match symbol patterns for points, level up, and compete on a global leaderboard. The game has a CHIP token economy with Ekubo DEX integration for buyback-and-burn mechanics.

## Repository Structure

- **`dojo/`** — Cairo smart contracts (Dojo ECS: models, systems, components, helpers)
- **`client/`** — React (Vite) web client, the primary frontend
- **`web-app/`** — Next.js web app (secondary frontend)
- **`dojo_*.toml`** — Dojo deployment profiles (dev, sepolia, mainnet)
- **`manifest_*.json`** — Deployed contract manifests per network
- **`dojo/scripts/`** — Shell scripts for on-chain admin operations

## Build & Development Commands

### Cairo Contracts (from repo root)
```bash
scarb build                          # Compile contracts
scarb test                           # Run all Cairo tests (uses snforge)
scarb fmt                            # Format Cairo code
sozo build                           # Build with Dojo toolchain
sozo migrate apply --profile <name>  # Deploy/migrate world (dev, sepolia, mainnet)
```

### Client (from `client/`)
```bash
npm install                          # Install dependencies
npm run dev                          # Start Vite dev server
npm run build                        # TypeScript check + production build
npm run lint                         # ESLint
```

### Web App (from `web-app/`)
```bash
npm install
npm run dev                          # Next.js dev server on port 3000
npm run build
npm run lint
```

### On-chain Admin Scripts (from repo root)
Scripts in `dojo/scripts/` use `sncast` (not starkli). Common pattern:
```bash
PROFILE=mainnet bash dojo/scripts/register_session_bundle.sh
PROFILE=mainnet bash dojo/scripts/configure_purchase.sh
PROFILE=mainnet bash dojo/scripts/set_game_contracts.sh
```

## Architecture

### On-chain (Dojo ECS)

**Namespace:** `ABYSS`

**Key Systems** (`dojo/src/systems/`):
- **Setup** — World initialization, admin config setters, bundle registration, purchase component. Entry point for `dojo_init`. Owns the `BundleComponent` (from `cartridge-gg/arcade`) and `PurchaseComponent`.
- **Play** — Core gameplay: `create_session`, `request_spin`, `end_session`, `claim_chips`. Uses VRF for randomness.
- **Market** — In-game item shop: buy/sell/refresh market items between spins.
- **Relic** — Equip and activate relics that modify gameplay with snowball effects.
- **Token (Chip)** — ERC20 token with capped supply, mint/burn. Minter role required.
- **Treasury** — Revenue distribution contract.
- **Charm / RelicNFT / Collection** — NFT contracts for collectibles.

**Key Models** (`dojo/src/models/index.cairo`):
- `Config` — Singleton game configuration (addresses, probabilities, pricing, revenue split, Ekubo pool params)
- `Session` — Per-game state (player, level, score, spins, grid, inventory)
- `GameItem`, `MarketSlot` — Item system models

**Key Helpers** (`dojo/src/helpers/`):
- `grid` / `patterns` / `scoring` — Slot grid generation, pattern matching, score calculation
- `pricing` — USD-to-token price conversion via Pragma oracle
- `probability` — Weighted random symbol selection
- `items` / `market` / `inventory` — Item management logic

**Components** (`dojo/src/components/`):
- `PurchaseComponent` — Handles bundle purchase revenue split: burn portion swaps USDC→CHIP on Ekubo then burns, rest goes to treasury/team
- `SpinnableComponent` — VRF-based spin mechanics

**External Dependencies:**
- `cartridge-gg/arcade` (bundle, collection, leaderboard, achievement)
- `EkuboProtocol/starknet-contracts` (DEX router for token swaps)
- `openzeppelin` (access control, ERC20, ERC721)

### Client Architecture

**Stack:** React 19 + Vite + TypeScript + Tailwind + Jotai (state) + TanStack Query

**Key layers:**
- `config.ts` — Network config, contract address resolution from manifest. Supports sepolia/mainnet via `VITE_DEFAULT_CHAIN`.
- `lib/controllerConfig.ts` — Cartridge Controller setup with session policies. Preset name: `"abyss"`.
- `lib/constants.ts` — Token addresses, bundle IDs, symbol definitions.
- `hooks/actions.ts` — `useAbyssActions()` hook: `createSession`, `requestSpin`, `endSession`, `claimChips`, `claimFreeSessionBundle`. Wraps contract calls with `executeCalls`.
- `hooks/useAbyssGame.ts` — Main game state hook using Torii subscriptions.
- `api/rpc/` — Direct RPC calls to contracts (game config, pricing, token balances).
- `api/torii/` — Torii indexer queries for sessions, bundles, leaderboard.
- `api/price.ts` — CHIP/USDC exchange rate via Ekubo quoter API.
- `context/` — React contexts for Torii client, bundles, game state.
- `components/providers/StarknetProvider.tsx` — Wallet connection via Cartridge Controller.

**Session purchase flow:** User clicks buy → `openBundle()` on Cartridge Controller → Controller handles payment UI → on-chain `Setup.mint` → `PurchaseComponent.execute()` (revenue split + burn) → `Play.mint_session()`.

### Environment Variables (client)
```
VITE_DEFAULT_CHAIN=mainnet|sepolia
VITE_TORII_URL=<torii endpoint>
VITE_STARKNET_RPC_URL=<rpc endpoint>
VITE_SESSION_BUNDLE_ID=<bundle id>
VITE_CONTROLLER_RPC_URL=<controller rpc>
```

## Deployment

Dojo profiles are in `dojo_<profile>.toml`. Migration order matters — contracts are initialized sequentially per `order_inits`. Multicall is disabled on mainnet.

```bash
sozo build --profile mainnet
sozo migrate apply --profile mainnet
```

After migration, sync the manifest:
```bash
bash dojo/scripts/sync_manifest.sh mainnet
```

Then copy `manifest_mainnet.json` to `client/src/lib/manifest.json` for the client to pick up new contract addresses.

## Cairo Development Notes

- After writing Cairo code, run `scarb build` immediately to verify compilation.
- Revenue split validation: `burn_percentage + treasury_percentage + team_percentage` must equal exactly 100. Use `set_distribution()` to set all three atomically.
- The `PurchaseComponent` transfers tokens from the Setup contract's balance (received from bundle payments), not from the user directly. Bundle `payment_receiver` must be the Setup contract address.
- VRF randomness: spins use Cartridge VRF (`request_random` → callback pattern via `SpinnableComponent`).
