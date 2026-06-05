# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Abyss** is a fully on-chain roguelite slot-machine game built on **Starknet** using the **Dojo Engine** (Cairo ECS). Players spin a 5×3 grid, match symbol patterns for points, level up, and compete on a global leaderboard. There is a **CHIP** ERC20 token economy with **Ekubo** DEX integration for buyback-and-burn, plus NFT collectibles (Charms, Relics) with an in-game and secondary market.

The single most important and non-obvious thing about this codebase: **the React client drives real-time gameplay state by parsing contract events out of the transaction receipt synchronously after each action — NOT by waiting on the Torii indexer.** See [Client ↔ Contract Interaction via Receipt Events](#client--contract-interaction-via-receipt-events). Do not "simplify" that pipeline without understanding the field-order and address-index contracts it depends on.

## Repository Structure

```
dojo/                 # Cairo smart contracts (Dojo ECS)
  src/
    systems/          # Contract entrypoints (play, market, relic, charm, ...)
    models/           # ECS models (Config, Session, GameItem, MarketSlot, ...)
    events/           # #[dojo::event] definitions — SOURCE OF TRUTH for client parsing
    components/       # Reusable contract components (purchase, spinnable)
    helpers/          # Pure game logic (grid, patterns, scoring, pricing, ...)
    elements/ types/ interfaces/ constants.cairo store.cairo lib.cairo
  scripts/            # sncast-based on-chain admin scripts
  tests/              # snforge tests
client/               # React + Vite web client — the PRIMARY frontend
web-app/              # Next.js web app — SECONDARY frontend (keep changes minimal)
dojo_<profile>.toml   # Dojo deploy profiles: dev, sepolia, mainnet
manifest_<profile>.json   # Deployed contract manifests per network
torii_*.toml          # Torii indexer configs
```

## Build & Development Commands

### Cairo Contracts (from repo root)
```bash
scarb build                          # Compile contracts (run immediately after editing Cairo)
scarb test                           # Run all Cairo tests (snforge)
scarb fmt                            # Format Cairo code
sozo build                           # Build with Dojo toolchain
sozo migrate apply --profile <name>  # Deploy/migrate world (dev | sepolia | mainnet)
```

### Client (from `client/`)
```bash
npm install
npm run dev                          # Vite dev server
npm run build                        # tsc typecheck + production build
npm run lint                         # ESLint
```

### Web App (from `web-app/`)
```bash
npm install && npm run dev           # Next.js dev server (port 3000)
npm run build && npm run lint
```

### On-chain Admin Scripts (from repo root)
Scripts in `dojo/scripts/` use `sncast` (not starkli):
```bash
PROFILE=mainnet bash dojo/scripts/register_session_bundle.sh
PROFILE=mainnet bash dojo/scripts/configure_purchase.sh
PROFILE=mainnet bash dojo/scripts/set_game_contracts.sh
bash dojo/scripts/sync_manifest.sh mainnet     # sync manifest after migration
```

## On-chain Architecture (Dojo ECS)

**Namespace:** `ABYSS`

### Systems (`dojo/src/systems/`)
- **setup** — World init (`dojo_init`), admin config setters, bundle registration. Owns `BundleComponent` (from `cartridge-gg/arcade`) and `PurchaseComponent`. Bundle `payment_receiver` must be the Setup contract address.
- **play** — Core gameplay: `create_session`, `request_spin`, `end_session`, `claim_chips`, `equip_charms`, `set_pending_charm_loadout`. Uses Cartridge VRF. Emits most gameplay events.
- **market** — In-game item shop between spins: `buy_item`, `sell_item`, `refresh_market`.
- **relic** — `equip_relic`, `activate_relic`. Snowball / gameplay-modifying effects.
- **charm** — Charm NFT logic incl. `reroll_charms`.
- **charm_market** — Secondary market for charms: `list_charm`, `buy_charm`, `cancel_listing`.
- **golden_chip** — Golden Chip NFT `mint`.
- **streak_system** — Daily streak: `claim_streak_loot`, `recover_streak`.
- **token** — CHIP ERC20 (capped supply, mint/burn, minter role).
- **treasury** / **rewards_vault** — Revenue distribution / reward custody.
- **season** — Monthly competitive seasons + leaderboard prize pool. Holds the USDC prize cut (25% of entries), tracks each season's top-3 in the `Season` model, rolls over lazily on `record_score` (called by Play), and pays the top-3 (50/30/20) via `claim_prize`. Play delegates here and emits the arcade `LeaderboardScore` event itself (no on-chain heap — keeps Play under the bytecode limit). The displayed leaderboard comes from Torii, scoped per season by `leaderboard_id`.
- **collection_system** / **relic_nft_contract** — NFT collectibles.

### Models (`dojo/src/models/index.cairo`)
- `Config` — Singleton game config (addresses, probabilities, pricing, revenue split, Ekubo pool params, `quoteToken`, `vrf`).
- `Session` — Per-game state (player, level, score, totalScore, spins, grid, luck, tickets, inventory, equipped relic).
- `GameItem`, `MarketSlot` — Item system models.

### Helpers (`dojo/src/helpers/`)
`grid` / `patterns` / `scoring` (grid gen, pattern matching, scoring) · `pricing` (USD→token via Pragma oracle) · `probability` (weighted symbol selection) · `items` / `market` / `inventory` · `charm_types` / `relic_types` · `play_payout` / `play_rewards` / `play_charm_odds` · `streak`.

### Components (`dojo/src/components/`)
- `purchase.cairo` (`PurchaseComponent`) — Bundle purchase revenue split (4-way: **burn / treasury / team / prize**, default 50/0/25/25): burn portion swaps USDC→CHIP on Ekubo then burns; treasury/team get their cut; the prize cut (USDC) is transferred to the **Season** contract (`Config.prize_receiver`) to fund the leaderboard pool. For CHIP-paid bundles the prize cut is folded into the burn (the pool is USDC-only). Transfers from the **Setup contract's** balance, not the user directly.
- `spinnable.cairo` (`SpinnableComponent`) — VRF-based spin mechanics (`request_random` → callback).

### External Dependencies
`cartridge-gg/arcade` (bundle, collection, leaderboard, achievement) · `EkuboProtocol/starknet-contracts` (DEX router) · `openzeppelin` (access control, ERC20, ERC721).

---

## Client ↔ Contract Interaction via Receipt Events

**This is the core integration pattern of the client. Read this before touching `actions.ts`, `gameEvents.ts`, `useAbyssGame.ts`, or `dojo/src/events/index.cairo`.**

### The flow
Every user action follows the same path in `client/src/hooks/actions.ts` (`useAbyssActions`):

```
account.execute(calls)                              // submit multicall
  → waitForReceipt(transaction_hash)                // wait for inclusion + receipt
  → parseReceiptEvents(receipt, receiptEventContracts)
  → ActionReceipt { transactionHash, receipt, events }   // returned to caller
```

The returned `events` (typed `ParsedEvents`) is what the UI consumes — e.g. `receipt.events.spinCompleted`, `receipt.events.charmRerolled` (`client/src/components/Charms.tsx:231`). **The client does not wait on Torii to reflect a spin/buy/sell result; it reads the freshly-emitted events directly.**

`useAbyssGame.ts` (`client/src/hooks/useAbyssGame.ts:215`) holds a second, more defensive copy of this pattern with a retry loop (account-provider then hook-provider, 2 attempts, 150 ms apart) for when pre-confirmation returns a receipt with no events yet.

### `waitForReceipt` (actions.ts:89)
Waits via `account.waitForTransaction` (or `provider.waitForTransaction`) with:
- `successStates: ["PRE_CONFIRMED", "ACCEPTED_ON_L2", "ACCEPTED_ON_L1"]`
- `retryInterval: 200`

If the waited result carries no `events`, it falls back to `provider.getTransactionReceipt(hash)`. Events can live under `receipt.events`, `receipt.value.events`, or `receipt.transaction_receipt.events` — `normalizeReceiptEvents` handles all three shapes.

### `receiptEventContracts` — an ORDER-SENSITIVE address array (actions.ts:76)
The parser disambiguates Dojo-wrapped events **by emitter address position**, so this array's index order is a hard contract:

| Index | Contract   |
|-------|------------|
| 0     | world      |
| 1     | play       |
| 2     | market     |
| 3     | relic      |
| 4     | charm      |
| 5     | charmMarket (optional) |
| 6     | streak (optional)      |
| 7     | season (optional)      |

Keep indices 0–4 stable. In `gameEvents.ts`, `parseNormalizedEvents` reads `sourceList[1..5]` as `playAddress`, `marketAddress`, `relicAddress`, `charmAddress`, `charmMarketAddress`. **Reordering this array silently breaks event parsing.** The season address is appended last only so the address filter keeps `PrizeClaimed`; that event is matched by **selector** (not index), so its position is not load-bearing.

### The parser: `parseReceiptEvents` (`client/src/utils/gameEvents.ts`)
It tries two strategies per raw event:

**1. Raw Starknet events** — the event's selector (`hash.getSelectorFromName(<EventName>)`, see `EVENT_SELECTORS`) appears in `event.keys`. The payload in `event.data` is decoded **positionally** by per-event functions (`parseSpinCompletedEvent`, `parseItemPurchasedEvent`, …). `session_id` is read from the key immediately after the selector (`readSessionIdFromKeys`).

**2. Dojo-wrapped events** — `#[dojo::event]`s routed through the world fall into the `else` branch:
- `unwrapDojoEventData(event.data)` decodes the envelope `[keyCount, ...keyValues, fieldCount, ...fieldValues]` into `{ keyValues, fieldValues }`.
- The emitting contract is read from `event.keys[2]` (`normalizeAddress`).
- Events are disambiguated by **(emitter address + `fieldValues.length`)**, e.g.:
  - play + 30 → `SpinCompleted`
  - market + 7 → `ItemPurchased`; market + 5 → `ItemSold`; market|relic + 8 → `MarketRefreshed`
  - relic + 4 → `RelicActivated` (effectType ≤ 16) or `RelicEquipped`; relic + 2 → `PhantomActivated`
  - play + 4 → `CharmMinted`; charm + 11 → `CharmRerolled`
  - charmMarket + 6/7/3 → `CharmListed` / `CharmSold` / `CharmDelisted`
  - play + (debt/cashout/biblia selectors in `keyValues`) → debt & state events

### Address filtering + whole-receipt fallback
`parseReceiptEvents` first filters events by `sourceAddresses` (matching `event.fromAddress`). If that yields nothing parseable (`hasParsedEvents(...)` is false — e.g. the provider obscured `from_address`, or the source address changed), it **re-parses across the entire receipt ignoring address filtering**. Preserve this fallback.

`summarizeReceiptEvents(receipt)` dumps the first N events' keys/data as hex for debugging — use it when an expected event isn't being picked up.

### Cairo event → TS parser map
Source of truth for emitted events: `dojo/src/events/index.cairo`. Client interfaces and decoders: `client/src/utils/gameEvents.ts`.

| Cairo `#[dojo::event]` | TS field on `ParsedEvents` | Decoder |
|---|---|---|
| `SpinCompleted` (15 cells + scores + luck + chip_bonus + snowball_{h,v,d}_add) | `spinCompleted` | `parseSpinCompletedEvent` |
| `ItemPurchased` | `itemsPurchased[]` | `parseItemPurchasedEvent` |
| `ItemSold` | `itemsSold[]` | `parseItemSoldEvent` |
| `MarketRefreshed` | `marketRefreshed` | `parseMarketRefreshedEvent` |
| `RelicActivated` | `relicActivated` | `parseRelicActivatedEvent` |
| `PhantomActivated` | `phantomActivated` | `parsePhantomActivatedEvent` |
| `RelicEquipped` | `relicEquipped` | `parseRelicEquippedEvent` |
| `CharmMinted` | `charmMinted` | `parseCharmMintedEvent` |
| `CharmRerolled` | `charmRerolled` | `parseCharmRerolledEvent` |
| `CharmListed` / `CharmSold` / `CharmDelisted` | `charmListed` / `charmSold` / `charmDelisted` | `parseCharm{Listed,Sold,Delisted}Event` |
| `CharmDebtCollected` / `CharmDebtPaid` / `CharmDebtDefaulted` | `charmDebt{Collected,Paid,Defaulted}[]` | `parseCharmDebt*Event` |
| `BibliaDiscarded` | `bibliaDiscarded` | `parseBibliaDiscardedEvent` |
| `CashOutResolved` | `cashOutResolved` | `parseCashOutResolvedEvent` |
| `PrizeClaimed` (emitted by **Season** contract) | `prizeClaimed` | `parsePrizeClaimedEvent` (matched by selector) |
| `SessionCreated` / `SessionEnded` | *(not parsed from receipt; tracked via Torii)* | — |

Notes:
- The `SpinCompleted` symbol-score order is fixed: `score_seven, score_diamond, score_cherry, score_coin, score_lemon` → `symbolScores[0..4]`. Snowball accumulators are in hundredths.
- `ParsedEvents.models.*` fields exist in the type but are currently left null by the parser — don't assume they're populated.

### ⚠️ Checklist — adding or changing an event
When you add a field to or reorder a `#[dojo::event]` in `dojo/src/events/index.cairo`, you MUST update the client in lockstep or parsing breaks silently:
1. **Cairo:** edit the struct. Field order = serialization order. `#[key]` fields go into event keys, not data.
2. **`gameEvents.ts` interface:** add/adjust the TS interface field(s).
3. **`gameEvents.ts` decoder:** update the positional indices in the matching `parse*Event` function.
4. **`gameEvents.ts` disambiguation:** if the serialized `fieldValues.length` changed, update the `emitterAddress + length` branch in `parseNormalizedEvents` (and the length checks like `< N` guards).
5. **New event:** add a selector to `EVENT_SELECTORS`, a branch in `parseNormalizedEvents`, a field on `ParsedEvents` + its reset in `parseReceiptEvents`, and include it in `hasParsedEvents`.
6. Rebuild contracts (`scarb build`) and re-sync the client manifest (see Deployment).

## Torii vs RPC vs Receipt Events (division of responsibility)

The client reads chain state through three distinct channels — use the right one:

- **Receipt events** (`utils/gameEvents.ts`, via `hooks/actions.ts` + `hooks/useAbyssGame.ts`) — **real-time result of the action just taken** (spin outcome, item bought/sold, market refresh, charm reroll/mint, debt resolution). Lowest latency; drives the immediate UI update.
- **Torii indexer** (`client/src/api/torii/*`: `session`, `item`, `charmMarket`, `leaderboard`, `config`, `bundle`, `subscribe`, `client`, `helpers`) — **historical / list / subscription** reads: session history, leaderboard, market listings snapshots, bundles, live subscriptions.
- **Direct RPC** (`client/src/api/rpc/*`: `play`, `token`, `relic`, `streak`, `goldenChip`, `provider`) — **view calls**: game config, USD pricing, token balances, mint prices. `api/price.ts` uses Ekubo's quoter for CHIP/USDC rate.

## Client Architecture

**Stack:** React 19 + Vite + TypeScript + Tailwind + Jotai (state) + TanStack Query.

### Key layers
- `config.ts` — Network config + contract-address resolution from `lib/manifest.json` (sepolia/mainnet via `VITE_DEFAULT_CHAIN`). Address getters: `getWorldAddress`, `getPlayAddress`, `getMarketAddress`, `getRelicAddress`, `getCharmAddress`, `getChipAddress`, `getGoldenChipAddress`, `tryGetStreakAddress`, `tryGetCharmMarketAddress`, `getSetupAddress`.
- `lib/controllerConfig.ts` / `lib/controllerContext.ts` — Cartridge Controller setup + session policies. Preset name: `"abyss"`.
- `lib/constants.ts` (`CONTRACTS`) — token addresses (USDC, CHIP), VRF address, bundle IDs, symbol definitions.
- `lib/manifest.json` — copied from `manifest_<network>.json` after each migration.
- `lib/charmCatalog.ts` / `lib/charmRules.ts` / `lib/itemCatalog.ts` — static metadata for charms/items.
- `lib/patternMath.ts` / `lib/practiceEngine.ts` — client-side scoring + offline "practice" simulation.
- `lib/posthog.ts` — analytics (`captureAbyss`, `posthog`); every action emits a PostHog event.

### Hooks (`client/src/hooks/`)
- `actions.ts` (`useAbyssActions`) — wraps all contract calls via `executeCalls`; returns parsed receipt events. **Primary write path.**
- `useAbyssGame.ts` — main game-state hook (Torii subscriptions + receipt-event parsing).
- `useGameSession.ts` / `usePracticeSession.ts` — live vs practice session state.
- `useController.ts` — Cartridge Controller account/connector access.
- `useCharmLoadout.ts` · `useChipPrice.ts` · `useAssetPreloader.ts` · `usePosthogPageviews.ts`.

### Contexts & providers (`client/src/context/`, `client/src/components/providers/`)
React contexts for the Torii client, bundles, and game state; `StarknetProvider.tsx` handles wallet connection via Cartridge Controller.

### Session purchase flow
User clicks buy → `openBundle()` on Cartridge Controller → Controller payment UI → on-chain `Setup.mint` → `PurchaseComponent.execute()` (revenue split + burn) → `Play.mint_session()`. The free-session path uses `claimFreeSessionBundle` with `socialClaimOptions`.

### Environment variables (client)
```
VITE_DEFAULT_CHAIN=mainnet|sepolia
VITE_TORII_URL=<torii endpoint>
VITE_STARKNET_RPC_URL=<rpc endpoint>
VITE_SESSION_BUNDLE_ID=<bundle id>
VITE_CONTROLLER_RPC_URL=<controller rpc>
```

## Deployment

Dojo profiles live in `dojo_<profile>.toml`. Migration order matters — contracts initialize sequentially per `order_inits`. Multicall is disabled on mainnet.

```bash
sozo build --profile mainnet
sozo migrate apply --profile mainnet
bash dojo/scripts/sync_manifest.sh mainnet       # sync manifest_mainnet.json
cp manifest_mainnet.json client/src/lib/manifest.json   # let the client pick up new addresses
```

## Cairo Development Notes

- After writing Cairo, run `scarb build` immediately to verify compilation.
- Revenue split: `burn_percentage + treasury_percentage + team_percentage + prize_percentage` must equal exactly **100**. Use `set_distribution()` to set all four atomically.
- `PurchaseComponent` transfers tokens from the **Setup contract's** balance (received from bundle payments), not from the user. Bundle `payment_receiver` must be the Setup contract address.
- VRF: spins use Cartridge VRF (`request_random` → callback via `SpinnableComponent`). The client prepends a `request_random` call to the `request_spin` multicall (see `requestSpin` in `actions.ts`).
- When you change any event struct, follow the [event-change checklist](#️-checklist--adding-or-changing-an-event) so the client decoder stays in sync.
