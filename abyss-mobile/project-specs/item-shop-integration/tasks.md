# Implementation Plan

## Phase 1: Contract Integration Layer

- [ ] 1. Extend contract integration utilities
  - Add ItemEffectType enum matching Cairo contract values (0-5)
  - Add ContractItem, SessionMarket, and PlayerItem TypeScript interfaces
  - Write typed wrappers for `get_session_market`, `get_session_items`, `get_item_info`, `buy_item_from_market`, `sell_item`, `refresh_market`, `get_session_inventory_count` using Aegis SDK
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [ ] 2. Add contract ABI for new methods
  - Update ABYSS_CONTRACT_ABI with item shop method signatures if not already present
  - Verify ABI includes all ItemEffectType enum values and struct definitions
  - _Requirements: 1.1_

## Phase 2: Item Effects Engine

- [ ] 3. Create item effects calculation module
  - [ ] 3.1 Implement core effect application functions
    - Write `applyItemEffects(baseConfig, ownedItems)` function that applies DirectScoreBonus, SymbolProbabilityBoost, and PatternMultiplierBoost
    - Implement probability normalization function to ensure symbols sum to 100%
    - Write `calculateBonusSpins(ownedItems)` for SpinBonus items
    - Write `calculateScoreMultiplier(ownedItems)` for ScoreMultiplier items
    - Write `calculateLevelProgressionBonus(ownedItems)` for LevelProgressionBonus items
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7_

  - [ ] 3.2 Add effect summary generation
    - Write `createEffectSummary(item)` helper to generate EffectSummary objects
    - Create AppliedEffects and EffectSummary TypeScript interfaces
    - Return both modified config and effect summaries from `applyItemEffects`
    - _Requirements: 7.1-7.7_

## Phase 3: Market Screen UI

- [ ] 4. Create market screen component
  - [ ] 4.1 Set up market screen structure
    - Create `app/market.tsx` with SafeAreaView, ImageBackground (bg-in-game.png), and basic layout
    - Add route to `app/_layout.tsx` Stack configuration
    - Implement useLocalSearchParams to get sessionId
    - Add loading state and ActivityIndicator
    - _Requirements: 2.1, 8.1_

  - [ ] 4.2 Implement market data fetching
    - Write `loadMarketData()` function that calls `getSessionMarket`, `getItemInfo` for each slot, `getSessionData` for balance, and `getSessionInventoryCount`
    - Store fetched data in component state (marketData, marketItems, balance, inventoryCount)
    - Call `loadMarketData()` in useEffect on mount
    - _Requirements: 1.2, 1.3, 2.6_

  - [ ] 4.3 Build market item cards UI
    - Create item card component with Image from `require('../assets/images/item${id}.png')`
    - Display item name, description, price, and effect type indicator
    - Render 6 cards in 3x2 grid layout using flexbox
    - _Requirements: 2.1, 2.2_

  - [ ] 4.4 Implement item ownership states
    - Fetch owned item IDs using `getSessionItems` and create Set for quick lookup
    - Apply grayed-out style and "OWNED" badge to owned items
    - Show "INVENTORY FULL" indicator when inventoryCount >= 6
    - Disable buy button with visual feedback when balance < item.price
    - _Requirements: 2.3, 2.4, 2.5_

  - [ ] 4.5 Add market header UI
    - Display balance with label "Balance: X points"
    - Display inventory count "Items: X/6"
    - Add "Refresh Market" button with cost display
    - Add back button with navigation to game screen
    - _Requirements: 2.6, 6.1_

- [ ] 5. Implement item purchase flow
  - [ ] 5.1 Create purchase confirmation modal
    - Show Alert.alert with item name, description, and cost when item card pressed
    - Add "Cancel" and "Buy" buttons
    - Pass marketSlot and item to buy handler on confirmation
    - _Requirements: 3.1_

  - [ ] 5.2 Implement buy transaction logic
    - Write `handleBuyItem(marketSlot, item)` that calls `buyItemFromMarket(sessionId, marketSlot)`
    - Update local state optimistically (deduct balance, increment inventory)
    - Call `loadMarketData()` on success to refresh UI
    - _Requirements: 3.2, 3.3, 3.7_

  - [ ] 5.3 Add purchase error handling
    - Catch contract errors and parse revert messages
    - Show specific error messages for "already owned", "Inventory full", "Insufficient" balance
    - Rollback optimistic updates on error
    - _Requirements: 3.4, 3.5, 3.6, 10.1, 10.4_

- [ ] 6. Implement market refresh functionality
  - Write `handleRefreshMarket()` that calls `refreshMarket(sessionId)`
  - Check balance against refresh cost before calling contract
  - Show loading state during refresh
  - Reload market data on success
  - Handle "Not enough balance" error specifically
  - _Requirements: 6.2, 6.3, 6.4, 6.5_

## Phase 4: Inventory Screen UI

- [ ] 7. Create inventory screen component
  - [ ] 7.1 Set up inventory screen structure
    - Create `app/inventory.tsx` with SafeAreaView, ImageBackground (bg-in-game.png), and basic layout
    - Add route to `app/_layout.tsx` Stack configuration
    - Implement useLocalSearchParams to get sessionId
    - Add loading state and ActivityIndicator
    - _Requirements: 4.1, 8.2_

  - [ ] 7.2 Implement inventory data fetching
    - Write `loadInventory()` function that calls `getSessionItems` and `getItemInfo` for each owned item
    - Fetch session balance using `getSessionData`
    - Store ownedItems and balance in state
    - Call `loadInventory()` in useEffect on mount
    - _Requirements: 1.4, 4.2_

  - [ ] 7.3 Build inventory item cards UI
    - Create item card component with Image from `require('../assets/images/item${id}.png')`
    - Display item name, description, effect details (effect_type, effect_value, target_symbol), and sell_price
    - Render cards in vertical ScrollView
    - Show "No items owned" message when ownedItems is empty
    - _Requirements: 4.1, 4.2, 4.3, 4.5_

  - [ ] 7.4 Add inventory header UI
    - Display balance with label "Balance: X points"
    - Display item count "Items: X/6"
    - Add back button with navigation to game screen
    - _Requirements: 4.4_

- [ ] 8. Implement item selling flow
  - [ ] 8.1 Create sell confirmation modal
    - Show Alert.alert with item name and sell_price when item card pressed
    - Add "Cancel" and "Sell" (destructive style) buttons
    - Pass item to sell handler on confirmation
    - _Requirements: 5.1_

  - [ ] 8.2 Implement sell transaction logic
    - Write `handleSellItem(item)` that calls `sellItem(sessionId, item.item_id, 1)`
    - Update local state optimistically (add sell_price to balance, remove from ownedItems)
    - Call `loadInventory()` on success to refresh UI
    - Show success message with sell_price amount
    - _Requirements: 5.2, 5.3_

  - [ ] 8.3 Add sell error handling
    - Catch contract errors and show generic error message with retry option
    - Rollback optimistic updates on error
    - _Requirements: 5.4, 10.1_

## Phase 5: Game Screen Integration

- [ ] 9. Add navigation buttons to game screen
  - [ ] 9.1 Create Market and Inventory navigation buttons
    - Add Pressable buttons with Ionicons (e.g., 'storefront' for Market, 'backpack' for Inventory)
    - Position buttons near existing UI elements (settings button area)
    - Navigate to market/inventory screens with sessionId param on press
    - _Requirements: 8.1, 8.2_

  - [ ] 9.2 Add active effects indicator
    - Display badge showing count of owned items when > 0
    - Position badge near inventory button
    - _Requirements: 9.4_

- [ ] 10. Integrate item effects into game logic
  - [ ] 10.1 Load inventory on game screen mount
    - Add ownedItems state to game screen
    - Write function to fetch `getSessionItems` and `getItemInfo` for each
    - Call fetch function in useEffect after sessionDataLoaded is true
    - _Requirements: 7.1-7.7_

  - [ ] 10.2 Apply item effects to game configuration
    - Import `applyItemEffects` from itemEffects.ts
    - Call `applyItemEffects(DEFAULT_GAME_CONFIG, ownedItems)` when inventory loads
    - Store AppliedEffects result in state
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

  - [ ] 10.3 Modify useGameLogic hook to accept dynamic config
    - Change useGameLogic signature to accept `gameConfig: GameConfig` parameter
    - Replace all uses of DEFAULT_GAME_CONFIG inside hook with gameConfig parameter
    - Pass modifiedConfig from appliedEffects to useGameLogic
    - _Requirements: 7.1-7.7_

  - [ ] 10.4 Apply score multiplier and bonus spins
    - Import `calculateScoreMultiplier` and `calculateBonusSpins`
    - Calculate and apply score multiplier when computing final scores in useGameLogic
    - Add bonus spins to initialSpins when initializing game state
    - _Requirements: 7.4, 7.5_

  - [ ] 10.5 Reload effects when returning from market/inventory
    - Add navigation focus listener to detect screen return
    - Reload inventory and reapply effects when screen gains focus
    - _Requirements: 8.3, 8.4_

## Phase 6: Visual Feedback and Polish

- [ ] 11. Add transaction animations
  - [ ] 11.1 Implement purchase success animation
    - Use react-native-reanimated to scale and fade out item card on purchase success
    - Animate balance countdown using Animated.timing
    - Show success checkmark animation overlay
    - _Requirements: 9.1, 9.5_

  - [ ] 11.2 Implement sell success animation
    - Slide out item card using react-native-reanimated on sell success
    - Animate balance count up using Animated.timing
    - Show coins/success animation
    - _Requirements: 9.2, 9.5_

  - [ ] 11.3 Add item card interaction feedback
    - Implement scale to 1.05 and shadow increase on press
    - Add 200ms ease-out transition
    - Use Pressable with style function for pressed state
    - _Requirements: 9.3_

- [ ] 12. Add error handling and edge cases
  - [ ] 12.1 Implement retry mechanism for network errors
    - Write `retryContractCall` utility with exponential backoff
    - Wrap all contract calls with retry logic (max 3 attempts)
    - Show "Retry" button in error alerts for transient failures
    - _Requirements: 10.1_

  - [ ] 12.2 Add session validity checks
    - Check if session.is_active before allowing market/inventory operations
    - Redirect to session selection screen if session is invalid/expired
    - _Requirements: 10.2_

  - [ ] 12.3 Implement debouncing for rapid clicks
    - Add disabled state to buy/sell/refresh buttons during transaction
    - Use debounce on button press handlers (300ms)
    - _Requirements: 10.4_

  - [ ] 12.4 Handle missing item images
    - Add try-catch around Image require() for dynamic item images
    - Provide fallback placeholder image if `item{id}.png` not found
    - Log warning for missing assets
    - _Requirements: 10.3_

  - [ ] 12.5 Add state resync on inconsistency
    - Implement check for state/contract mismatch on screen load
    - Automatically reload from contract if discrepancy detected
    - _Requirements: 10.5_
