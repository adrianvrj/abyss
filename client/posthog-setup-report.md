<wizard-report>
# PostHog post-wizard report

The wizard has completed a deep integration of PostHog analytics into the Abyss client (React + Vite). The following changes were made:

**New files:**
- `src/lib/posthog.ts` — PostHog singleton. Reads `VITE_POSTHOG_KEY` and `VITE_POSTHOG_HOST` from environment variables and initializes posthog-js with autocapture, pageview/pageleave tracking, and exception autocapture.
- `.env` — Created with `VITE_POSTHOG_KEY` and `VITE_POSTHOG_HOST` (gitignore covered).

**Modified files:**
- `src/main.tsx` — Calls `initPostHog()` before the React app renders.
- `src/hooks/actions.ts` — Added `posthog.capture()` calls after each on-chain action succeeds, and `posthog.captureException()` in error paths.
- `src/components/MenuContent.tsx` — Captures `wallet_connected`, `wallet_disconnected`, and `practice_started` events. Calls `posthog.identify()` with the wallet address and Cartridge username when the user is connected. Calls `posthog.reset()` on logout.
- `src/components/modals/MarketModal.tsx` — Captures `item_purchased` (with item name, id, price, slot) and `market_refreshed` (with refresh cost and count) events.

## Tracked events

| Event | Description | File |
|---|---|---|
| `wallet_connected` | User successfully connects their Starknet wallet via Cartridge Controller | `src/components/MenuContent.tsx` |
| `wallet_disconnected` | User disconnects their wallet from the app | `src/components/MenuContent.tsx` |
| `session_created` | User pays entry fee and starts a new competitive game session on-chain | `src/hooks/actions.ts` |
| `free_session_claimed` | User claims a free session via social share bundle through Cartridge Controller | `src/hooks/actions.ts` |
| `spin_requested` | Player submits a spin transaction during an active session | `src/hooks/actions.ts` |
| `session_ended` | Player manually ends their session | `src/hooks/actions.ts` |
| `chips_claimed` | Player claims CHIP token earnings from a completed session | `src/hooks/actions.ts` |
| `item_purchased` | Player buys an item from the in-game market during a session | `src/components/modals/MarketModal.tsx` |
| `market_refreshed` | Player spends points to refresh the available market items | `src/components/modals/MarketModal.tsx` |
| `item_sold` | Player sells an item from their inventory back to the market | `src/hooks/actions.ts` |
| `relic_equipped` | Player equips a relic NFT to their active session | `src/hooks/actions.ts` |
| `relic_activated` | Player activates their equipped relic's special ability mid-session | `src/hooks/actions.ts` |
| `charm_rerolled` | Player burns 3 charms and pays tokens to reroll for new ones | `src/hooks/actions.ts` |
| `streak_loot_claimed` | Player claims their daily streak reward loot | `src/hooks/actions.ts` |
| `practice_started` | Player enters practice mode (free, off-chain simulation) | `src/components/MenuContent.tsx` |

## Next steps

We've built some insights and a dashboard for you to keep an eye on user behavior, based on the events we just instrumented:

- [Analytics basics dashboard](/dashboard/1571399)
- [Player Conversion Funnel](/insights/UKBhsZju) — wallet_connected → session_created → spin_requested → chips_claimed
- [Daily Active Players](/insights/6GaRhHHN) — unique players spinning per day
- [Sessions Created Over Time](/insights/cgQYvCTi) — paid and free sessions per day
- [In-Game Economy Activity](/insights/HIEivtQO) — items purchased, sold, and market refreshes
- [Streak & Relic Engagement](/insights/i9mZR3dy) — daily streak claims and relic activations (retention signal)

### Agent skill

We've left an agent skill folder in your project. You can use this context for further agent development when using Claude Code. This will help ensure the model provides the most up-to-date approaches for integrating PostHog.

</wizard-report>
